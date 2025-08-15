import receiveMoneyService from '../services/receiveMoney.js';
import {
	validateGenerateInvoice,
	validateCreatePaymentLink,
	validateCreateSplitLink,
	validateCreateCrowdfunding,
} from '../validators/receiveMoney.js';
import logger from '../utils/logger.js';

class ReceiveMoneyController {
	async generateInvoice(req, res, next) {
		try {
			const userId = req.user._id;
			const invoiceData = validateGenerateInvoice(req.body);

			const invoice = await receiveMoneyService.generateInvoice(
				userId,
				invoiceData
			);

			res.json({
				success: true,
				invoice: {
					id: invoice._id,
					clientName: invoice.clientName,
					amount: invoice.amount,
					dueDate: invoice.dueDate,
					status: invoice.status,
					paymentLink: invoice.paymentLink,
					reference: invoice.reference,
				},
			});
		} catch (error) {
			logger.error(`Generate invoice error: ${error.message}`);
			next(error);
		}
	}

	async createPaymentLink(req, res, next) {
		try {
			const userId = req.user._id;
			const paymentLinkData = validateCreatePaymentLink(req.body);

			const paymentLink = await receiveMoneyService.createPaymentLink(
				userId,
				paymentLinkData
			);

			res.json({
				success: true,
				paymentLink: {
					id: paymentLink._id,
					amount: paymentLink.amount,
					note: paymentLink.note,
					link: paymentLink.link,
					reference: paymentLink.reference,
					expiresAt: paymentLink.expiresAt,
				},
			});
		} catch (error) {
			logger.error(`Create payment link error: ${error.message}`);
			next(error);
		}
	}

	async createSplitLink(req, res, next) {
		try {
			const userId = req.user._id;
			const splitLinkData = validateCreateSplitLink(req.body);
			// const totalAmount = splitLinkData.totalAmount;
			// const totalAmount = splitLinkData.recipients.reduce(
			// 	(sum, recipient) => sum + recipient.amount,
			// 	0
			// )

			// consider the total amount, and sharing amount/percentage or both
			// consider default value for each recipient

			const splitLink = await receiveMoneyService.createSplitLink(
				userId,
				splitLinkData
			);

			res.json({
				success: true,
				splitLink: {
					id: splitLink._id,
					title: splitLink.title,
					totalAmount: splitLink.totalAmount,
					recipients: splitLink.recipients,
					link: splitLink.link,
					reference: splitLink.reference,
					expiresAt: splitLink.expiresAt,
				},
			});
		} catch (error) {
			logger.error(`Create split link error: ${error.message}`);
			next(error);
		}
	}

	async createCrowdfunding(req, res, next) {
		try {
			const userId = req.user._id;
			const crowdfundingData = validateCreateCrowdfunding(req.body);

			const crowdfunding = await receiveMoneyService.createCrowdfunding(
				userId,
				crowdfundingData
			);

			res.json({
				success: true,
				crowdfunding: {
					id: crowdfunding._id,
					title: crowdfunding.title,
					description: crowdfunding.description,
					targetAmount: crowdfunding.targetAmount,
					link: crowdfunding.link,
					reference: crowdfunding.reference,
					expiresAt: crowdfunding.expiresAt,
				},
			});
		} catch (error) {
			logger.error(`Create crowdfunding error: ${error.message}`);
			next(error);
		}
	}

	async getActiveLinks(req, res, next) {
		try {
			const userId = req.user._id;

			const activeLinks = await receiveMoneyService.getActiveLinks(userId);

			res.json({
				success: true,
				activeLinks,
			});
		} catch (error) {
			logger.error(`Get active links error: ${error.message}`);
			next(error);
		}
	}
	async getPaymentLink(req, res, next) {
		try {
			const userId = req.user._id;
			const paymentId = req.params.id;

			const paymentLinks = await receiveMoneyService.getPaymentLink(
				paymentId,
				userId
			);

			res.json({
				success: true,
				paymentLinks,
			});
		} catch (error) {
			logger.error(`Get active links error: ${error.message}`);
			next(error);
		}
	}
}

export default new ReceiveMoneyController();
