import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema({
	senderId: { type: Schema.Types.ObjectId, ref: 'User' },
	receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	amount: { type: Number, required: true, min: 0 },
	currency: { type: String, default: 'NGN', uppercase: true },
	type: {
		type: String,
		enum: [
			'transfer',
			'bill_payment',
			'deposit',
			'withdrawal',
			'escrow',
			'split_payment',
			'jar_funding',
			'penalty',
			'jar_withdrawal',
			'circle_contribution',
			'circle_withdrawal',
		],
		required: true,
	},
	status: {
		type: String,
		enum: ['pending', 'completed', 'failed', 'reversed'],
		default: 'pending',
	},
	reference: { type: String, required: true, unique: true },
	metadata: { type: Schema.Types.Mixed },
	isGhost: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
});

// Indexes for performance
transactionSchema.index({ senderId: 1 });
transactionSchema.index({ receiverId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
// transactionSchema.index({ reference: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
