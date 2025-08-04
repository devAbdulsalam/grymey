import mongoose from 'mongoose';
const { Schema } = mongoose;

const invoiceSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	clientName: { type: String, required: true },
	description: { type: String, required: true },
	amount: { type: Number, required: true, min: 0 },
	dueDate: { type: Date, required: true },
	status: {
		type: String,
		enum: ['pending', 'paid', 'overdue', 'cancelled'],
		default: 'pending',
	},
	reference: { type: String, required: true, unique: true },
	paymentLink: { type: String, required: true },
	isActive: { type: Boolean, default: true },
	createdAt: { type: Date, default: Date.now },
	paidAt: { type: Date },
});

// Indexes
// invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
// invoiceSchema.index({ reference: 1 }, { unique: true });

export default mongoose.model('Invoice', invoiceSchema);
