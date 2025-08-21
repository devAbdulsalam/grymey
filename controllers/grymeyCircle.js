import grymeyCircleService from '../services/grymeyCircle.js';
import {
	validateCreateCircle,
	validateInviteToCircle,
	validateContributeToCircle,
	validateWithdrawFromCircle,
	validateGetCircles,
} from '../validators/grymeyCircle.js';
import logger from '../utils/logger.js';

class GrymeyCircleController {
	async createCircle(req, res, next) {
		try {
			const userId = req.user._id;
			const circleData = validateCreateCircle(req.body);

			const circle = await grymeyCircleService.createCircle(userId, circleData);

			res.status(201).json({
				success: true,
				circle: {
					_id: circle._id,
					name: circle.name,
					description: circle.description,
					totalBalance: circle.totalBalance,
					targetAmount: circle.targetAmount,
					status: circle.status,
					createdAt: circle.createdAt,
				},
			});
		} catch (error) {
			logger.error(`Create circle error: ${error.message}`);
			next(error);
		}
	}

	async getUserCircles(req, res, next) {
		try {
			const userId = req.user._id;

			const circles = await grymeyCircleService.getUserCircles(userId);

			res.json({
				success: true,
				circles: circles.map((circle) => ({
					_id: circle._id,
					name: circle.name,
					description: circle.description,
					totalBalance: circle.totalBalance,
					targetAmount: circle.targetAmount,
					memberCount: circle.members.length,
					status: circle.status,
					createdAt: circle.createdAt,
				})),
			});
		} catch (error) {
			logger.error(`Get user circles error: ${error.message}`);
			next(error);
		}
	}
	async getCircles(req, res, next) {
		try {
			const { page, limit, status } = validateGetCircles(req.query);

			const result = await grymeyCircleService.getCircles({
				page,
				limit,
				status,
			});

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get user circles error: ${error.message}`);
			next(error);
		}
	}
	async getCircle(req, res, next) {
		try {
			const circleId = req.params.id;

			const circle = await grymeyCircleService.getCircle(circleId);

			res.json({
				success: true,
				circle,
			});
		} catch (error) {
			logger.error(`Get circle error: ${error.message}`);
			next(error);
		}
	}

	async inviteToCircle(req, res, next) {
		try {
			const inviterId = req.user._id;
			const { id: circleId } = req.params;
			const { userId } = validateInviteToCircle(req.body);

			const circle = await grymeyCircleService.inviteToCircle(
				circleId,
				inviterId,
				userId
			);

			res.json({
				success: true,
				message: 'User invited to circle successfully',
				circle: {
					_id: circle._id,
					name: circle.name,
					memberCount: circle?.members?.length,
				},
			});
		} catch (error) {
			logger.error(`Invite to circle error: ${error.message}`);
			next(error);
		}
	}
	async approveWithdrawal(req, res, next) {
		try {
			const userId = req.user._id;
			const  circleId  = req.params.id;

			const circle = await grymeyCircleService.approveWithdrawal(circleId, userId);

			res.json({
				success: true,
				message: 'User invited to circle successfully',
				circle: {
					_id: circle._id,
					name: circle.name,
					memberCount: circle?.members?.length,
				},
			});
		} catch (error) {
			logger.error(`Invite to circle error: ${error.message}`);
			next(error);
		}
	}

	async contributeToCircle(req, res, next) {
		try {
			const userId = req.user._id;
			const { id: circleId } = req.params;
			const { amount } = validateContributeToCircle(req.body);

			const { circle, transaction } =
				await grymeyCircleService.contributeToCircle(circleId, userId, amount);

			res.json({
				success: true,
				message: 'Contribution successful',
				circle: {
					_id: circle._id,
					name: circle.name,
					totalBalance: circle.totalBalance,
				},
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
				},
			});
		} catch (error) {
			logger.error(`Contribute to circle error: ${error.message}`);
			next(error);
		}
	}

	async withdrawFromCircle(req, res, next) {
		try {
			const userId = req.user._id;
			const { id: circleId } = req.params;
			const withdrawalData = validateWithdrawFromCircle(req.body);

			const result = await grymeyCircleService.withdrawFromCircle(
				circleId,
				userId,
				withdrawalData
			);

			const response = {
				success: true,
				message: result.message,
				circle: {
					_id: result.circle._id,
					name: result.circle.name,
					totalBalance: result.circle.totalBalance,
				},
				requiresApproval: result.requiresApproval,
			};

			if (!result.requiresApproval) {
				response.transaction = {
					_id: result.transaction._id,
					reference: result.transaction.reference,
					amount: result.transaction.amount,
				};
			}

			res.json(response);
		} catch (error) {
			logger.error(`Withdraw from circle error: ${error.message}`);
			next(error);
		}
	}
}

export default new GrymeyCircleController();
