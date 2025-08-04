// Financial Limits
export const MAX_TRANSFER_AMOUNT = 10000000; // 10 million Naira
export const MIN_TRANSFER_AMOUNT = 100; // 100 Naira

// Transaction Constants
export const DAILY_TRANSFER_LIMIT = 5000000; // 5 million Naira
export const WEEKLY_TRANSFER_LIMIT = 20000000; // 20 million Naira

// Security Constants
export const MAX_PIN_ATTEMPTS = 5;
export const PASSWORD_RESET_EXPIRY = 3600; // 1 hour in seconds
export const GHOST_MODE_EXPIRY = 86400; // 24 hours in seconds

// API Rate Limits
export const API_RATE_LIMIT = {
	WINDOW_MS: 15 * 60 * 1000, // 15 minutes
	MAX_REQUESTS: 100,
};

// Transaction Types
export const TRANSACTION_TYPES = {
	TRANSFER: 'transfer',
	DEPOSIT: 'deposit',
	WITHDRAWAL: 'withdrawal',
	BILL_PAYMENT: 'bill_payment',
	CARD_FUNDING: 'card_funding',
};

// User Tiers
export const USER_TIERS = {
	BASIC: 'basic',
	PRO: 'pro',
	BUSINESS: 'business',
};

// Error Messages
export const ERROR_MESSAGES = {
	INSUFFICIENT_BALANCE: 'Insufficient balance',
	TRANSFER_LIMIT_EXCEEDED: 'Transfer amount exceeds allowed limit',
	MIN_TRANSFER_NOT_MET: 'Transfer amount below minimum allowed',
};

export default {
	MAX_TRANSFER_AMOUNT,
	MIN_TRANSFER_AMOUNT,
	DAILY_TRANSFER_LIMIT,
	WEEKLY_TRANSFER_LIMIT,
	MAX_PIN_ATTEMPTS,
	PASSWORD_RESET_EXPIRY,
	GHOST_MODE_EXPIRY,
	API_RATE_LIMIT,
	TRANSACTION_TYPES,
	USER_TIERS,
	ERROR_MESSAGES,
};
