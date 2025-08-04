import virtualCardService from '../services/virtualCard.js';
import {
	validateRequestNewCard,
	validateFundCard,
	validateFreezeCard,
} from '../validators/virtualCard.js';
import logger from '../utils/logger.js';

class VirtualCardController {
	async requestNewCard(req, res, next) {
		try {
			const { userId } = req.user;
			const cardData = validateRequestNewCard(req.body);

			const card = await virtualCardService.requestNewCard(userId, cardData);

			res.status(201).json({
				success: true,
				card,
			});
		} catch (error) {
			logger.error(`Request new card error: ${error.message}`);
			next(error);
		}
	}

	async getUserCards(req, res, next) {
		try {
			const { userId } = req.user;

			const cards = await virtualCardService.getUserCards(userId);

			res.json({
				success: true,
				cards,
			});
		} catch (error) {
			logger.error(`Get user cards error: ${error.message}`);
			next(error);
		}
	}

	async fundCard(req, res, next) {
		try {
			const { userId } = req.user;
			const { id } = req.params;
			const { amount } = validateFundCard(req.body);

			const { card, newWalletBalance, transaction } =
				await virtualCardService.fundCard(id, userId, amount);

			res.json({
				success: true,
				message: 'Card funded successfully',
				card: {
					id: card._id,
					balance: card.balance,
					lastFour: card.cardNumber.slice(-4),
				},
				newWalletBalance,
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
				},
			});
		} catch (error) {
			logger.error(`Fund card error: ${error.message}`);
			next(error);
		}
	}

	async freezeCard(req, res, next) {
		try {
			const { userId } = req.user;
			const { id } = req.params;
			validateFreezeCard(req.body);

			const card = await virtualCardService.freezeCard(id, userId);

			res.json({
				success: true,
				message: 'Card frozen successfully',
				card: {
					id: card._id,
					isFrozen: card.isFrozen,
					lastFour: card.cardNumber.slice(-4),
				},
			});
		} catch (error) {
			logger.error(`Freeze card error: ${error.message}`);
			next(error);
		}
	}

	async getCardTransactions(req, res, next) {
		try {
			const { userId } = req.user;
			const { id } = req.params;

			const transactions = await virtualCardService.getCardTransactions(
				id,
				userId
			);

			res.json({
				success: true,
				transactions,
			});
		} catch (error) {
			logger.error(`Get card transactions error: ${error.message}`);
			next(error);
		}
	}

	async getCardSubscriptions(req, res, next) {
		try {
			const { userId } = req.user;
			const { id } = req.params;

			const subscriptions = await virtualCardService.getCardSubscriptions(
				id,
				userId
			);

			res.json({
				success: true,
				subscriptions,
			});
		} catch (error) {
			logger.error(`Get card subscriptions error: ${error.message}`);
			next(error);
		}
	}
}

export default new VirtualCardController();
