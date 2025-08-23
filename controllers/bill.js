import billService from '../services/bill.js';
import {
	validatePayBill,
	validateGetPaymentHistory,
} from '../validators/bill.js';
import logger from '../utils/logger.js';

class BillController {
	async getBillProviders(req, res, next) {
		try {
			const providers = await billService.getBillProviders();
			console.log(providers);
			res.json({
				success: true,
				providers,
			});
		} catch (error) {
			logger.error(`Get bill providers error: ${error.message}`);
			next(error);
		}
	}

	async payBill(req, res, next) {
		try {
			const userId = req.user._id;
			const billData = validatePayBill(req.body);

			const { billPayment, transaction } = await billService.payBill(
				userId,
				billData
			);

			res.json({
				success: true,
				message: 'Bill payment successful',
				payment: {
					id: billPayment._id,
					reference: billPayment.reference,
					amount: billPayment.amount,
					fee: billPayment.fee,
					provider: billPayment.providerId.name,
					status: billPayment.status,
				},
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
				},
			});
		} catch (error) {
			logger.error(`Pay bill error: ${error.message}`);
			next(error);
		}
	}

	async getPaymentHistory(req, res, next) {
		try {
			const userId = req.user._id;
			const { page, limit, providerId, status } = validateGetPaymentHistory(
				req.query
			);

			const history = await billService.getPaymentHistory(userId, {
				page,
				limit,
				providerId,
				status,
			});

			res.json({
				success: true,
				...history,
			});
		} catch (error) {
			logger.error(`Get payment history error: ${error.message}`);
			next(error);
		}
	}
}

export default new BillController();
