import Joi from 'joi';
import {
	MAX_TRANSFER_AMOUNT,
	MIN_TRANSFER_AMOUNT,
} from '../config/constants.js';

const fundWalletSchema = Joi.object({
	amount: Joi.number().positive().max(MAX_TRANSFER_AMOUNT).required(),
});

const transferFundsSchema = Joi.object({
	receiverId: Joi.string().hex().length(24).required(),
	amount: Joi.number()
		.min(MIN_TRANSFER_AMOUNT)
		.max(MAX_TRANSFER_AMOUNT)
		.required(),
});

const transactionSearchSchema = Joi.object({
	amount: Joi.number().positive().optional(),
	reference: Joi.string().trim().max(100).optional(),
	type: Joi.string()
		.valid(
			'transfer',
			'bill_payment',
			'deposit',
			'withdrawal',
			'escrow',
			'split_payment'
		)
		.optional(),
	startDate: Joi.date().iso().optional(),
	endDate: Joi.date().iso().optional(),
});

function validateFundWallet(data) {
	return fundWalletSchema.validate(data, { abortEarly: false });
}

function validateTransferFunds(data) {
	return transferFundsSchema.validate(data, { abortEarly: false });
}

function validateTransactionSearch(data) {
	return transactionSearchSchema.validate(data, { abortEarly: false });
}

export { validateFundWallet, validateTransferFunds, validateTransactionSearch };
