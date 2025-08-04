import mongoose, { Schema } from 'mongoose';
const EncryptSchema = new mongoose.Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	// // Encrypted using a master encryption key
	encryptionKey: String,
});

const Encrypt = mongoose.model('encyptUser', EncryptSchema);

export default Encrypt;
