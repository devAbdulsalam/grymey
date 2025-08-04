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

			// Deduct from sender's wallet
			senderWallet.balance -= escrowData.amount;
			senderWallet.ledger.push({
				transactionId: null, // Will be updated after transaction creation
				amount: -escrowData.amount,
				balanceBefore: senderWallet.balance + escrowData.amount,
				balanceAfter: senderWallet.balance,
				type: 'debit',
			});
			await senderWallet.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: null, // Held in escrow
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

			// Update escrow with transaction ID
			escrow.transactionId = transaction._id;
			await escrow.save({ session });

			// Update wallet ledger with transaction ID
			senderWallet.ledger[senderWallet.ledger.length - 1].transactionId =
				transaction._id;
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

			// Get receiver wallet (create if doesn't exist)
			let receiverWallet = await Wallet.findOne({
				userId: escrow.receiverId,
			}).session(session);
			if (!receiverWallet) {
				receiverWallet = new Wallet({ userId: escrow.receiverId });
				await receiverWallet.save({ session });
			}

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

			const options = {
				page,
				limit,
				sort: { createdAt: -1 },
				populate: [
					{ path: 'senderId', select: 'name email' },
					{ path: 'receiverId', select: 'name email' },
				],
			};

			const result = await Escrow.paginate(query, options);
			return result;
		} catch (error) {
			logger.error(
				`Error getting escrows for user ${userId}: ${error.message}`
			);
			throw error;
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
