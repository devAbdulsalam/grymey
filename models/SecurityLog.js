import mongoose from 'mongoose';
const { Schema } = mongoose;

const securityLogSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	action: { type: String, required: true },
	type: {
		type: String,
		enum: [
			'ghost_transfer',
			'fraud_report',
			'transfer_verification',
			'login',
			'password_change',
		],
		required: true,
	},
	ipAddress: { type: String },
	userAgent: { type: String },
	metadata: { type: Schema.Types.Mixed },
	createdAt: { type: Date, default: Date.now },
});

// Indexes
// securityLogSchema.index({ userId: 1 });
securityLogSchema.index({ type: 1 });
securityLogSchema.index({ createdAt: -1 });

export default mongoose.model('SecurityLog', securityLogSchema);
