import Joi from 'joi';

const requestNewCardSchema = Joi.object({
	cardName: Joi.string().trim().min(2).max(50).optional(),
	spendingLimit: Joi.number().positive().max(1000000).optional(),
	currency: Joi.string().valid('NGN', 'USD', 'GBP', 'EUR').default('NGN'),
});

const fundCardSchema = Joi.object({
	amount: Joi.number().positive().max(1000000).required(),
});

const freezeCardSchema = Joi.object({}).unknown(false); // No body expected

export function validateRequestNewCard(data) {
	const { value, error } = requestNewCardSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateFundCard(data) {
	const { value, error } = fundCardSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateFreezeCard(data) {
	const { value, error } = freezeCardSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
