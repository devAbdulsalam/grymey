import BillPayment from '../models/BillPayment.js';
import BillProvider from '../models/BillProvider.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class BillService {
	async getBillProviders() {
		try {
			const providers = await BillProvider.find({ isActive: true })
				.select('-__v -createdAt')
				.sort({ name: 1 });

			return providers;
		} catch (error) {
			logger.error(`Error getting bill providers: ${error.message}`);
			throw error;
		}
	}

	async payBill(userId, billData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Verify provider exists
			const provider = await BillProvider.findById(billData.providerId).session(
				session
			);
			if (!provider || !provider.isActive) {
				throw new Error('Bill provider not available');
			}

			// Validate customer reference if regex exists
			if (provider.validationRegex) {
				const regex = new RegExp(provider.validationRegex);
				if (!regex.test(billData.customerReference)) {
					throw new Error('Invalid customer reference format');
				}
			}

			// Verify user has sufficient balance (amount + fee)
			const totalAmount = billData.amount + (provider.commissionRate || 0);
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			if (wallet.balance < totalAmount) {
				throw new Error('Insufficient balance');
			}

			// Deduct from wallet
			wallet.balance -= totalAmount;
			wallet.ledger.push({
				transactionId: null, // Will be updated after transaction creation
				amount: -totalAmount,
				balanceBefore: wallet.balance + totalAmount,
				balanceAfter: wallet.balance,
				type: 'debit',
			});
			await wallet.save({ session });

			// Create bill payment record
			const reference = generateReference('BIL');
			const billPayment = new BillPayment({
				userId,
				providerId: provider._id,
				amount: billData.amount,
				fee: provider.commissionRate || 0,
				reference,
				customerReference: billData.customerReference,
				status: 'pending',
				metadata: {
					providerName: provider.name,
					providerCategory: provider.category,
				},
			});

			await billPayment.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: null, // Bill provider
				amount: totalAmount,
				type: 'bill_payment',
				status: 'pending',
				reference,
				metadata: {
					billPaymentId: billPayment._id,
					providerId: provider._id,
					providerName: provider.name,
				},
			});

			await transaction.save({ session });

			// Update wallet ledger with transaction ID
			wallet.ledger[wallet.ledger.length - 1].transactionId = transaction._id;
			await wallet.save({ session });

			// Update bill payment with transaction ID
			billPayment.transactionId = transaction._id;
			await billPayment.save({ session });

			// In a real implementation, you would:
			// 1. Call the bill provider's API to process payment
			// 2. Update status based on provider response
			// For this example, we'll simulate a successful payment

			billPayment.status = 'completed';
			billPayment.completedAt = new Date();
			await billPayment.save({ session });

			transaction.status = 'completed';
			transaction.completedAt = new Date();
			await transaction.save({ session });

			await session.commitTransaction();

			return { billPayment, transaction };
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error paying bill for user ${userId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getPaymentHistory(
		userId,
		{ page = 1, limit = 10, providerId, status }
	) {
		try {
			const query = { userId };
			if (providerId) query.providerId = providerId;
			if (status) query.status = status;

			const options = {
				page,
				limit,
				sort: { createdAt: -1 },
				populate: {
					path: 'providerId',
					select: 'name category logoUrl',
				},
			};

			const result = await BillPayment.paginate(query, options);
			return result;
		} catch (error) {
			logger.error(
				`Error getting bill history for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}
}

export default new BillService();
