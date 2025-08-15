import Joi from 'joi';

const generateInvoiceSchema = Joi.object({
	clientName: Joi.string().trim().min(2).max(100).required(),
	description: Joi.string().trim().min(5).max(500).required(),
	amount: Joi.number().positive().max(100000000).required(),
	dueDate: Joi.date().iso().greater('now').required(),
});

const createPaymentLinkSchema = Joi.object({
	amount: Joi.number().positive().max(100000000).required(),
	note: Joi.string().trim().max(200).optional(),
	expiresInDays: Joi.number().integer().min(1).max(365).optional(),
});

const recipientSchema = Joi.object({
	userId: Joi.string().hex().length(24).required(),
	amount: Joi.number().positive().max(100000000).optional(),
	percentage: Joi.number().positive().max(100).optional(),
}).xor('amount', 'percentage');

const createSplitLinkSchema = Joi.object({
	title: Joi.string().trim().min(2).max(100).required(),
	totalAmount: Joi.number().positive().max(100000000).optional(),
	recipients: Joi.array().items(recipientSchema).min(2).max(10).required(),
	expiresInDays: Joi.number().integer().min(1).max(365).optional(),
});

const createCrowdfundingSchema = Joi.object({
	title: Joi.string().trim().min(2).max(100).required(),
	description: Joi.string().trim().min(10).max(1000).required(),
	targetAmount: Joi.number().positive().max(100000000).optional(),
	expiresInDays: Joi.number().integer().min(1).max(365).optional(),
});

export function validateGenerateInvoice(data) {
	const { value, error } = generateInvoiceSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateCreatePaymentLink(data) {
	const { value, error } = createPaymentLinkSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateCreateSplitLink(data) {
	const { value, error } = createSplitLinkSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateCreateCrowdfunding(data) {
	const { value, error } = createCrowdfundingSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
