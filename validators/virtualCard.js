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
	return requestNewCardSchema.validate(data, { abortEarly: false });
}

export function validateFundCard(data) {
	return fundCardSchema.validate(data, { abortEarly: false });
}

export function validateFreezeCard(data) {
	return freezeCardSchema.validate(data, { abortEarly: false });
}
