import Joi from 'joi';

const withdrawalRuleSchema = Joi.object({
	requiresApproval: Joi.boolean().default(true),
	minApprovals: Joi.when('requiresApproval', {
		is: true,
		then: Joi.number().integer().min(1).max(10).default(1),
		otherwise: Joi.number().integer().min(1).max(10).optional(),
	}),
	allowedMembers: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

const createCircleSchema = Joi.object({
	name: Joi.string().trim().min(2).max(50).required(),
	description: Joi.string().trim().max(200).optional(),
	targetAmount: Joi.number().positive().max(100000000).optional(),
	frequency: Joi.string()
		.valid('daily', 'weekly', 'monthly', 'custom')
		.default('monthly'),
	contributionAmount: Joi.number().positive().max(1000000).optional(),
	withdrawalRules: withdrawalRuleSchema.optional(),
});

const inviteToCircleSchema = Joi.object({
	userId: Joi.string().hex().length(24).required(),
});

const contributeToCircleSchema = Joi.object({
	amount: Joi.number().positive().max(1000000).required(),
});

const withdrawFromCircleSchema = Joi.object({
	amount: Joi.number().positive().max(1000000).required(),
	reason: Joi.string().trim().min(5).max(200).optional(),
});

export function validateCreateCircle(data) {
	const { value, error } = createCircleSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateInviteToCircle(data) {
	const { value, error } = inviteToCircleSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateContributeToCircle(data) {
	const { value, error } = contributeToCircleSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateWithdrawFromCircle(data) {
	const { value, error } = withdrawFromCircleSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
