import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import OTP from '../models/Otp.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { resetPasswordEmail } from '../utils/emails.js';
import createTokens from '../utils/createTokens.js';
import { uploader } from '../utils/cloudinary.js';
import asyncHandler from '../utils/asyncHandler.js';
import { hash, verifyHash } from '../utils/hash.js';
import sendEmail from '../utils/sendEmail.js';
import { ApiError } from '../utils/ApiError.js';
import Wallet from '../models/Wallet.js';

const createToken = (_id, time) => {
	return jwt.sign({ _id }, process.env.SECRET, { expiresIn: time || '1d' });
};

export const getUser = async (req, res) => {
	const id = req.params.id || req.user._id;
	try {
		const user = await User.findById(id).select('-password');
		if (!user) {
			return res.status(401).json({ message: 'Invalid user id' });
		}
		return res.status(200).json(user);
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json({ error: error.message || 'Internal server error.' });
	}
};

// // login user

export const loginUser = async (req, res) => {
	const { email, password } = req.body;

	try {
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: 'Email and password are required fields.' });
		}
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res
				.status(401)
				.json({ message: 'Email or password is incorrect.' });
		}

		const { accessToken, refreshToken } = await createTokens(user._id);
		const newUser = await User.findOne({ _id: user._id }).select('-password');

		const options = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
		};

		return res
			.status(200)
			.cookie('accessToken', accessToken, options) // set the access token in the cookie
			.cookie('refreshToken', refreshToken, options)
			.json({
				user: newUser,
				accessToken,
				refreshToken,
				statusCode: 200,
				success: true,
				message: 'Logged in successfully.',
			});
	} catch (error) {
		console.error('Error in login User:', error);
		return res
			.status(500)
			.json({ error: error.message || 'Internal server error.' });
	}
};
export const phoneLogin = async (req, res) => {
	const { phone, password } = req.body;

	try {
		if (!phone || !password) {
			return res
				.status(400)
				.json({ message: 'Phone and password are required fields.' });
		}
		const user = await User.findOne({ phone });
		if (!user) {
			return res.status(401).json({ message: 'Invalid phone or password.' });
		}

		// const hashedPassword = await hash(password);
		// user.password = hashedPassword;
		// await user.save();
		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res
				.status(401)
				.json({ message: 'Email or password is incorrect.' });
		}

		const { accessToken, refreshToken } = await createTokens(user._id);
		const newUser = await User.findOne({ _id: user._id }).select('-password');

		// console.log('newUser', newUser);
		const options = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
		};

		return res
			.status(200)
			.cookie('accessToken', accessToken, options) // set the access token in the cookie
			.cookie('refreshToken', refreshToken, options)
			.json({
				user: newUser,
				accessToken,
				refreshToken,
				statusCode: 200,
				success: true,
				message: 'Logged in successfully.',
			});
	} catch (error) {
		console.error('Error in login User:', error);
		return res
			.status(500)
			.json({ error: error.message || 'Internal server error.' });
	}
};

export const roleBasedLogin = async (req, res) => {
	const { email, password, role } = req.body;

	try {
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: 'Email and password are required fields.' });
		}
		const UserRole = role.toUpperCase();
		const user = await User.findOne({ email, role: UserRole });
		if (!user) {
			return res.status(401).json({ message: 'Unauthorized request' });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		const { accessToken, refreshToken } = await createTokens(user._id);
		const newUser = await User.findOne({ _id: user._id }).select('-password');

		const options = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
		};

		return res
			.status(200)
			.cookie('accessToken', accessToken, options) // set the access token in the cookie
			.cookie('refreshToken', refreshToken, options)
			.json({
				user: newUser,
				accessToken,
				refreshToken,
				statusCode: 200,
				success: true,
				message: 'Logged in successfully.',
			});
	} catch (error) {
		console.error('Error in signinUser:', error);
		return res
			.status(500)
			.json({ error: error.message || 'Internal server error.' });
	}
};
// // signinUser
export const signinUser = async (req, res) => {
	const { name, email, password, phone } = req.body;
	try {
		const existingUser = await User.findOne({ phone });

		// To handle the 409 status code, typically indicating a conflict, you might want to implement it in scenarios where there's a conflict with the current state of the resource.
		// For example, if you're trying to create a new user with an email or username that already exists, it would result in a conflict.
		if (existingUser) {
			return res.status(409).json({ error: 'Phone number is already in use!' });
		}

		const hashedPassword = await hash(password);

		const user = await User.create({
			name,
			email,
			phone,
			password: hashedPassword,
		});
		const wallet = await Wallet.create({ userId: user._id, balance: 0 });
		// Remove password from the response
		user.password = undefined;

		res.status(200).json({
			user,
			wallet,
			statusCode: 200,
			success: true,
			message: 'Account created successfully, Login to continue',
		});
	} catch (error) {
		console.error('Error in signinUser:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const logoutUser = asyncHandler(async (req, res) => {
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$set: {
				refreshToken: undefined,
			},
		},
		{ new: true }
	);

	const options = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
	};

	return res
		.status(200)
		.clearCookie('accessToken', options)
		.clearCookie('refreshToken', options)
		.json({ message: 'User logged out successfully' });
});
// //send mail
export const sendOTPEmail = async (req, res) => {
	try {
		const { email } = req.body;
		const checkUser = User.findOne({ email });
		if (checkUser) {
			const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

			const salt = 10;
			const hashedOTP = await bcrypt.hash(otp, salt);
			const currentTime = new Date().getTime();

			const savedOTP = new OTP({
				otp: hashedOTP,
				email: email,
				createdWhen: `${currentTime}`,
				// expiresWhen: `${currentTime + 600000}`,
				expiresWhen: `${currentTime + 60000000}`,
			});
			const token = createToken(email);
			await savedOTP.save();

			const link = `${process.env.BASE_URL}/verify-otp/${token}/${email}`;

			const mailoption = {
				from: `${process.env.SENDERMAIL}`, // sender address
				to: email, // receivers address
				subject: 'Email for  OTP Verication', // Subject line
				text: `Verify your Account by using this OTP: ${otp} valid for 10 Minutes.`, // plain text body
				html: resetPasswordEmail({ otp, link, userName: checkUser.name }),
			};

			nodemailer
				.createTransport({
					service: 'gmail',
					auth: {
						user: process.env.EMAIL,
						pass: process.env.PASSWORD,
					},
				})
				.sendMail(mailoption, (error, info) => {
					if (error) {
						// console.log(error, "error");
						res.status(401).json({
							error: error,
							message: 'Error sending OTP code',
						});
					} else {
						// console.log(info.response, "success");
						res.status(200).json({
							info,
							token,
							email,
							message: 'OTP code sent successfully',
						});
					}
				});
		}
	} catch (error) {
		console.log(error);
		res.status(401).json({
			error,
			status: 'FAILED',
			message: 'Verication FAILED to send to Email',
		});
	}
};

export const sendOTP = async (req, res) => {
	const { email } = req.body;
	const checkOTPUser = await OTP.findOne({ email });
	if (checkOTPUser) {
		await OTP.deleteOne({ email });
		return sendOTPEmail(req, res);
	} else {
		return sendOTPEmail(req, res);
	}
};
// verify with token
export const verifyOTP = async (req, res) => {
	const { token, otp, email } = req.body;

	if (!token || !otp) {
		res.status(401).json({ msg: 'please provide valid credentials' });
	} else {
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);
		if (!verify) {
			return res.status(401).json({ message: 'OTP Verification failed' });
		}
		const user = await User.findOne({ email });

		if (!user) {
			res.status(401).json({ message: 'User not found' });
		} else {
			const otpUser = await OTP.findOne({ email: user.email });
			const otpVerify = otpUser.otp;
			const userLL = bcrypt.compare(otp, otpVerify);
			const exp = otpUser.expiresWhen;

			if (Number(exp) > Number(Date.now()) && userLL) {
				const token = createToken(user._id);
				res.status(200).json({ message: 'User Verified!', token });
			} else {
				await OTP.deleteMany({ email });
				res.status(401).json({ message: 'User OTP expired' });
			}
		}
	}
};
// // verify with email
export const verifyOtp = async (req, res) => {
	const { email, otp, token } = req.body;

	if (!email || !otp) {
		res.status(401).json({ msg: 'please provide valid credentials' });
	} else {
		const user = await User.checkMail(email);
		const otpUser = await OTP.findOne({ email });

		if (!user) {
			res.status(401).json({ message: 'User not found' });
		} else {
			const otpVerify = otpUser.otp;
			const userLL = bcrypt.compare(otp, otpVerify);
			const exp = otpUser.expiresWhen;

			if (Number(exp) > Number(Date.now()) && userLL) {
				const token = createToken(user._id);
				res
					.status(200)
					.json({ message: 'User Verified!', AccessToken: token, token });
			} else {
				await OTP.deleteMany({ email });
				res.status(401).json({ message: 'User OTP expired' });
			}
		}
	}
};

export const verifyEmail = asyncHandler(async (req, res) => {
	const { verificationToken } = req.params;

	if (!verificationToken) {
		throw new ApiError(400, 'Email verification token is missing');
	}

	// generate a hash from the token that we are receiving
	let hashedToken = crypto
		.createHash('sha256')
		.update(verificationToken)
		.digest('hex');

	// While registering the user, same time when we are sending the verification mail
	// we have saved a hashed value of the original email verification token in the db
	// We will try to find user with the hashed token generated by received token
	// If we find the user another check is if token expiry of that token is greater than current time if not that means it is expired
	const user = await User.findOne({
		emailVerificationToken: hashedToken,
		emailVerificationExpiry: { $gt: Date.now() },
	});

	if (!user) {
		throw new ApiError(489, 'Token is invalid or expired');
	}

	// If we found the user that means the token is valid
	// Now we can remove the associated email token and expiry date as we no  longer need them
	user.emailVerificationToken = undefined;
	user.emailVerificationExpiry = undefined;
	// Tun the email verified flag to `true`
	user.isEmailVerified = true;
	await user.save({ validateBeforeSave: false });

	return res
		.status(200)
		.json({ isEmailVerified: true, message: 'Email is verified' });
});

// This controller is called when user is logged in and he has snackbar that your email is not verified
// In case he did not get the email or the email verification token is expired
// he will be able to resend the token while he is logged in
export const resendEmailVerification = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user?._id);

	if (!user) {
		throw new ApiError(404, 'User does not exists', []);
	}

	// if email is already verified throw an error
	if (!user.email) {
		throw new ApiError(409, 'Add email to verify!');
	}
	if (user.isEmailVerified) {
		throw new ApiError(409, 'Email is already verified!');
	}
	const token = createToken(user._id, '1hr'); // generate email verification creds
	const link = `${process.env.BASE_URL}/api/v1/users/verify-email/${token}`;

	const mailOption = {
		from: 'ammuftau74@gmail.com', // sender address
		to: user.email, // receivers address
		subject: 'Please verify your email', // Subject line
		text: `Please verify your email, ${link}, This Link is valid for 1 hour`, // plain text body
		html: `<p> Please verify your email <br/>${link} <br/>The Link is valid for 1 hour</p>`,
	};

	const sendMessage = await sendEmail(mailOption);
	if (sendMessage.error) {
		console.log('error', error);
		return new ApiError(401, error);
	}
	// console.log(info.response, 'success');
	return res
		.status(200)
		.json({ message: 'Email verification link sent successfully' });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
	const incomingRefreshToken =
		req.cookies.refreshToken || req.body.refreshToken;

	if (!incomingRefreshToken) {
		throw new ApiError(401, 'Unauthorized request');
	}

	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);
		const user = await User.findById(decodedToken?._id);
		if (!user) {
			throw new ApiError(401, 'Invalid refresh token');
		}

		// check if incoming refresh token is same as the refresh token attached in the user document
		// This shows that the refresh token is used or not
		// Once it is used, we are replacing it with new refresh token below
		if (incomingRefreshToken !== user?.refreshToken) {
			// If token is valid but is used already
			throw new ApiError(401, 'Refresh token is expired or used');
		}
		const options = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
		};

		const { accessToken, refreshToken: newRefreshToken } = await createTokens(
			user._id
		);

		return res
			.status(200)
			.cookie('accessToken', accessToken, options)
			.cookie('refreshToken', newRefreshToken, options)
			.json({
				accessToken,
				refreshToken: newRefreshToken,
				message: 'Access token refreshed',
			});
	} catch (error) {
		throw new ApiError(401, error?.message || 'Invalid refresh token');
	}
});

// // // Forget Password
export const forgetPassword = async (req, res) => {
	const { email } = req.body;
	try {
		// Get email from the client and check if user exists
		const user = await User.findOne({ email });

		if (!user) {
			res.status(404).json({
				message: 'Check email and try again',
			});
		}
		// create a token
		const token = createToken(user._id, '5d');
		const link = `${process.env.BASE_URL}/api/v1/users/reset-password/${token}`;

		const mailOption = {
			from: `${process.env.SENDERMAIL}`, // sender address
			to: email, // receivers address
			subject: 'Email for Password Reset', // Subject line
			text: `This Link is valid for 10 Minutes ${link}`, // plain text body
			html: `<p>This Link is valid for 10 Minutes ${link}</p>`,
		};
		const sendMessage = await sendEmail(mailOption);
		if (sendMessage.error) {
			// console.log('error', error);
			return res.status(401).json({ error: error });
		}
		console.log(sendMessage);
		res.status(200).json({
			message: 'Password reset link sent successfully',
		});
	} catch (error) {
		// console.log(error);
		res.status(404).json({ error: error });
	}
};

// // // reset Password
export const verifyResetToken = async (req, res) => {
	const { token } = req.params;
	try {
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			res.status(404).json({ error: 'verification failed' });
		}
		res.status(200).json({
			verified: true,
			token,
			message: 'Reset token verified Successfully',
		});
	} catch (error) {
		res.status(401).json({ error: error, message: 'Something went wrong' });
	}
};
// // // reset Password
export const resetPassword = async (req, res) => {
	const { token } = req.params;
	const { newPassword } = req.params;
	try {
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			res.status(404).json({ error: 'verification failed' });
		}
		const user = await User.findById(verify?._id).select('-password');
		const hashPassword = await User.hashpsw(newPassword);
		user.password = hashPassword;
		await user.save();
		res
			.status(200)
			.json({ message: 'Password Reset Successfully', success: true });
	} catch (error) {
		res.status(401).json({ error: error, message: 'Something went wrong' });
	}
};

// // // change logged in user Password
export const changePassword = async (req, res) => {
	const { oldPassword, newPassword } = req.body;
	try {
		const user = await User.findById(req.user?._id);
		const isPasswordValid = await user.checkPassword(oldPassword);
		if (!isPasswordValid) {
			res.status(400).json({ message: 'Invalid old password' });
		}
		const hashPassword = await user.hashpsw(newPassword);
		user.password = hashPassword;
		await user.save();
		res.status(200).json({ message: 'Password Changed Successfully' });
	} catch (error) {
		console.log(error);
		throw new ApiError(500, 'Something went wrong');
	}
};
// // // Update user avatar
export const updateAvatar = async (req, res) => {
	const { id } = req.user;
	try {
		if (!id || !mongoose.isValidObjectId(id)) {
			return res.status(404).json({ error: 'Enter a valid user' });
		}
		// Check if user has uploaded an avatar
		if (!req.file) {
			throw new ApiError(400, 'Avatar image is required');
		}
		const avatar = await uploader(req.file.path, 'avatars');
		// console.log('avatar', avatar);
		const updateUser = await User.findByIdAndUpdate(
			{ _id: id },
			{ ...req.body, avatar },
			{
				new: true,
			}
		);
		if (!updateUser) {
			await fs.promises.unlink(req.file.path);
			return res.status(404).json({ error: 'User not found' });
		}
		await fs.promises.unlink(req.file.path);
		res
			.status(200)
			.json({ user: updateUser, message: 'Avatar updated successfully' });
	} catch (error) {
		console.log(error);
		await fs.promises.unlink(req.file.path);
		res.status(500).json({ message: 'server error' });
	}
};
// // // Update user with image
export const updateProfile = async (req, res) => {
	try {
		const { name, phone, email } = req.body;
		const { id: _id } = req.user;
		// Define the fields that users are disallowed to update here
		const disAllowedFields = ['password', 'role'];
		// Check if request body contains only allowed fields
		const updates = Object.keys(req.body);
		const isValidOperation = updates.every(
			(update) => !disAllowedFields.includes(update)
		);

		if (!isValidOperation) {
			return res.status(400).json({ error: 'Cannot update password or role' });
		}
		if (req.file) {
			const result = await uploader(req.file.path, 'avatars');
			// console.log(result);
			if (!result) {
				fs.unlinkSync(req.file.path);
				return res.status(401).json({ message: 'Unable to upload Image' });
			}
			let updateData = {
				name,
				phone,
				email,
				avatar: result,
			};

			let user = await User.findByIdAndUpdate(id, updateData, { new: true });
			await fs.unlinkSync(req.file.path);

			return res.status(200).json({
				user,
				message: 'User profile updated successfully',
			});
		} else {
			let user = await User.findByIdAndUpdate(
				id,
				{ ...req.body },
				{ new: true }
			);
			await fs.unlinkSync(req.file.path);
			return res.status(200).json({
				user,
				message: 'User profile updated successfully',
			});
		}
	} catch (error) {
		if (req.file) {
			fs.unlinkSync(req.file.path);
		}
		res.status(500).json({ error: error || error.message });
	}
};

// // // delete user
export const deleteUser = async (req, res) => {
	const { id } = req.body;
	try {
		// required other validation i.e dont delete user with
		let user = await User.findByIdAndDelete({ _id: id });
		if (!user) {
			res.status(401).json({ status: 401, message: 'user not exist' });
		}
		user = await user.save();
		res.status(200).json({ message: 'Account Deleted Successfully' });
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // admins routes
export const getUsers = async (req, res) => {
	try {
		const users = await User.find().select(
			'-password -refreshToken -loginType'
		);
			
		return res.status(200).json(users);
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json({ error: error.message || 'Internal server error.' });
	}
};

// update user role
export const assignRole = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { role } = req.body;
	const user = await User.findById(userId);

	if (!user) {
		throw new ApiError(404, 'User does not exist');
	}
	user.role = role;
	await user.save({ validateBeforeSave: false });

	return res
		.status(200)
		.json(new ApiResponse(200, {}, 'Role changed for the user'));
});

export const handleSocialLogin = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user?._id);

	if (!user) {
		throw new ApiError(404, 'User does not exist');
	}

	const { accessToken, refreshToken } = await createTokens(user._id);

	const options = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
	};

	return res
		.status(301)
		.cookie('accessToken', accessToken, options) // set the access token in the cookie
		.cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
		.redirect(
			// redirect user to the frontend with access and refresh token in case user is not using cookies
			`${process.env.CLIENT_SSO_REDIRECT_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}`
		);
});
