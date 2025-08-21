import escrowService from '../services/escrow.js';
import {
	validateCreateEscrow,
	validateReleaseEscrow,
	validateRaiseDispute,
	validateGetUserEscrows,
} from '../validators/escrow.js';
import logger from '../utils/logger.js';

class EscrowController {
	async createEscrow(req, res, next) {
		try {
			const userId = req.user._id;
			const escrowData = validateCreateEscrow(req.body);

			const escrow = await escrowService.createEscrow(userId, escrowData);

			res.status(201).json({
				success: true,
				escrow: {
					id: escrow._id,
					receiverId: escrow.receiverId,
					amount: escrow.amount,
					description: escrow.description,
					conditions: escrow.conditions,
					reference: escrow.reference,
					status: escrow.status,
					expiresAt: escrow.expiresAt,
				},
			});
		} catch (error) {
			logger.error(`Create escrow error: ${error.message}`);
			next(error);
		}
	}

	async releaseEscrow(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;
			validateReleaseEscrow(req.body);

			const escrow = await escrowService.releaseEscrow(id, userId);

			res.json({
				success: true,
				message: 'Escrow funds released successfully',
				escrow: {
					id: escrow._id,
					status: escrow.status,
					completedAt: escrow.completedAt,
				},
			});
		} catch (error) {
			logger.error(`Release escrow error: ${error.message}`);
			next(error);
		}
	}

	async raiseDispute(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;
			const { reason } = validateRaiseDispute(req.body);

			const escrow = await escrowService.raiseDispute(id, userId, reason);

			res.json({
				success: true,
				message: 'Escrow dispute raised successfully',
				escrow: {
					id: escrow._id,
					status: escrow.status,
					dispute: escrow.dispute,
				},
			});
		} catch (error) {
			logger.error(`Raise dispute error: ${error.message}`);
			next(error);
		}
	}

	async getUserEscrows(req, res, next) {
		try {
			const { userId } = req.params;
			const { page, limit, status } = validateGetUserEscrows(req.query);

			const result = await escrowService.getUserEscrows(userId, {
				page,
				limit,
				status,
			});

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get user escrows error: ${error.message}`);
			next(error);
		}
	}
	async getEscrow(req, res, next) {
		try {
			const { id } = req.params;

			const result = await escrowService.getEscrow(id);

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get escrow error: ${error.message}`);
			next(error);
		}
	}
	async getEscrows(req, res, next) {
		try {
			const { page, limit, status } = validateGetUserEscrows(req.query);

			const result = await escrowService.getEscrows({
				page,
				limit,
				status,
			});

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get user escrows error: ${error.message}`);
			next(error);
		}
	}
}

export default new EscrowController();
