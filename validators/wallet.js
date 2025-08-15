import Joi from 'joi';
import {
	MAX_TRANSFER_AMOUNT,
	MIN_TRANSFER_AMOUNT,
} from '../config/constants.js';

const fundWalletSchema = Joi.object({
	amount: Joi.number()
		.positive()
		.min(MIN_TRANSFER_AMOUNT)
		.max(MAX_TRANSFER_AMOUNT)
		.required()
		.messages({
			'number.base': 'Amount must be a number',
			'number.positive': 'Amount must be positive',
			'number.min': `Amount must be at least ${MIN_TRANSFER_AMOUNT}`,
			'number.max': `Amount cannot exceed ${MAX_TRANSFER_AMOUNT}`,
			'any.required': 'Amount is required',
		}),
});

const transferFundsSchema = Joi.object({
	receiverId: Joi.string().hex().length(24).required(),
	amount: Joi.number()
		.positive()
		.min(MIN_TRANSFER_AMOUNT)
		.max(MAX_TRANSFER_AMOUNT)
		.required()
		.messages({
			'number.base': 'Amount must be a number',
			'number.positive': 'Amount must be positive',
			'number.min': `Amount must be at least ${MIN_TRANSFER_AMOUNT}`,
			'number.max': `Amount cannot exceed ${MAX_TRANSFER_AMOUNT}`,
			'any.required': 'Amount is required',
		}),
});
const sendFundsSchema = Joi.object({
	// Nigerian phone validation example
	phone: Joi.string()
		// .pattern(/^(\+234|0)[7-9][0-1]\d{8}$/)
		// .pattern(/^\+?[0-9]{7,15}$/) // Valid international phone number pattern
		.pattern(/^[0-9]{10}$/) // Exactly 10 digits
		.required()
		.messages({
			'string.pattern.base':
				'Phone number must be 10 digits (e.g., 9035012273)',
			'any.required': 'Phone number is required',
			'string.empty': 'Phone number cannot be empty',
		}),
	amount: Joi.number()
		.positive()
		.min(MIN_TRANSFER_AMOUNT)
		.max(MAX_TRANSFER_AMOUNT)
		.required()
		.messages({
			'number.base': 'Amount must be a number',
			'number.positive': 'Amount must be positive',
			'number.min': `Amount must be at least ${MIN_TRANSFER_AMOUNT}`,
			'number.max': `Amount cannot exceed ${MAX_TRANSFER_AMOUNT}`,
			'any.required': 'Amount is required',
		}),
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

// console.log('vidate data',data);
// function validateFundWallet(data) {
// 	return fundWalletSchema.validate(data, { abortEarly: false });
// }
function validateFundWallet(data) {
	const { value, error } = fundWalletSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
};

function validateTransferFunds(data) {
	const { value, error } = transferFundsSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
};

function validateSendFunds(data) {
	const { value, error } = sendFundsSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
};

function validateTransactionSearch(data) {
	const { value, error } = transactionSearchSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
};

export { validateFundWallet, validateTransferFunds,validateSendFunds, validateTransactionSearch };
