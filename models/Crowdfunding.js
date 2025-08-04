import mongoose from 'mongoose';
const { Schema } = mongoose;

const contributionSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		amount: { type: Number, required: true, min: 0 },
		message: { type: String },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const crowdfundingSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	title: { type: String, required: true },
	description: { type: String, required: true },
	targetAmount: { type: Number, min: 0 },
	currentAmount: { type: Number, default: 0, min: 0 },
	contributions: [contributionSchema],
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
// crowdfundingSchema.index({ userId: 1 });
crowdfundingSchema.index({ status: 1 });
// crowdfundingSchema.index({ reference: 1 }, { unique: true });

export default mongoose.model('Crowdfunding', crowdfundingSchema);
