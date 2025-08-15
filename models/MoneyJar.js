import mongoose from 'mongoose';
const { Schema } = mongoose;

const moneyJarSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	name: { type: String, required: true },
	description: { type: String },
	targetAmount: { type: Number, min: 0, required: true },
	currentAmount: { type: Number, default: 0, min: 0 },
	isLocked: { type: Boolean, default: false },
	lockedAt: { type: Date },
	maturityDate: { type: Date },
	autoDebit: {
		isActive: { type: Boolean, default: false },
		amount: { type: Number, min: 0 },
		frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
		nextDebitDate: { type: Date },
	},
	type: {
		type: String,
		enum: ['individual', 'group'],
		default: 'individual',
	},
	circleId: { type: Schema.Types.ObjectId, ref: 'GrymeyCircle' },
	penaltyRate: { type: Number, default: 0.05, min: 0, max: 1 }, // 5% penalty by default
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Indexes
// moneyJarSchema.index({ userId: 1 });
moneyJarSchema.index({ isLocked: 1 });
moneyJarSchema.index({ maturityDate: 1 });
moneyJarSchema.index({ circleId: 1 });

// Update the updatedAt field on save
moneyJarSchema.pre('save', function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model('MoneyJar', moneyJarSchema);
