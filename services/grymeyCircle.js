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

	async updateCircle(circleId, updateData) {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			await this.acquireLock(circleId);
			const circle = await GrymeyCircle.findById(circleId);
			if (!circle) {
				throw new Error('Circle not found');
			}
			Object.assign(circle, updateData, { updatedAt: new Date() });
			await circle.save({ session });
			await session.commitTransaction();
			const updatedCircle = await GrymeyCircle.findById(circleId);
			return updatedCircle;
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error updating circles: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
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
	async approveWithdrawal(circleId, withdrawalId, approverId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);
			await this.acquireLock(approverId);

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Find the withdrawal
			const withdrawal = circle.withdrawals.id(withdrawalId);
			if (!withdrawal) {
				throw new Error('Withdrawal not found');
			}

			// Check withdrawal status
			if (withdrawal.status === 'approved') {
				throw new Error('Withdrawal already approved');
			}
			if (withdrawal.status === 'rejected') {
				throw new Error('Withdrawal has been rejected');
			}

			// Check if user can approve
			const isAdmin = circle.members.some(
				(m) =>
					m.userId.toString() === approverId.toString() && m.role === 'admin'
			);

			const isAllowedMember = circle.withdrawalRules.allowedMembers?.some(
				(m) => m.userId.toString() === approverId.toString()
			);

			if (!isAdmin && !isAllowedMember) {
				throw new Error('User is not authorized to approve withdrawals');
			}

			// Check if user already approved
			const alreadyApproved = withdrawal.approvedBy?.some(
				(approval) => approval.userId.toString() === approverId.toString()
			);

			if (alreadyApproved) {
				throw new Error('User has already approved this withdrawal');
			}

			// Add approval
			if (!withdrawal.approvedBy) {
				withdrawal.approvedBy = [];
			}

			withdrawal.approvedBy.push({
				userId: approverId,
				approvedOn: new Date(),
			});

			// Check if minimum approvals are met
			const currentApprovals = withdrawal.approvedBy.length;
			const minApprovals = circle.withdrawalRules.minApprovals || 1;

			if (currentApprovals >= minApprovals) {
				// Process the withdrawal
				const wallet = await Wallet.findOne({
					userId: withdrawal.userId,
				}).session(session);
				if (!wallet) {
					throw new Error('Beneficiary wallet not found');
				}

				if (circle.totalBalance < withdrawal.amount) {
					throw new Error('Insufficient funds in circle');
				}

				// Create transaction
				const transaction = new Transaction({
					senderId: null, // From circle
					receiverId: withdrawal.userId,
					amount: withdrawal.amount,
					type: 'circle_withdrawal',
					status: 'completed',
					reference: generateReference('CWD'),
					metadata: {
						circleId: circle._id,
						circleName: circle.name,
						withdrawalId: withdrawal._id,
						reason: withdrawal.reason,
					},
					completedAt: new Date(),
				});

				await transaction.save({ session });

				// Credit beneficiary's wallet
				wallet.balance += withdrawal.amount;
				wallet.ledger.push({
					transactionId: transaction._id,
					amount: withdrawal.amount,
					balanceBefore: wallet.balance - withdrawal.amount,
					balanceAfter: wallet.balance,
					type: 'credit',
				});
				await wallet.save({ session });

				// Update circle balance
				circle.totalBalance -= withdrawal.amount;
				withdrawal.status = 'approved';
				withdrawal.transactionId = transaction._id;
				withdrawal.processedAt = new Date();
			} else {
				// Still need more approvals
				withdrawal.status = 'pending_approval';
			}

			await circle.save({ session });
			await session.commitTransaction();

			return {
				circle,
				withdrawal,
				approved: withdrawal.status === 'approved',
				message:
					withdrawal.status === 'approved'
						? 'Withdrawal processed successfully'
						: `Approval recorded. ${currentApprovals}/${minApprovals} approvals received`,
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error approving withdrawal ${withdrawalId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
			this.releaseLock(approverId);
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
	async rejectWithdrawal(circleId, withdrawalId, rejecterId, reason) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(circleId);
			await this.acquireLock(rejecterId);

			const circle = await GrymeyCircle.findById(circleId).session(session);
			if (!circle) {
				throw new Error('Circle not found');
			}

			// Find the withdrawal
			const withdrawal = circle.withdrawals.id(withdrawalId);
			if (!withdrawal) {
				throw new Error('Withdrawal not found');
			}

			// Check withdrawal status
			if (withdrawal.status === 'approved') {
				throw new Error('Cannot reject an already approved withdrawal');
			}
			if (withdrawal.status === 'rejected') {
				throw new Error('Withdrawal is already rejected');
			}

			// Check if user can reject (admins or allowed members)
			const isAdmin = circle.members.some(
				(m) =>
					m.userId.toString() === rejecterId.toString() && m.role === 'admin'
			);

			const isAllowedMember = circle.withdrawalRules.allowedMembers?.some(
				(m) => m.userId.toString() === rejecterId.toString()
			);

			if (!isAdmin && !isAllowedMember) {
				throw new Error('User is not authorized to reject withdrawals');
			}

			// Update withdrawal status
			withdrawal.status = 'rejected';
			withdrawal.rejectionReason = reason;
			withdrawal.rejectedBy = rejecterId;
			withdrawal.rejectedAt = new Date();

			// Add to withdrawal history
			if (!withdrawal.history) {
				withdrawal.history = [];
			}

			withdrawal.history.push({
				action: 'rejected',
				by: rejecterId,
				reason: reason,
				timestamp: new Date(),
			});

			await circle.save({ session });
			await session.commitTransaction();

			// In a real app, you would notify the withdrawal requester here
			// await this.notifyUser(withdrawal.userId, {
			//     title: 'Withdrawal Rejected',
			//     message: `Your withdrawal request of ${withdrawal.amount} has been rejected. Reason: ${reason}`
			// });

			return {
				circle,
				withdrawal,
				message: 'Withdrawal rejected successfully',
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error rejecting withdrawal ${withdrawalId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(circleId);
			this.releaseLock(rejecterId);
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
