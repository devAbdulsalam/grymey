import moneyJarService from '../services/moneyJar.js';
import {
	validateCreateMoneyJar,
	validateFundMoneyJar,
	validateWithdrawFromMoneyJar,
} from '../validators/moneyJar.js';
import logger from '../utils/logger.js';

class MoneyJarController {
	async createMoneyJar(req, res, next) {
		try {
			const userId = req.user._id;
			const jarData = validateCreateMoneyJar(req.body);

			const moneyJar = await moneyJarService.createMoneyJar(userId, jarData);

			res.status(201).json({
				success: true,
				moneyJar: {
					id: moneyJar._id,
					name: moneyJar.name,
					targetAmount: moneyJar.targetAmount,
					currentAmount: moneyJar.currentAmount,
					isLocked: moneyJar.isLocked,
					createdAt: moneyJar.createdAt,
				},
			});
		} catch (error) {
			logger.error(`Create money jar error: ${error.message}`);
			next(error);
		}
	}

	async getMoneyJars(req, res, next) {
		try {
			const userId = req.user._id;

			const moneyJars = await moneyJarService.getMoneyJars(userId);

			res.json({
				success: true,
				moneyJars: moneyJars.map((jar) => ({
					id: jar._id,
					name: jar.name,
					description: jar.description,
					targetAmount: jar.targetAmount,
					currentAmount: jar.currentAmount,
					isLocked: jar.isLocked,
					lockedAt: jar.lockedAt,
					maturityDate: jar.maturityDate,
					type: jar.type,
					createdAt: jar.createdAt,
				})),
			});
		} catch (error) {
			logger.error(`Get money jars error: ${error.message}`);
			next(error);
		}
	}
	async getMoneyJar(req, res, next) {
		try {
			const jarId = req.params.id;

			const moneyJar = await moneyJarService.getMoneyJar(jarId);

			res.json({
				success: true,
				moneyJar,
			});
		} catch (error) {
			logger.error(`Get money jar error: ${error.message}`);
			next(error);
		}
	}

	async fundMoneyJar(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;
			const { amount } = validateFundMoneyJar(req.body);

			const { moneyJar, transaction } = await moneyJarService.fundMoneyJar(
				id,
				userId,
				amount
			);

			res.json({
				success: true,
				message: 'Money jar funded successfully',
				moneyJar: {
					id: moneyJar._id,
					currentAmount: moneyJar.currentAmount,
				},
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
				},
			});
		} catch (error) {
			logger.error(`Fund money jar error: ${error.message}`);
			next(error);
		}
	}

	async withdrawFromMoneyJar(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;
			const { amount } = validateWithdrawFromMoneyJar(req.body);

			const { moneyJar, transaction, penaltyAmount } =
				await moneyJarService.withdrawFromMoneyJar(id, userId, amount);

			const response = {
				success: true,
				message: 'Withdrawal from money jar successful',
				moneyJar: {
					id: moneyJar._id,
					currentAmount: moneyJar.currentAmount,
				},
				transaction: {
					id: transaction._id,
					reference: transaction.reference,
					amount: transaction.amount,
				},
			};

			if (penaltyAmount > 0) {
				response.penalty = {
					amount: penaltyAmount,
					rate: moneyJar.penaltyRate,
				};
				response.message += ` (Penalty of ${penaltyAmount} applied)`;
			}

			res.json(response);
		} catch (error) {
			logger.error(`Withdraw from money jar error: ${error.message}`);
			next(error);
		}
	}

	async lockMoneyJar(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;

			const moneyJar = await moneyJarService.lockMoneyJar(id, userId);

			res.json({
				success: true,
				message: 'Money jar locked successfully',
				moneyJar: {
					id: moneyJar._id,
					isLocked: moneyJar.isLocked,
					lockedAt: moneyJar.lockedAt,
				},
			});
		} catch (error) {
			logger.error(`Lock money jar error: ${error.message}`);
			next(error);
		}
	}

	async unlockMoneyJar(req, res, next) {
		try {
			const userId = req.user._id;
			const { id } = req.params;

			const moneyJar = await moneyJarService.unlockMoneyJar(id, userId);

			res.json({
				success: true,
				message: 'Money jar unlocked successfully',
				moneyJar: {
					id: moneyJar._id,
					isLocked: moneyJar.isLocked,
					lockedAt: moneyJar.lockedAt,
				},
			});
		} catch (error) {
			logger.error(`Unlock money jar error: ${error.message}`);
			next(error);
		}
	}
}

export default new MoneyJarController();
