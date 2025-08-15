import Joi from 'joi';

const payBillSchema = Joi.object({
	providerId: Joi.string().hex().length(24).required(),
	amount: Joi.number().positive().max(1000000).required(),
	customerReference: Joi.string().trim().min(3).max(50).required(),
});

const getPaymentHistorySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(10),
	providerId: Joi.string().hex().length(24).optional(),
	status: Joi.string()
		.valid('pending', 'completed', 'failed', 'reversed')
		.optional(),
});

export function validatePayBill(data) {
	const { value, error } = payBillSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateGetPaymentHistory(data) {
	const { value, error } = getPaymentHistorySchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
