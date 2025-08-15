import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import logger from '../utils/logger.js';

class TransactionService {
	async getTransactions(
		userId,
		{ page = 1, limit = 10, type, status, startDate, endDate }
	) {
		try {
			const query = {
				$or: [{ senderId: userId }, { receiverId: userId }],
				isGhost: false,
			};

			if (type) query.type = type;
			if (status) query.status = status;
			if (startDate || endDate) {
				query.createdAt = {};
				if (startDate) query.createdAt.$gte = new Date(startDate);
				if (endDate) query.createdAt.$lte = new Date(endDate);
			}

			const transactions = await Transaction.find(query)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(parseInt(limit));

			const total = await Transaction.countDocuments(query);

			return {
				data: transactions,
				currentPage: parseInt(page),
				totalPages: Math.ceil(total / limit),
				totalItems: total,
			};
		} catch (error) {
			logger.error(
				`Error getting transactions for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}

	async searchTransactions(userId, searchQuery) {
		try {
			const { amount, reference, type, startDate, endDate } = searchQuery;

			const query = {
				$or: [{ senderId: userId }, { receiverId: userId }],
				isGhost: false,
			};

			if (amount) query.amount = amount;
			if (reference) query.reference = { $regex: reference, $options: 'i' };
			if (type) query.type = type;
			if (startDate || endDate) {
				query.createdAt = {};
				if (startDate) query.createdAt.$gte = new Date(startDate);
				if (endDate) query.createdAt.$lte = new Date(endDate);
			}

			const transactions = await Transaction.find(query)
				.sort({ createdAt: -1 })
				.limit(50)
				.lean();

			return transactions;
		} catch (error) {
			logger.error(
				`Error searching transactions for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}
}

export default new TransactionService();
