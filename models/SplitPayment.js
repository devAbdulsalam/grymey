import mongoose from 'mongoose';
const { Schema } = mongoose;

const recipientSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		amount: { type: Number, required: true, min: 0 },
		percentage: { type: Number, min: 0, max: 100 },
		isPaid: { type: Boolean, default: false },
		transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
	},
	{ _id: false }
);

const splitPaymentSchema = new Schema({
	creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	payerId: { type: Schema.Types.ObjectId, ref: 'User' },
	title: { type: String, required: true },
	description: { type: String },
	totalAmount: { type: Number, required: true, min: 0 },
	recipients: [recipientSchema],
	reference: { type: String, required: true, unique: true },
	status: {
		type: String,
		enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
		default: 'pending',
	},
	isEscrow: { type: Boolean, default: false },
	escrowConditions: { type: String },
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
});

// Indexes
splitPaymentSchema.index({ creatorId: 1 });
splitPaymentSchema.index({ payerId: 1 });
splitPaymentSchema.index({ status: 1 });
// splitPaymentSchema.index({ reference: 1 }, { unique: true });
splitPaymentSchema.index({ createdAt: -1 });

export default mongoose.model('SplitPayment', splitPaymentSchema);
