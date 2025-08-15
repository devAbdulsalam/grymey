import mongoose, { Schema } from 'mongoose';

const BeneficiarySchema = new mongoose.Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		name: String,
		account: String,
		amount: Number,
		receiverId: String,
		bank: String,
		recent: Date,
	},
	{ timestamps: true }
);

const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);
export default Beneficiary;
