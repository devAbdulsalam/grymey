import Escrow from '../models/Escrow.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class EscrowService {
	constructor() {
		this.locks = new Map(); // In-memory locks for race condition prevention
	}

	async createEscrow(userId, escrowData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Verify sender has sufficient balance
			const senderWallet = await Wallet.findOne({ userId }).session(session);
			if (!senderWallet) {
				throw new Error('Sender wallet not found');
			}
			if (senderWallet.balance < escrowData.amount) {
				throw new Error('Insufficient balance');
			}
			// Get receiver wallet (create if doesn't exist)
			let receiverWallet = await Wallet.findOne({
				userId: escrowData.receiverId,
			}).session(session);
			if (!receiverWallet) {
				throw new Error('Receiver wallet not found');
			}

			// Create escrow record
			const reference = generateReference('ESC');
			const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

			const escrow = new Escrow({
				senderId: userId,
				...escrowData,
				reference,
				expiresAt,
				status: 'pending',
			});

			await escrow.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: escrowData.receiverId,
				amount: escrowData.amount,
				type: 'escrow',
				status: 'pending',
				reference,
				metadata: {
					escrowId: escrow._id,
					description: escrowData.description,
				},
			});

			await transaction.save({ session });
			// Deduct from sender's wallet
			senderWallet.balance -= escrowData.amount;
			senderWallet.ledger.push({
				transactionId: transaction._id,
				amount: -escrowData.amount,
				balanceBefore: senderWallet.balance + escrowData.amount,
				balanceAfter: senderWallet.balance,
				type: 'debit',
			});
			await senderWallet.save({ session });

			escrow.transactionId = transaction._id;
			await escrow.save({ session });

			await senderWallet.save({ session });

			await session.commitTransaction();

			return escrow;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating escrow for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async releaseEscrow(escrowId, userId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(escrowId);

			const escrow = await Escrow.findById(escrowId).session(session);
			if (!escrow) {
				throw new Error('Escrow not found');
			}

			// Verify user is either sender or receiver
			if (
				![escrow.senderId.toString(), escrow.receiverId.toString()].includes(
					userId.toString()
				)
			) {
				throw new Error('Unauthorized to release this escrow');
			}

			if (escrow.status !== 'pending') {
				throw new Error(`Escrow is already ${escrow.status}`);
			}

			// console.log('escrow transactionId', escrow.transactionId);
			// Get receiver wallet (create if doesn't exist)
			let receiverWallet = await Wallet.findOne({
				userId: escrow.receiverId,
			}).session(session);
			if (!receiverWallet) {
				throw new Error('Receiver wallet not found!');
			}
			// console.log(receiverWallet);
			// Credit receiver's wallet
			receiverWallet.balance += escrow.amount;
			receiverWallet.ledger.push({
				transactionId: escrow.transactionId,
				amount: escrow.amount,
				balanceBefore: receiverWallet.balance - escrow.amount,
				balanceAfter: receiverWallet.balance,
				type: 'credit',
			});
			await receiverWallet.save({ session });

			// Update escrow status
			escrow.status = 'completed';
			escrow.completedAt = new Date();
			await escrow.save({ session });

			// Update transaction status
			const transaction = await Transaction.findById(
				escrow.transactionId
			).session(session);
			if (transaction) {
				transaction.receiverId = escrow.receiverId;
				transaction.status = 'completed';
				transaction.completedAt = new Date();
				await transaction.save({ session });
			}

			await session.commitTransaction();

			return escrow;
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error releasing escrow ${escrowId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(escrowId);
		}
	}

	async getEscrow(escrowId) {
		try {
			const escrow = await Escrow.findById(escrowId);
			if (!escrow) {
				throw new Error('Escrow not found');
			}
			// console.log(escrow);
			return escrow?._doc;
		} catch (error) {
			logger.error(
				`Error getting escrow with id ${escrowId}: ${error.message}`
			);
			throw error;
		}
	}
	async raiseDispute(escrowId, userId, reason) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(escrowId);

			const escrow = await Escrow.findById(escrowId).session(session);
			if (!escrow) {
				throw new Error('Escrow not found');
			}

			// Verify user is either sender or receiver
			if (
				![escrow.senderId.toString(), escrow.receiverId.toString()].includes(
					userId.toString()
				)
			) {
				throw new Error('Unauthorized to dispute this escrow');
			}

			if (escrow.status !== 'pending') {
				throw new Error(`Cannot dispute escrow in ${escrow.status} status`);
			}

			// Update escrow with dispute info
			escrow.status = 'disputed';
			escrow.dispute = {
				raisedBy: userId,
				reason,
				status: 'open',
			};
			await escrow.save({ session });

			await session.commitTransaction();

			return escrow;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error raising dispute for escrow ${escrowId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(escrowId);
		}
	}

	async getUserEscrows(userId, { page = 1, limit = 10, status }) {
		try {
			const query = {
				$or: [{ senderId: userId }, { receiverId: userId }],
				...(status && { status }),
			};

			const skip = (page - 1) * limit;

			const [payments, total] = await Promise.all([
				Escrow.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate('senderId', 'name email')
					.populate('receiverId', 'name email')
					.lean(),
				Escrow.countDocuments(query),
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
	async getEscrows({ page = 1, limit = 10, status }) {
		try {
			const query = {
				...(status && { status }),
			};

			const skip = (page - 1) * limit;

			const [payments, total] = await Promise.all([
				Escrow.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate('senderId', 'name email')
					.populate('receiverId', 'name email')
					.lean(),
				Escrow.countDocuments(query),
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
			logger.error(`Error getting split escrows: ${error.message}`);
			throw new Error('Failed to retrieve split escrows');
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

		throw new Error('Could not acquire lock for escrow operation');
	}

	releaseLock(resourceId) {
		this.locks.delete(resourceId);
	}
}

export default new EscrowService();
