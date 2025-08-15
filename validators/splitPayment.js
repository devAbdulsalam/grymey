import Joi from 'joi';

const recipientSchema = Joi.object({
	userId: Joi.string().hex().length(24).required(),
	amount: Joi.number().positive().max(100000000).optional(),
	percentage: Joi.number().positive().max(100).optional(),
}).xor('amount', 'percentage');

const createSplitPaymentSchema = Joi.object({
	title: Joi.string().trim().min(2).max(100).required(),
	description: Joi.string().trim().max(500).optional(),
	recipients: Joi.array().items(recipientSchema).min(2).max(10).required(),
	isEscrow: Joi.boolean().optional(),
	escrowConditions: Joi.when('isEscrow', {
		is: true,
		then: Joi.string().trim().min(10).max(500).required(),
		otherwise: Joi.string().trim().max(500).optional(),
	}),
});

const processSplitPaymentSchema = Joi.object({}).unknown(false); // No body expected

const getUserSplitPaymentsSchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(10),
	status: Joi.string()
		.valid('pending', 'processing', 'completed', 'failed', 'cancelled')
		.optional(),
});

export function validateCreateSplitPayment(data) {
	const { value, error } = createSplitPaymentSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateProcessSplitPayment(data) {
	const { value, error } = processSplitPaymentSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateGetUserSplitPayments(data) {
	const { value, error } = getUserSplitPaymentsSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
