import mongoose from 'mongoose';
const { Schema } = mongoose;

const escrowSchema = new Schema({
	senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	amount: { type: Number, required: true, min: 0 },
	currency: { type: String, default: 'NGN', uppercase: true },
	description: { type: String, required: true },
	conditions: { type: String, required: true },
	status: {
		type: String,
		enum: ['pending', 'completed', 'disputed', 'cancelled', 'refunded'],
		default: 'pending',
	},
	reference: { type: String, required: true, unique: true },
	transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
	dispute: {
		raisedBy: { type: Schema.Types.ObjectId, ref: 'User' },
		reason: { type: String },
		status: { type: String, enum: ['open', 'resolved', 'rejected'] },
		resolution: { type: String },
		resolvedAt: { type: Date },
	},
	expiresAt: { type: Date },
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
	cancelledAt: { type: Date },
});

// Indexes
escrowSchema.index({ senderId: 1 });
escrowSchema.index({ receiverId: 1 });
escrowSchema.index({ status: 1 });
// escrowSchema.index({ reference: 1 }, { unique: true });
escrowSchema.index({ createdAt: -1 });

export default mongoose.model('Escrow', escrowSchema);
