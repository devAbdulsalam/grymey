import mongoose from 'mongoose';
const { Schema } = mongoose;

const paymentLinkSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	amount: { type: Number, required: true, min: 0 },
	note: { type: String },
	reference: { type: String, required: true, unique: true },
	link: { type: String, required: true },
	status: {
		type: String,
		enum: ['active', 'paid', 'expired', 'cancelled'],
		default: 'active',
	},
	isActive: { type: Boolean, default: true },
	expiresAt: { type: Date },
	createdAt: { type: Date, default: Date.now },
	paidAt: { type: Date },
});

// Indexes
// paymentLinkSchema.index({ userId: 1 });
paymentLinkSchema.index({ status: 1 });
// paymentLinkSchema.index({ reference: 1 }, { unique: true });

export default mongoose.model('PaymentLink', paymentLinkSchema);
