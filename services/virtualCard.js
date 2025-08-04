import VirtualCard from '../models/VirtualCard.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import {
	generateReference,
	generateCardNumber,
	generateCVV,
} from '../utils/generator.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

class VirtualCardService {
	constructor() {
		this.locks = new Map(); // In-memory locks for race condition prevention
	}

	async requestNewCard(userId, cardData) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Generate card details
			const cardNumber = generateCardNumber();
			const cvv = generateCVV();
			const expiryDate = new Date();
			expiryDate.setFullYear(expiryDate.getFullYear() + 3); // 3 years from now

			const virtualCard = new VirtualCard({
				userId,
				cardNumber,
				cvv,
				expiryDate,
				cardName: cardData.cardName || 'My Grymey Card',
				spendingLimit: cardData.spendingLimit,
				currency: cardData.currency || 'NGN',
			});

			await virtualCard.save({ session });

			await session.commitTransaction();

			// Return minimal card details for security
			return {
				id: virtualCard._id,
				cardNumber: `**** **** **** ${cardNumber.slice(-4)}`,
				expiryDate: virtualCard.expiryDate,
				cardName: virtualCard.cardName,
				balance: virtualCard.balance,
				currency: virtualCard.currency,
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(
				`Error creating virtual card for user ${userId}: ${error.message}`
			);
			throw error;
		} finally {
			session.endSession();
		}
	}

	async getUserCards(userId) {
		try {
			const cards = await VirtualCard.find({ userId })
				.select('-cvv -_id -userId -__v')
				.lean();

			// Mask card numbers for security
			return cards.map((card) => ({
				...card,
				cardNumber: `**** **** **** ${card.cardNumber.slice(-4)}`,
			}));
		} catch (error) {
			logger.error(
				`Error getting virtual cards for user ${userId}: ${error.message}`
			);
			throw error;
		}
	}

	async fundCard(cardId, userId, amount) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Acquire locks to prevent race conditions
			await this.acquireLock(cardId);
			await this.acquireLock(userId);

			// Verify user has sufficient balance
			const wallet = await Wallet.findOne({ userId }).session(session);
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			if (wallet.balance < amount) {
				throw new Error('Insufficient balance');
			}

			const virtualCard = await VirtualCard.findById(cardId).session(session);
			if (!virtualCard) {
				throw new Error('Virtual card not found');
			}
			if (virtualCard.userId.toString() !== userId.toString()) {
				throw new Error('Unauthorized to fund this card');
			}

			// Deduct from wallet
			wallet.balance -= amount;
			wallet.ledger.push({
				transactionId: null, // Will be updated after transaction creation
				amount: -amount,
				balanceBefore: wallet.balance + amount,
				balanceAfter: wallet.balance,
				type: 'debit',
			});
			await wallet.save({ session });

			// Credit card balance
			virtualCard.balance += amount;
			await virtualCard.save({ session });

			// Create transaction record
			const transaction = new Transaction({
				senderId: userId,
				receiverId: null, // Card funding
				amount,
				type: 'card_funding',
				status: 'completed',
				reference: generateReference('CFD'),
				metadata: {
					cardId: virtualCard._id,
					lastFour: virtualCard.cardNumber.slice(-4),
				},
				completedAt: new Date(),
			});

			await transaction.save({ session });

			// Update wallet ledger with transaction ID
			wallet.ledger[wallet.ledger.length - 1].transactionId = transaction._id;
			await wallet.save({ session });

			await session.commitTransaction();

			return {
				card: virtualCard,
				newWalletBalance: wallet.balance,
				transaction,
			};
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error funding virtual card ${cardId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(cardId);
			this.releaseLock(userId);
		}
	}

	async freezeCard(cardId, userId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.acquireLock(cardId);

			const virtualCard = await VirtualCard.findById(cardId).session(session);
			if (!virtualCard) {
				throw new Error('Virtual card not found');
			}
			if (virtualCard.userId.toString() !== userId.toString()) {
				throw new Error('Unauthorized to freeze this card');
			}
			if (virtualCard.isFrozen) {
				throw new Error('Card is already frozen');
			}

			virtualCard.isFrozen = true;
			await virtualCard.save({ session });

			await session.commitTransaction();

			return virtualCard;
		} catch (error) {
			await session.abortTransaction();
			logger.error(`Error freezing virtual card ${cardId}: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
			this.releaseLock(cardId);
		}
	}

	async getCardTransactions(cardId, userId) {
		try {
			const virtualCard = await VirtualCard.findOne({
				_id: cardId,
				userId,
			}).select('transactions');

			if (!virtualCard) {
				throw new Error('Virtual card not found');
			}

			return virtualCard.transactions.sort((a, b) => b.date - a.date);
		} catch (error) {
			logger.error(
				`Error getting transactions for card ${cardId}: ${error.message}`
			);
			throw error;
		}
	}

	async getCardSubscriptions(cardId, userId) {
		try {
			const virtualCard = await VirtualCard.findOne({
				_id: cardId,
				userId,
			}).select('subscriptions');

			if (!virtualCard) {
				throw new Error('Virtual card not found');
			}

			return virtualCard.subscriptions
				.filter((sub) => sub.status === 'active')
				.sort((a, b) => a.nextBillingDate - b.nextBillingDate);
		} catch (error) {
			logger.error(
				`Error getting subscriptions for card ${cardId}: ${error.message}`
			);
			throw error;
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

		throw new Error('Could not acquire lock for virtual card operation');
	}

	releaseLock(resourceId) {
		this.locks.delete(resourceId);
	}
}

export default new VirtualCardService();
