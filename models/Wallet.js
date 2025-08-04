import mongoose, { Schema } from 'mongoose';

const ledgerEntrySchema = new Schema(
	{
		transactionId: {
			type: Schema.Types.ObjectId,
			ref: 'Transaction',
			required: true,
		},
		amount: { type: Number, required: true },
		balanceBefore: { type: Number, required: true },
		balanceAfter: { type: Number, required: true },
		type: { type: String, enum: ['credit', 'debit'], required: true },
		date: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const walletSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		unique: true,
	},
	balance: { type: Number, default: 0, min: 0 },
	currency: { type: String, default: 'NGN', uppercase: true },
	isGhost: { type: Boolean, default: false },
	ledger: [ledgerEntrySchema],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Indexes for performance
// walletSchema.index({ userId: 1 });
walletSchema.index({ 'ledger.transactionId': 1 });

// Update the updatedAt field on save
walletSchema.pre('save', function (next) {
	this.updatedAt = Date.now();
	next();
});
const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
