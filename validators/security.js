import Joi from 'joi';

const ghostTransferSchema = Joi.object({
	recipientId: Joi.string().hex().length(24).required(),
	amount: Joi.number().positive().max(1000000).required(),
	ghostAuthCode: Joi.string().length(6).required(),
});

const reportFraudSchema = Joi.object({
	accountId: Joi.string().hex().length(24).required(),
	reason: Joi.string().min(10).max(500).required(),
});

const verifyTransferSchema = Joi.object({
	transactionId: Joi.string().hex().length(24).required(),
	verificationMethod: Joi.string()
		.valid('otp', 'biometric', 'password')
		.required(),
});

export function validateGhostTransfer(data) {
	const { value, error } = ghostTransferSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateReportFraud(data) {
	const { value, error } = reportFraudSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateVerifyTransfer(data) {
	const { value, error } = verifyTransferSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
