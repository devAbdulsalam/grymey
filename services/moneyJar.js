import MoneyJar from '../models/MoneyJar.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class MoneyJarService {
	constructor() {
		this.locks = new Map(); // In-memory locks for race condition prevention
	}

	async createMoneyJar(userId, jarData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Check if user is Pro to determine penalty rate
			const user = await User.findById(userId).session(session);
			const penaltyRate = user?.isPro ? 0 : 0.05; // 5% penalty for non-Pro users

			const moneyJar = new MoneyJar({
				userId,
				...jarData,
				penaltyRate,
			});

			await moneyJar.save({ session });

			await session.commitTransaction();

			return moneyJar;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating money jar for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getMoneyJars(userId) {
		try {
			const moneyJars = await MoneyJar.find({ userId }).sort({ createdAt: -1 });

			return moneyJars;
		} catch (error) {
			logger.error(
				`Error getting money jars for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}

	async fundMoneyJar(jarId, userId, amount) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire locks to prevent race conditions
			await this.acquireLock(jarId);
			await this.acquireLock(userId);

			// Verify user has sufficient balance
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			if (wallet.balance < amount) {
				throw new Error('Insufficient balance');
			}

			const moneyJar = await MoneyJar.findById(jarId).session(session);
			if (!moneyJar) {
				throw new Error('Money jar not found');
			}
			if (moneyJar.isLocked) {
				throw new Error('Cannot fund a locked money jar');
			}

			// Update wallet
			wallet.balance -= amount;
			wallet.ledger.push({
				transactionId: null, // Will be updated after transaction creation
				amount: -amount,
				balanceBefore: wallet.balance + amount,
				balanceAfter: wallet.balance,
				type: 'debit',
			});
			await wallet.save({ session });

			// Update money jar
			moneyJar.currentAmount += amount;
			await moneyJar.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: userId, // Self-transfer
				amount,
				type: 'jar_funding',
				status: 'completed',
				reference: generateReference('JFD'),
				metadata: {
					jarId: moneyJar._id,
					jarName: moneyJar.name,
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Update wallet ledger with transaction ID
			wallet.ledger[wallet.ledger.length - 1].transactionId = transaction._id;
			await wallet.save({ session });

			await session.commitTransaction();

			return { moneyJar, transaction };
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error funding money jar ${jarId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(jarId);
			this.releaseLock(userId);
		}
	}

	async withdrawFromMoneyJar(jarId, userId, amount) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire locks to prevent race conditions
			await this.acquireLock(jarId);
			await this.acquireLock(userId);

			const moneyJar = await MoneyJar.findById(jarId).session(session);
			if (!moneyJar) {
				throw new Error('Money jar not found');
			}
			if (moneyJar.currentAmount < amount) {
				throw new Error('Insufficient funds in money jar');
			}

			// Check if jar is locked and user is Pro
			const user = await User.findById(userId).session(session);
			if (moneyJar.isLocked && !user?.isPro) {
				throw new Error('Cannot withdraw from locked jar without Pro tier');
			}

			// Calculate penalty if applicable
			let penaltyAmount = 0;
			if (moneyJar.isLocked && moneyJar.penaltyRate > 0) {
				penaltyAmount = amount * moneyJar.penaltyRate;
			}

			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}

			// Update money jar
			moneyJar.currentAmount -= amount;
			await moneyJar.save({ session });

			// Update wallet (amount after penalty)
			const amountAfterPenalty = amount - penaltyAmount;
			wallet.balance += amountAfterPenalty;
			wallet.ledger.push({
				transactionId: null, // Will be updated after transaction creation
				amount: amountAfterPenalty,
				balanceBefore: wallet.balance - amountAfterPenalty,
				balanceAfter: wallet.balance,
				type: 'credit',
			});
			await wallet.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId, // Self-transfer
				receiverId: userId,
				amount: amountAfterPenalty,
				type: 'jar_withdrawal',
				status: 'completed',
				reference: generateReference('JWD'),
				metadata: {
					jarId: moneyJar._id,
					jarName: moneyJar.name,
					originalAmount: amount,
					penaltyAmount,
					penaltyRate: moneyJar.penaltyRate,
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Update wallet ledger with transaction ID
			wallet.ledger[wallet.ledger.length - 1].transactionId = transaction._id;
			await wallet.save({ session });

			// If there was a penalty, create a separate transaction record
			if (penaltyAmount > 0) {
				const penaltyTransaction = new Transaction({
					senderId: userId,
					receiverId: null, // System collects penalty
					amount: penaltyAmount,
					type: 'penalty',
					status: 'completed',
					reference: generateReference('PNT'),
					metadata: {
						jarId: moneyJar._id,
						jarName: moneyJar.name,
						withdrawalAmount: amount,
					},
					completedAt: new Date(),
				});

				await penaltyTransaction.save({ session });
			}

			await session.commitTransaction();

			return { moneyJar, transaction, penaltyAmount };
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error withdrawing from money jar ${jarId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(jarId);
			this.releaseLock(userId);
		}
	}

	async lockMoneyJar(jarId, userId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(jarId);

			const moneyJar = await MoneyJar.findById(jarId).session(session);
			if (!moneyJar) {
				throw new Error('Money jar not found');
			}
			if (moneyJar.userId.toString() !== userId.toString()) {
				throw new Error('Unauthorized to lock this money jar');
			}
			if (moneyJar.isLocked) {
				throw new Error('Money jar is already locked');
			}

			moneyJar.isLocked = true;
			moneyJar.lockedAt = new Date();
			await moneyJar.save({ session });

			await session.commitTransaction();

			return moneyJar;
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error locking money jar ${jarId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(jarId);
		}
	}

	async unlockMoneyJar(jarId, userId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(jarId);

			const moneyJar = await MoneyJar.findById(jarId).session(session);
			if (!moneyJar) {
				throw new Error('Money jar not found');
			}
			if (moneyJar.userId.toString() !== userId.toString()) {
				throw new Error('Unauthorized to unlock this money jar');
			}
			if (!moneyJar.isLocked) {
				throw new Error('Money jar is not locked');
			}

			// Verify user is Pro
			const user = await User.findById(userId).session(session);
			if (!user?.isPro) {
				throw new Error('Pro tier required to unlock money jars');
			}

			moneyJar.isLocked = false;
			moneyJar.lockedAt = null;
			await moneyJar.save({ session });

			await session.commitTransaction();

			return moneyJar;
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error unlocking money jar ${jarId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(jarId);
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

		throw new Error('Could not acquire lock for money jar operation');
	}

	releaseLock(resourceId) {
		this.locks.delete(resourceId);
	}
}

export default new MoneyJarService();
