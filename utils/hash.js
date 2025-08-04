import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Cryptr from 'cryptr';
import Encrypt from '../models/Encrypt.js';

const hash = async (data) => {
	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(data, salt);
	return hash;
};

const verifyHash = async (data, password) => {
	const match = await bcrypt.compare(data, password);
	return match;
};

const encryptData = (data, key) => {
	const cryptr = new Cryptr(key);
	const encryptedData = cryptr.encrypt(data);
	return encryptedData;
};
const decryptData = (encryptedData, key) => {
	const cryptr = new Cryptr(key);
	const decryptedData = cryptr.decrypt(encryptedData);
	return decryptedData;
};
const getEncryptionKey = async (userId) => {
	const encryptionKey = crypto.randomBytes(32).toString('hex');
	const masterKey = process.env.MASTER_ENCRYPTION_KEY;

	const cryptr = new Cryptr(masterKey);
	const encryptedEncryptionKey = cryptr.encrypt(encryptionKey);

	// Store encrypted encryption key and other user data in the database
	let encryptKey;
	encryptKey = await Encrypt.findOne({ userId });
	if (!encryptKey) {
		return (encryptKey = await Encrypt.create({
			userId,
			encryptionKey: encryptedEncryptionKey,
		}));
	}
	return encryptKey;
};
const getUserEncryptionKey = async (userId) => {
	const user = await Encrypt.findOne({ userId });
	const masterKey = process.env.MASTER_ENCRYPTION_KEY; // Example: Retrieve master key from environment variable
	const decryptedEncryptionKey = decryptData(user.encryptionKey, masterKey);
	return decryptedEncryptionKey;
};
export {
	hash,
	verifyHash,
	getEncryptionKey,
	encryptData,
	decryptData,
	getUserEncryptionKey,
};
