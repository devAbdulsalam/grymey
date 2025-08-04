import crypto from 'crypto';

export function generateReference(prefix = '') {
	const timestamp = Date.now().toString(36);
	const random = crypto.randomBytes(3).toString('hex');
	return `${prefix}${timestamp}${random}`.toUpperCase();
}

export function generateCardNumber() {
	// Generate a 16-digit card number (simplified for example)
	let cardNumber = '';
	for (let i = 0; i < 16; i++) {
		cardNumber += Math.floor(Math.random() * 10);
	}
	return cardNumber;
}

export function generateCVV() {
	// Generate a 3-digit CVV
	return Math.floor(100 + Math.random() * 900).toString();
}
