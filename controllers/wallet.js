import walletService from '../services/wallet.js';
import transactionService from '../services/transaction.js';
import {
	validateFundWallet,
	validateTransferFunds,
	validateTransactionSearch,
	validateSendFunds,
} from '../validators/wallet.js';
import logger from '../utils/logger.js';

class WalletController {
	async getWallet(req, res, next) {
		try {
			const userId = req.user._id;
			const isGhost = req.isGhost || false;

			const wallet = await walletService.getWallet(userId, isGhost);

			// Sanitize response - don't send full ledger unless needed
			const response = {
				_id: wallet._id,
				userId,
				balance: wallet.balance,
				currency: wallet.currency,
				lastTransactions: wallet.ledger.slice(0, 5),
			};

			res.json(response);
		} catch (error) {
			logger.error(`Get wallet error: ${error.message}`);
			next(error);
		}
	}

	async fundWallet(req, res, next) {
		try {
			const userId = req.user._id;
			const { amount } = validateFundWallet(req.body);
			const isGhost = req.isGhost || false;

			const { wallet, transaction } = await walletService.fundWallet(
				userId,
				amount,
				isGhost
			);

			res.json({
				success: true,
				newBalance: wallet.balance,
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
					status: transaction.status,
				},
			});
		} catch (error) {
			logger.error(`Fund wallet error: ${error.message}`);
			next(error);
		}
	}

	async transferFunds(req, res, next) {
		try {
			const userId = req.user._id;
			const { receiverId, amount } = validateTransferFunds(req.body);
			const isGhost = req.isGhost || false;

			const { transaction, senderWallet } = await walletService.transferFunds(
				userId,
				receiverId,
				amount,
				isGhost
			);

			res.json({
				success: true,
				newBalance: senderWallet.balance,
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
					status: transaction.status,
					receiverId: transaction.receiverId,
				},
			});
		} catch (error) {
			logger.error(`Transfer funds error: ${error.message}`);
			next(error);
		}
	}
	async sendFunds(req, res, next) {
		try {
			const userId = req.user._id;
			const { phone, amount } = validateSendFunds(req.body);
			const isGhost = req.isGhost || false;

			const receiverId = await walletService.getWalletByPhone(phone);

			const { transaction, senderWallet } = await walletService.transferFunds(
				userId,
				receiverId,
				amount,
				isGhost
			);

			res.json({
				success: true,
				newBalance: senderWallet.balance,
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
					status: transaction.status,
					receiverId: transaction.receiverId,
				},
			});
		} catch (error) {
			logger.error(`Transfer funds error: ${error.message}`);
			next(error);
		}
	}
	async getWalletDetails(req, res, next) {
		try {
			const userId = req.user._id;
			const { phone, amount } = validateSendFunds(req.body);
			const isGhost = req.isGhost || false;

			const receiverId = await walletService.getWalletByPhone(phone);

			const { transaction, senderWallet } = await walletService.transferFunds(
				userId,
				receiverId,
				amount,
				isGhost
			);

			res.json({
				success: true,
				newBalance: senderWallet.balance,
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
					status: transaction.status,
					receiverId: transaction.receiverId,
				},
			});
		} catch (error) {
			logger.error(`Transfer funds error: ${error.message}`);
			next(error);
		}
	}

	async getTransactions(req, res, next) {
		try {
			const userId = req.user._id;
			const { page, limit, type, status, startDate, endDate } = req.query;

			const transactions = await transactionService.getTransactions(userId, {
				page: parseInt(page) || 1,
				limit: parseInt(limit) || 10,
				type,
				status,
				startDate,
				endDate,
			});

			res.json(transactions);
		} catch (error) {
			logger.error(`Get transactions error: ${error.message}`);
			next(error);
		}
	}

	async searchTransactions(req, res, next) {
		try {
			const userId = req.user._id;
			const searchQuery = validateTransactionSearch(req.body);

			const transactions = await transactionService.searchTransactions(
				userId,
				searchQuery
			);

			res.json({ success: true, transactions });
		} catch (error) {
			logger.error(`Search transactions error: ${error.message}`);
			next(error);
		}
	}
}

export default new WalletController();
