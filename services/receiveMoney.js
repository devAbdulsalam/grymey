import Invoice from '../models/Invoice.js';
import PaymentLink from '../models/PaymentLink.js';
import SplitLink from '../models/SplitLink.js';
import Crowdfunding from '../models/Crowdfunding.js';
import { generateReference } from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class ReceiveMoneyService {
	constructor() {
		this.baseUrl = process.env.BASE_URL || 'https://api.grymey.com';
	}

	async generateInvoice(userId, invoiceData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const reference = generateReference('INV');
			const paymentLink = `${this.baseUrl}/pay/invoice/${reference}`;

			const invoice = new Invoice({
				userId,
				...invoiceData,
				reference,
				paymentLink,
				status: invoiceData.dueDate < new Date() ? 'overdue' : 'pending',
			});

			await invoice.save({ session });

			await session.commitTransaction();

			return invoice;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error generating invoice for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async createPaymentLink(userId, { amount, note, expiresInDays }) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const reference = generateReference('PLK');
			const link = `${this.baseUrl}/pay/link/${reference}`;

			const expiresAt = expiresInDays
				? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
				: null;

			const paymentLink = new PaymentLink({
				userId,
				amount,
				note,
				reference,
				link,
				expiresAt,
				status: 'active',
			});

			await paymentLink.save({ session });

			await session.commitTransaction();

			return paymentLink;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating payment link for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async createSplitLink(userId, { title, recipients, expiresInDays }) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Validate recipients and calculate total amount
			const totalAmount = recipients.reduce((sum, recipient) => {
				if (recipient.amount) return sum + recipient.amount;
				if (recipient.percentage) return sum; // Will calculate later
				throw new Error('Recipient must have either amount or percentage');
			}, 0);

			// If percentages are used, calculate amounts based on total
			if (recipients.some((r) => r.percentage)) {
				const percentageSum = recipients.reduce(
					(sum, r) => sum + (r.percentage || 0),
					0
				);
				if (percentageSum !== 100) {
					throw new Error('Total percentage must equal 100');
				}

				recipients.forEach((recipient) => {
					if (recipient.percentage) {
						recipient.amount = totalAmount * (recipient.percentage / 100);
					}
				});
			}

			const reference = generateReference('SPL');
			const link = `${this.baseUrl}/pay/split/${reference}`;

			const expiresAt = expiresInDays
				? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
				: null;

			const splitLink = new SplitLink({
				userId,
				title,
				totalAmount,
				recipients,
				reference,
				link,
				expiresAt,
				status: 'active',
			});

			await splitLink.save({ session });

			await session.commitTransaction();

			return splitLink;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating split link for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async createCrowdfunding(
		userId,
		{ title, description, targetAmount, expiresInDays }
	) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const reference = generateReference('CFD');
			const link = `${this.baseUrl}/pay/crowdfund/${reference}`;

			const expiresAt = expiresInDays
				? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
				: null;

			const crowdfunding = new Crowdfunding({
				userId,
				title,
				description,
				targetAmount,
				reference,
				link,
				expiresAt,
				status: 'active',
			});

			await crowdfunding.save({ session });

			await session.commitTransaction();

			return crowdfunding;
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating crowdfunding for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getActiveLinks(userId) {
		try {
			const [invoices, paymentLinks, splitLinks, crowdfundings] =
				await Promise.all([
					Invoice.find({
						userId,
						isActive: true,
						status: { $in: ['pending', 'active'] },
					}),
					PaymentLink.find({ userId, isActive: true, status: 'active' }),
					SplitLink.find({ userId, isActive: true, status: 'active' }),
					Crowdfunding.find({ userId, isActive: true, status: 'active' }),
				]);

			return {
				invoices,
				paymentLinks,
				splitLinks,
				crowdfundings,
			};
		} catch (error) {
			logger.error(
				`Error getting active links for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}
}

export default new ReceiveMoneyService();
