import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class WalletService {
	constructor() {
		this.locks = new Map(); // In-memory locks to prevent race conditions
	}

	async getWalletByPhone(phone) {
		try {
			const user = await User.findOne({ phone });
			if (!user) {
				throw new Error('User not found');
			}
			const wallet = await Wallet.findOne({ userId: user._id });
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			return wallet;
		} catch (error) {
			logger.error(`Error getting wallet for user with phone ${phone}: ${error.message}`);
			throw error;
		}
	}
	async getWallet(userId, isGhost = false) {
		try {
			const wallet = await Wallet.findOne({ userId, isGhost });
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			return wallet;
		} catch (error) {
			logger.error(`Error getting wallet for user ${userId}: ${error.message}`);
			throw error;
		}
	}

	async fundWallet(userId, amount, isGhost = false) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire lock for this user's wallet
			await this.acquireLock(userId);

			const isWallet = await Wallet.findOne({ userId, isGhost }).session(
				session
			);
			// console.log('amount', amount);
			// console.log(isWallet.balance);
			const wallet = await Wallet.findOneAndUpdate(
				{ userId, isGhost },
				{
					$inc: { balance: amount },
					$push: {
						ledger: {
							transactionId: null, // Will be updated after transaction creation
							amount,
							balanceBefore: isWallet.balance,
							balanceAfter: isWallet.balance + amount,
							type: 'credit',
						},
					},
				},
				{ new: true, session }
			);

			if (!wallet) {
				throw new Error('Wallet not found');
			}

			// Create transaction record
			const transaction = new Transaction({
				receiverId: userId,
				amount,
				type: 'deposit',
				status: 'completed',
				reference: generateReference('DEP'),
				isGhost,
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Update ledger entry with transaction ID
			wallet.ledger[wallet.ledger.length - 1].transactionId = transaction._id;
			await wallet.save({ session });

			await session.commitTransaction();

			return { wallet, transaction };
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error funding wallet for user ${userId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(userId);
		}
	}

	async transferFunds(senderId, receiverId, amount, isGhost = false) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire locks for both wallets to prevent race conditions
			await this.acquireLock(senderId);
			await this.acquireLock(receiverId);

			// Verify sender has sufficient balance
			const senderWallet = await Wallet.findOne({
				userId: senderId,
				isGhost,
			}).session(session);
			if (!senderWallet) {
				throw new Error('Sender wallet not found');
			}
			if (senderWallet.balance < amount) {
				throw new Error('Insufficient balance');
			}

			// Get receiver wallet
			let receiverWallet = await Wallet.findOne({
				_id: receiverId,
				isGhost,
			}).session(session);
			if (!receiverWallet) {
				// receiverWallet = new Wallet({ userId: receiverId, isGhost });
				// await receiverWallet.save({ session });
				throw new Error('Receiver wallet not found');
			}

			// Create transaction record
			const transaction = new Transaction({
				senderId,
				receiverId,
				amount,
				type: 'transfer',
				status: 'pending',
				reference: generateReference('TRF'),
				isGhost,
			});

			await transaction.save({ session });

			// Update sender wallet
			senderWallet.balance -= amount;
			senderWallet.ledger.push({
				transactionId: transaction._id,
				amount: -amount,
				balanceBefore: senderWallet.balance + amount,
				balanceAfter: senderWallet.balance,
				type: 'debit',
			});
			await senderWallet.save({ session });

			// Update receiver wallet
			receiverWallet.balance += amount;
			receiverWallet.ledger.push({
				transactionId: transaction._id,
				amount,
				balanceBefore: receiverWallet.balance,
				balanceAfter: receiverWallet.balance + amount,
				type: 'credit',
			});
			await receiverWallet.save({ session });

			// Update transaction status
			transaction.status = 'completed';
			transaction.completedAt = new Date();
			await transaction.save({ session });

			await session.commitTransaction();

			return { transaction, senderWallet, receiverWallet };
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error transferring funds from ${senderId} to ${receiverId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(senderId);
			this.releaseLock(receiverId);
		}
	}

	async acquireLock(userId) {
		const MAX_RETRIES = 3;
		const RETRY_DELAY = 100; // ms

		for (let i = 0; i < MAX_RETRIES; i++) {
			if (!this.locks.has(userId)) {
				this.locks.set(userId, true);
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
		}

		throw new Error('Could not acquire lock for wallet operation');
	}

	releaseLock(userId) {
		this.locks.delete(userId);
	}
}

export default new WalletService();
