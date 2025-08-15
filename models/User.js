import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const UserSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			min: 2,
			max: 100,
		},
		phone: {
			unique: true,
			type: String,
			required: true,
			min: 9,
		},
		countryCode: {
			type: String,
			required: true,
			default: '234', // Default to Nigeria's country code
		},
		country: {
			type: String,
			required: true,
			default: 'Nigeria',
		},
		email: {
			type: String,
			trim: true,
			lowercase: true,
			maxLength: 50,
			unique: true,
			sparse: true, // <-- Important for allowing empty/null values
			validate: {
				validator: function (v) {
					// Allow empty string or null
					if (!v) return true;
					// Simple email format validation
					return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
				},
				message: 'Invalid email format',
			},
		},
		password: String,
		transactionPin: String,
		isTransactionPin: String,
		ghostPasswordHash: String,
		ghostAuthCode: String,
		isVerified: {
			type: Boolean,
			default: false,
		},
		kycStatus: String, // 'pending', 'verified', 'rejected'
		kycDocuments: [
			{
				type: String, // 'id', 'proof_of_address', etc.
				url: String,
				status: String,
			},
		],
		preferences: {
			notification: {
				type: Boolean,
				default: false,
			},
			securityAlerts: {
				type: Boolean,
				default: false,
			},
		},
		createdAt: Date,
		lastLogin: Date,
		avatar: {
			public_id: {
				type: String,
			},
			url: {
				type: String,
			},
		},
		role: {
			type: String,
			enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
			default: 'USER',
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		isAdmin: {
			type: Boolean,
			default: false,
		},
		isEmailVerified: {
			type: Boolean,
			default: false,
		},
		loginType: {
			type: String,
			enum: ['GOOGLE', 'GITHUB', 'EMAIL_PASSWORD', 'PHONE_PIN'],
			default: 'PHONE_PIN',
		},
		refreshToken: String,
		emailVerificationToken: {
			type: String,
		},
		emailVerificationExpiry: {
			type: Date,
		},
	},
	{ timestamps: true }
);

UserSchema.pre('save', function (next) {
	this.name = this.name.toLowerCase();
	this.email = this.email.toLowerCase();
	next();
});

// static signup method
UserSchema.statics.signup = async function (name, email, password) {
	if (!(password.length > 4)) {
		throw new Error('Input a strong password');
	}
	const user = await this.create({ name, email, password: hash });
	return user;
};

// static login method
UserSchema.statics.login = async function (email, password) {
	if (!email && !password) {
		throw Error('All fields must be filled');
	}

	let user = await this.findOne({ email });

	if (!user) {
		throw Error('email or password is incorrect!!');
	}

	const match = bcrypt.compare(password, user.password);
	if (!match) {
		throw Error('email or password is incorrect!');
	}

	return user;
};
// check password
UserSchema.methods.checkPassword = async function (password) {
	const match = await bcrypt.compare(password, this.password);
	return match;
};

// //change password
UserSchema.methods.hashpsw = async function (password) {
	// if (
	// 	!validator.isStrongPassword(password, {
	// 		minLength: 6,
	// 		minLowercase: 1,
	// 		minUppercase: 1,
	// 		// minNumbers: 1,
	// 		// minSymbols: 1,
	// 	})
	// ) {
	// 	throw Error('Input a strong password');
	// }

	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(password, salt);

	return hash;
};

// module.exports = mongoose.model('User', userSchema);

const User = mongoose.model('User', UserSchema);
export default User;
