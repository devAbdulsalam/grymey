import mongoose from 'mongoose';
const { Schema } = mongoose;

const billPaymentSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	providerId: {
		type: Schema.Types.ObjectId,
		ref: 'BillProvider',
		required: true,
	},
	amount: { type: Number, required: true, min: 0 },
	fee: { type: Number, default: 0, min: 0 },
	reference: { type: String, required: true, unique: true },
	customerReference: { type: String, required: true }, // e.g., meter number, account number
	status: {
		type: String,
		enum: ['pending', 'completed', 'failed', 'reversed'],
		default: 'pending',
	},
	transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
	metadata: { type: Schema.Types.Mixed },
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
});

// Indexes
// billPaymentSchema.index({ userId: 1 });
billPaymentSchema.index({ providerId: 1 });
// billPaymentSchema.index({ reference: 1 }, { unique: true });
billPaymentSchema.index({ status: 1 });
billPaymentSchema.index({ createdAt: -1 });

export default mongoose.model('BillPayment', billPaymentSchema);
