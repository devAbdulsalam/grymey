import mongoose from 'mongoose';
const { Schema } = mongoose;

const billProviderSchema = new Schema({
	name: { type: String, required: true, unique: true },
	category: {
		type: String,
		enum: [
			'electricity',
			'water',
			'internet',
			'tv',
			'airtime',
			'education',
			'government',
		],
		required: true,
	},
	logoUrl: { type: String },
	paymentOptions: {
		bankTransfer: { type: Boolean, default: true },
		card: { type: Boolean, default: true },
		ussd: { type: Boolean, default: false },
	},
	commissionRate: { type: Number, default: 0, min: 0 },
	isActive: { type: Boolean, default: true },
	validationRegex: { type: String }, // Regex to validate customer references
	createdAt: { type: Date, default: Date.now },
});

billProviderSchema.index({ category: 1 });
billProviderSchema.index({ isActive: 1 });

export default mongoose.model('BillProvider', billProviderSchema);
