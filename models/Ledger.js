import mongoose from 'mongoose';

const LedgerSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	createdAt: { type: Date, default: Date.now },
	status: {
		type: String,
		enum: ['approved', 'pending', 'suspended', 'deleted'],
		default: 'approved',
	},
});

const Ledger = mongoose.model('Ledger', LedgerSchema);
export default Ledger;
