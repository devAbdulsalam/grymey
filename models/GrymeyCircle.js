import mongoose from 'mongoose';
const { Schema } = mongoose;

const contributionSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	amount: { type: Number, required: true, min: 0 },
	date: { type: Date, default: Date.now },
	transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
});

const memberSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		role: { type: String, enum: ['admin', 'member'], default: 'member' },
		joinedAt: { type: Date, default: Date.now },
		status: {
			type: String,
			enum: ['pending', 'active', 'suspended'],
			default: 'active',
		},
	},
	{ _id: false }
);

const withdrawalSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		amount: { type: Number, required: true, min: 0 },
		reason: { type: String },
		status: {
			type: String,
			enum: ['pending', 'approved', 'rejected', 'cancelled'],
			default: 'pending',
		},
		transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
		approvedBy: [
			{
				userId: { type: Schema.Types.ObjectId, ref: 'User' },
				approvedOn: { type: Date },
			},
		],
		rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
		rejectionReason: { type: String },
		rejectedAt: { type: Date },
		history: [
			{
				action: {
					type: String,
					enum: ['requested', 'approved', 'rejected', 'cancelled'],
				},
				by: { type: Schema.Types.ObjectId, ref: 'User' },
				reason: { type: String },
				timestamp: { type: Date, default: Date.now },
			},
		],
		date: { type: Date, default: Date.now },
		processedAt: { type: Date },
	},
	{ _id: true }
); // Ensure _id is enabled for subdocuments

const grymeyCircleSchema = new Schema({
	name: { type: String, required: true },
	description: { type: String },
	creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	members: [memberSchema],
	contributions: [contributionSchema],
	withdrawals: [withdrawalSchema],
	totalBalance: { type: Number, default: 0, min: 0 },
	targetAmount: { type: Number, min: 0 },
	frequency: {
		type: String,
		enum: ['daily', 'weekly', 'monthly', 'custom'],
		default: 'monthly',
	},
	contributionAmount: { type: Number, min: 0 },
	isLocked: { type: Boolean, default: false },
	withdrawalRules: {
		requiresApproval: { type: Boolean, default: true },
		minApprovals: { type: Number, min: 1, default: 1 },
		allowedMembers: { type: [Schema.Types.ObjectId], ref: 'User' },
	},
	status: {
		type: String,
		enum: ['active', 'completed', 'cancelled'],
		default: 'active',
	},
	createdAt: { type: Date, default: Date.now },
	completedAt: { type: Date },
});

// Indexes
grymeyCircleSchema.index({ creatorId: 1 });
grymeyCircleSchema.index({ 'members.userId': 1 });
grymeyCircleSchema.index({ status: 1 });
grymeyCircleSchema.index({ createdAt: -1 });

export default mongoose.model('GrymeyCircle', grymeyCircleSchema);
