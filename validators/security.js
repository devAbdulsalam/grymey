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
	return ghostTransferSchema.validate(data, { abortEarly: false });
}

export function validateReportFraud(data) {
	return reportFraudSchema.validate(data, { abortEarly: false });
}

export function validateVerifyTransfer(data) {
	return verifyTransferSchema.validate(data, { abortEarly: false });
}
