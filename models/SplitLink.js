import mongoose from 'mongoose';
const { Schema } = mongoose;

const recipientSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		amount: { type: Number, required: true, min: 0 },
		percentage: { type: Number, min: 0, max: 100 },
		isPaid: { type: Boolean, default: false },
	},
	{ _id: false }
);

const splitLinkSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	title: { type: String, required: true },
	totalAmount: { type: Number, required: true, min: 0 },
	recipients: [recipientSchema],
	reference: { type: String, required: true, unique: true },
	link: { type: String, required: true },
	status: {
		type: String,
		enum: ['active', 'completed', 'expired', 'cancelled'],
		default: 'active',
	},
	isActive: { type: Boolean, default: true },
	expiresAt: { type: Date },
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
});

// Indexes
// splitLinkSchema.index({ userId: 1 });
splitLinkSchema.index({ status: 1 });
// splitLinkSchema.index({ reference: 1 }, { unique: true });

export default mongoose.model('SplitLink', splitLinkSchema);
