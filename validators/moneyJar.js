import Joi from 'joi';

const autoDebitSchema = Joi.object({
	isActive: Joi.boolean().default(false),
	amount: Joi.when('isActive', {
		is: true,
		then: Joi.number().positive().max(1000000).required(),
		otherwise: Joi.number().positive().max(1000000).optional(),
	}),
	frequency: Joi.when('isActive', {
		is: true,
		then: Joi.string().valid('daily', 'weekly', 'monthly').required(),
		otherwise: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
	}),
});

const createMoneyJarSchema = Joi.object({
	name: Joi.string().trim().min(2).max(50).required(),
	description: Joi.string().trim().max(200).optional(),
	targetAmount: Joi.number().positive().max(100000000).optional(),
	autoDebit: autoDebitSchema.optional(),
	maturityDate: Joi.date().iso().greater('now').optional(),
	type: Joi.string().valid('individual', 'group').default('individual'),
	circleId: Joi.when('type', {
		is: 'group',
		then: Joi.string().hex().length(24).required(),
		otherwise: Joi.string().hex().length(24).optional(),
	}),
});

const fundMoneyJarSchema = Joi.object({
	amount: Joi.number().positive().max(1000000).required(),
});

const withdrawFromMoneyJarSchema = Joi.object({
	amount: Joi.number().positive().max(1000000).required(),
});

export function validateCreateMoneyJar(data) {
	const { value, error } = createMoneyJarSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateFundMoneyJar(data) {
	const { value, error } = fundMoneyJarSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateWithdrawFromMoneyJar(data) {
	const { value, error } = withdrawFromMoneyJarSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
