import GrymeyCircle from '../models/GrymeyCircle.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class GrymeyCircleService {
	constructor() {
		this.locks = new Map(); // In-memory locks for race condition prevention
	}

	async createCircle(userId, circleData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const circle = new GrymeyCircle({
				creatorId: userId,
				...circleData,
				members: [
					{
						userId,
						role: 'admin',
						status: 'active',
					},
				],
			});

			await circle.save({ session });

			await session.commitTransaction();

			return circle;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating circle for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getUserCircles(userId) {
		try {
			const circles = await GrymeyCircle.find({
				'members.userId': userId,
				status: 'active',
			})
				.populate('creatorId', 'name email')
				.populate('members.userId', 'name email')
				.sort({ createdAt: -1 });

			return circles;
		} catch (error) {
			logger.error(
				`Error getting circles for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}
	async getCircle(circleId) {
		try {
			const circle = await GrymeyCircle.findById(circleId)
				.populate('creatorId', 'name email')
				.populate('members.userId', 'name email')
				.sort({ createdAt: -1 });

			return circle._doc;
		} catch (error) {
			logger.error(`Error getting circle by id ${circleId}: ${error.message}`);
			throw error;
		}
	}

	async inviteToCircle(circleId, inviterId, userId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Verify inviter is a member
			const inviter = circle.members.find(
				(m) => m.userId.toString() === inviterId.toString()
			);
			if (!inviter) {
				throw new Error('Only members can invite others');
			}

			// Check if user is already a member
			const existingMember = circle.members.find(
				(m) => m.userId.toString() === userId.toString()
			);
			if (existingMember) {
				throw new Error('User is already a member of this circle');
			}

			// Add new member
			circle.members.push({
				userId,
				role: 'member',
				status: 'pending',
			});

			await circle.save({ session });

			await session.commitTransaction();

			// In a real app, you would send an invitation notification here
			return circle;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error inviting user ${userId} to circle ${circleId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
		}
	}

	async contributeToCircle(circleId, userId, amount) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);
			await this.acquireLock(userId);

			// Verify user has sufficient balance
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			if (wallet.balance < amount) {
				throw new Error('Insufficient balance');
			}

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Verify user is an active member
			const member = circle.members.find(
				(m) =>
					m.userId.toString() === userId.toString() && m.status === 'active'
			);
			if (!member) {
				throw new Error('User is not an active member of this circle');
			}
			const admin = circle.members.find((m) => m.role === 'admin');

			if (circle.isLocked) {
				throw new Error('Circle is currently locked');
			}

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: admin.userId, // Circle contribution
				amount,
				type: 'circle_contribution',
				status: 'completed',
				reference: generateReference('CCB'),
				metadata: {
					circleId: circle._id,
					circleName: circle.name,
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Deduct from user's wallet
			wallet.balance -= amount;
			wallet.ledger.push({
				transactionId: transaction._id, // Will be updated after transaction creation
				amount: -amount,
				balanceBefore: wallet.balance + amount,
				balanceAfter: wallet.balance,
				type: 'debit',
			});
			await wallet.save({ session });

			// Update circle
			circle.totalBalance += amount;
			circle.contributions.push({
				userId,
				amount,
				transactionId: transaction._id,
			});
			await circle.save({ session });

			await session.commitTransaction();

			return { circle, transaction };
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error contributing to circle ${circleId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
			this.releaseLock(userId);
		}
	}

	async withdrawFromCircle(circleId, userId, { amount, reason }) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);
			await this.acquireLock(userId);

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Verify user is an active member
			const member = circle.members.find(
				(m) =>
					m.userId.toString() === userId.toString() && m.status === 'active'
			);
			if (!member) {
				throw new Error('User is not an active member of this circle');
			}
			const admin = circle.members.find((m) => m.role === 'admin');
			if (circle.totalBalance < amount) {
				throw new Error('Insufficient funds in circle');
			}

			// Check withdrawal rules
			if (circle.withdrawalRules.requiresApproval) {
				// Create withdrawal request
				circle.withdrawals.push({
					userId,
					amount,
					reason,
					status: 'pending',
				});

				await circle.save({ session });
				await session.commitTransaction();

				// In a real app, you would notify admins here
				return {
					circle,
					requiresApproval: true,
					message: 'Withdrawal request submitted for approval',
				};
			}

			// If no approval needed, process immediately
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}

			// Create transaction record
			const transaction = new Transaction({
				senderId: admin.userId, // From circle
				receiverId: userId,
				amount,
				type: 'circle_withdrawal',
				status: 'completed',
				reference: generateReference('CWD'),
				metadata: {
					circleId: circle._id,
					circleName: circle.name,
					reason,
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Credit user's wallet
			wallet.balance += amount;
			wallet.ledger.push({
				transactionId: transaction._id,
				amount,
				balanceBefore: wallet.balance - amount,
				balanceAfter: wallet.balance,
				type: 'credit',
			});
			await wallet.save({ session });

			// Update circle
			circle.totalBalance -= amount;
			circle.withdrawals.push({
				userId,
				amount,
				reason,
				status: 'approved',
				transactionId: transaction._id,
				approvedBy: userId, // Self-approved
				processedAt: new Date(),
			});
			await circle.save({ session });

			await session.commitTransaction();

			return {
				circle,
				transaction,
				requiresApproval: false,
				message: 'Withdrawal processed successfully',
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error withdrawing from circle ${circleId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
			this.releaseLock(userId);
		}
	}
	async approveWithdrawal(circleId, userId, { amount, reason }) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);
			await this.acquireLock(userId);

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Verify user is an active member
			const member = circle.members.find(
				(m) =>
					m.userId.toString() === userId.toString() && m.status === 'active'
			);
			if (!member) {
				throw new Error('User is not an active member of this circle');
			}
			const admin = circle.members.find((m) => m.role === 'admin');
			if (circle.totalBalance < amount) {
				throw new Error('Insufficient funds in circle');
			}

			// Check withdrawal rules
			if (circle.withdrawalRules.requiresApproval) {
				// Create withdrawal request
				circle.withdrawals.push({
					userId,
					amount,
					reason,
					status: 'pending',
				});

				await circle.save({ session });
				await session.commitTransaction();

				// In a real app, you would notify admins here
				return {
					circle,
					requiresApproval: true,
					message: 'Withdrawal request submitted for approval',
				};
			}

			// If no approval needed, process immediately
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}

			// Create transaction record
			const transaction = new Transaction({
				senderId: admin.userId, // From circle
				receiverId: userId,
				amount,
				type: 'circle_withdrawal',
				status: 'completed',
				reference: generateReference('CWD'),
				metadata: {
					circleId: circle._id,
					circleName: circle.name,
					reason,
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Credit user's wallet
			wallet.balance += amount;
			wallet.ledger.push({
				transactionId: transaction._id,
				amount,
				balanceBefore: wallet.balance - amount,
				balanceAfter: wallet.balance,
				type: 'credit',
			});
			await wallet.save({ session });

			// Update circle
			circle.totalBalance -= amount;
			circle.withdrawals.push({
				userId,
				amount,
				reason,
				status: 'approved',
				transactionId: transaction._id,
				approvedBy: userId, // Self-approved
				processedAt: new Date(),
			});
			await circle.save({ session });

			await session.commitTransaction();

			return {
				circle,
				transaction,
				requiresApproval: false,
				message: 'Withdrawal processed successfully',
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error withdrawing from circle ${circleId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
			this.releaseLock(userId);
		}
	}

	async getCircles({ page = 1, limit = 10, status }) {
		try {
			const query = {
				...(status && { status }),
			};

			const skip = (page - 1) * limit;

			const [payments, total] = await Promise.all([
				GrymeyCircle.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate('creatorId', 'name email')
					.populate('members.userId', 'name email')
					.lean(),
				GrymeyCircle.countDocuments(query),
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
			logger.error(`Error getting all cycles: ${error.message}`);
			throw new Error('Failed to retrieve all cycles');
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

		throw new Error('Could not acquire lock for circle operation');
	}

	releaseLock(resourceId) {
		this.locks.delete(resourceId);
	}
}

export default new GrymeyCircleService();
