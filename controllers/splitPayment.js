import splitPaymentService from '../services/splitPayment.js';
import {
	validateCreateSplitPayment,
	validateProcessSplitPayment,
	validateGetUserSplitPayments,
} from '../validators/splitPayment.js';
import logger from '../utils/logger.js';

class SplitPaymentController {
	async createSplitPayment(req, res, next) {
		try {
			const userId = req.user._id;
			const splitData = validateCreateSplitPayment(req.body);

			const splitPayment = await splitPaymentService.createSplitPayment(
				userId,
				splitData
			);

			res.status(201).json({
				success: true,
				splitPayment: {
					id: splitPayment._id,
					title: splitPayment.title,
					totalAmount: splitPayment.totalAmount,
					recipients: splitPayment.recipients,
					reference: splitPayment.reference,
					status: splitPayment.status,
					createdAt: splitPayment.createdAt,
				},
			});
		} catch (error) {
			logger.error(`Create split payment error: ${error.message}`);
			next(error);
		}
	}

	async getSplitPayment(req, res, next) {
		try {
			const { id } = req.params;

			const splitPayment = await splitPaymentService.getSplitPayment(id);

			res.json({
				success: true,
				splitPayment,
			});
		} catch (error) {
			logger.error(`Get split payment error: ${error.message}`);
			next(error);
		}
	}

	async processSplitPayment(req, res, next) {
		try {
			const { id } = req.params;
			const userId = req.user._id;
			validateProcessSplitPayment(req.body);

			const splitPayment = await splitPaymentService.processSplitPayment(
				id,
				userId
			);

			res.json({
				success: true,
				message: 'Split payment processed successfully',
				splitPayment: {
					id: splitPayment._id,
					reference: splitPayment.reference,
					status: splitPayment.status,
					completedAt: splitPayment.completedAt,
				},
			});
		} catch (error) {
			logger.error(`Process split payment error: ${error.message}`);
			next(error);
		}
	}

	async getSplitPayments(req, res, next) {
		try {
			const { page, limit, status } = validateGetUserSplitPayments(req.query);

			const result = await splitPaymentService.getSplitPayments({
				page,
				limit,
				status,
			});

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get user split payments error: ${error.message}`);
			next(error);
		}
	}
	async getUserSplitPayments(req, res, next) {
		try {
			const { userId } = req.params;
			const { page, limit, status } = validateGetUserSplitPayments(req.query);

			const result = await splitPaymentService.getUserSplitPayments(userId, {
				page,
				limit,
				status,
			});

			res.json({
				success: true,
				...result,
			});
		} catch (error) {
			logger.error(`Get user split payments error: ${error.message}`);
			next(error);
		}
	}
}

export default new SplitPaymentController();
