import mongoose, { Schema } from 'mongoose';
const AdminSchema = new mongoose.Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		position: {
			type: String,
		},
		department: {
			type: String,
		},
		status: {
			type: String,
			enum: ['ACTIVE', 'SUSPENDED', 'FIRED'],
			default: 'ACTIVE',
		},
	},
	{ timestamps: true }
);

const Admin = mongoose.model('Admin', AdminSchema);
export default Admin;
