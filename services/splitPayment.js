import SplitPayment from '../models/SplitPayment.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class SplitPaymentService {
	constructor() {
		this.locks = new Map(); // In-memory locks for race condition prevention
	}

	async createSplitPayment(userId, splitData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Validate recipients and calculate total amount
			const totalAmount = splitData.recipients.reduce((sum, recipient) => {
				if (recipient.amount) return sum + recipient.amount;
				if (recipient.percentage) return sum; // Will calculate later
				throw new Error('Recipient must have either amount or percentage');
			}, 0);

			// If percentages are used, calculate amounts based on total
			if (splitData.recipients.some((r) => r.percentage)) {
				const percentageSum = splitData.recipients.reduce(
					(sum, r) => sum + (r.percentage || 0),
					0
				);

				if (percentageSum !== 100) {
					throw new Error('Total percentage must equal 100');
				}

				splitData.recipients.forEach((recipient) => {
					if (recipient.percentage) {
						recipient.amount = totalAmount * (recipient.percentage / 100);
					}
				});
			}

			const reference = generateReference('SPL');

			const splitPayment = new SplitPayment({
				creatorId: userId,
				title: splitData.title,
				description: splitData.description,
				totalAmount,
				recipients: splitData.recipients,
				reference,
				isEscrow: splitData.isEscrow || false,
				escrowConditions: splitData.escrowConditions,
			});

			await splitPayment.save({ session });

			await session.commitTransaction();

			return splitPayment;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating split payment for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getSplitPayment(id) {
		try {
			const splitPayment = await SplitPayment.findById(id)
				.populate('creatorId', 'name email')
				.populate('payerId', 'name email')
				.populate('recipients.userId', 'name email');

			if (!splitPayment) {
				throw new Error('Split payment not found');
			}

			return splitPayment;
		} catch (error) {
			logger.error(`Error getting split payment ${id}: ${error.message}`);
			throw error;
		}
	}

	async processSplitPayment(splitPaymentId, payerId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire lock for this split payment
			await this.acquireLock(splitPaymentId);

			const splitPayment = await SplitPayment.findById(splitPaymentId).session(
				session
			);
			if (!splitPayment) {
				throw new Error('Split payment not found');
			}

			if (splitPayment.status !== 'pending') {
				throw new Error(`Split payment is already ${splitPayment.status}`);
			}

			// Verify payer has sufficient balance
			const payerWallet = await Wallet.findOne({ userId: payerId }).session(
				session
			);
			if (!payerWallet) {
				throw new Error('Payer wallet not found');
			}
			if (payerWallet.balance < splitPayment.totalAmount) {
				throw new Error('Insufficient balance');
			}

			// Update split payment status
			splitPayment.payerId = payerId;
			splitPayment.status = 'processing';
			await splitPayment.save({ session });

			// Process payments to each recipient
			const paymentPromises = splitPayment.recipients.map(async (recipient) => {
				// Get recipient wallet (create if doesn't exist)
				let recipientWallet = await Wallet.findOne({
					userId: recipient.userId,
				}).session(session);
				if (!recipientWallet) {
					recipientWallet = new Wallet({ userId: recipient.userId });
					await recipientWallet.save({ session });
				}

				// Create transaction record
				const transaction = new Transaction({
					senderId: payerId,
					receiverId: recipient.userId,
					amount: recipient.amount,
					type: 'split_payment',
					status: 'pending',
					reference: generateReference('SPT'),
					metadata: {
						splitPaymentId: splitPayment._id,
						splitPaymentReference: splitPayment.reference,
					},
				});

				await transaction.save({ session });

				// Update recipient in split payment
				recipient.transactionId = transaction._id;
				recipient.isPaid = true;

				// Update wallets
				payerWallet.balance -= recipient.amount;
				payerWallet.ledger.push({
					transactionId: transaction._id,
					amount: -recipient.amount,
					balanceBefore: payerWallet.balance + recipient.amount,
					balanceAfter: payerWallet.balance,
					type: 'debit',
				});

				recipientWallet.balance += recipient.amount;
				recipientWallet.ledger.push({
					transactionId: transaction._id,
					amount: recipient.amount,
					balanceBefore: recipientWallet.balance,
					balanceAfter: recipientWallet.balance + recipient.amount,
					type: 'credit',
				});

				await Promise.all([
					payerWallet.save({ session }),
					recipientWallet.save({ session }),
				]);

				// Update transaction status
				transaction.status = 'completed';
				transaction.completedAt = new Date();
				await transaction.save({ session });

				return transaction;
			});

			await Promise.all(paymentPromises);

			// Finalize split payment
			splitPayment.status = 'completed';
			splitPayment.completedAt = new Date();
			await splitPayment.save({ session });

			await session.commitTransaction();

			return splitPayment;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error processing split payment ${splitPaymentId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(splitPaymentId);
		}
	}

	async getUserSplitPayments(userId, { page = 1, limit = 10, status }) {
		try {
			const query = {
				$or: [{ creatorId: userId }, { payerId: userId }],
				...(status && { status }),
			};

			const skip = (page - 1) * limit;

			const [payments, total] = await Promise.all([
				SplitPayment.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate('creatorId', 'name email')
					.populate('payerId', 'name email')
					.populate('recipients.userId', 'name email')
					.lean(),
				SplitPayment.countDocuments(query),
			]);

			return {
				data: payments,
				pagination: {
					total,
					limit,
					page,
					pages: Math.ceil(total / limit),
					hasNext: page * limit < total,
					hasPrev: page > 1,
				},
			};
		} catch (error) {
			logger.error(
				`Error getting split payments for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}
	async getSplitPayments({ page = 1, limit = 10, status }) {
		try {
			const query = {
				...(status && { status }),
			};
	
			
			const skip = (page - 1) * limit;

			const [payments, total] = await Promise.all([
				SplitPayment.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate('creatorId', 'name email')
					.populate('payerId', 'name email')
					.populate('recipients.userId', 'name email')
					.lean(),
				SplitPayment.countDocuments(query),
			]);

			return {
				data: payments,
				pagination: {
					total,
					limit,
					page,
					pages: Math.ceil(total / limit),
					hasNext: page * limit < total,
					hasPrev: page > 1,
				},
			};
		} catch (error) {
			logger.error(`Error getting split payments: ${error.message}`);
			throw new Error('Failed to retrieve split payments');
		}
	}


	async acquireLock(resourceId) {
		const MAX_RETRIES = 5;
		const RETRY_DELAY = 100; // ms

		for (let i = 0; i < MAX_RETRIES; i++) {
			if (!this.locks.has(resourceId)) {
				this.locks.set(resourceId, true);
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
		}

		throw new Error('Could not acquire lock for split payment operation');
	}

	releaseLock(resourceId) {
		this.locks.delete(resourceId);
	}
}

export default new SplitPaymentService();
