import Joi from 'joi';

const createEscrowSchema = Joi.object({
	receiverId: Joi.string().hex().length(24).required(),
	amount: Joi.number().positive().max(100000000).required(),
	description: Joi.string().trim().min(5).max(200).required(),
	conditions: Joi.string().trim().min(10).max(500).required(),
	expiresInDays: Joi.number().integer().min(1).max(365).optional().default(30),
});

const releaseEscrowSchema = Joi.object({}).unknown(false); // No body expected

const raiseDisputeSchema = Joi.object({
	reason: Joi.string().trim().min(10).max(500).required(),
});
const getUserEscrowsSchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(10),
	status: Joi.string()
		.valid('pending', 'completed', 'disputed', 'cancelled', 'refunded')
		.optional(),
});

export function validateCreateEscrow(data) {
	const { value, error } = createEscrowSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateReleaseEscrow(data) {
	const { value, error } = releaseEscrowSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}

export function validateRaiseDispute(data) {
	const { value, error } = raiseDisputeSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}
export function validateGetUserEscrows(data) {
	const { value, error } = getUserEscrowsSchema.validate(data, {
		abortEarly: false,
		stripUnknown: true,
		allowUnknown: false,
	});

	if (error) {
		throw new Error(error.details.map((detail) => detail.message).join(', '));
	}

	return value; // This will return { amount: validatedAmount }
}