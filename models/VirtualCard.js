import mongoose from 'mongoose';
const { Schema } = mongoose;

const cardTransactionSchema = new Schema(
	{
		amount: { type: Number, required: true },
		currency: { type: String, default: 'NGN' },
		merchant: { type: String, required: true },
		category: { type: String, required: true },
		date: { type: Date, default: Date.now },
		reference: { type: String, required: true, unique: true },
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed', 'refunded'],
			default: 'completed',
		},
	},
	{ _id: false }
);

const cardSubscriptionSchema = new Schema(
	{
		merchant: { type: String, required: true },
		amount: { type: Number, required: true },
		frequency: {
			type: String,
			enum: ['daily', 'weekly', 'monthly', 'yearly'],
			required: true,
		},
		nextBillingDate: { type: Date, required: true },
		reference: { type: String, required: true, unique: true },
		status: {
			type: String,
			enum: ['active', 'paused', 'cancelled'],
			default: 'active',
		},
	},
	{ _id: false }
);

const virtualCardSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	cardNumber: { type: String, required: true, unique: true },
	cvv: { type: String, required: true },
	expiryDate: { type: Date, required: true },
	cardName: { type: String, required: true },
	balance: { type: Number, default: 0, min: 0 },
	currency: { type: String, default: 'NGN' },
	isActive: { type: Boolean, default: true },
	isFrozen: { type: Boolean, default: false },
	spendingLimit: { type: Number, min: 0 },
	transactions: [cardTransactionSchema],
	subscriptions: [cardSubscriptionSchema],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Indexes
// virtualCardSchema.index({ userId: 1 });
// virtualCardSchema.index({ cardNumber: 1 }, { unique: true });
virtualCardSchema.index({ isActive: 1 });
virtualCardSchema.index({ isFrozen: 1 });

// Update the updatedAt field on save
virtualCardSchema.pre('save', function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model('VirtualCard', virtualCardSchema);
