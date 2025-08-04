import User from '../models/User.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ApiError } from './ApiError.js';
dotenv.config();

const generateAccessToken = function (user) {
	return jwt.sign(
		{
			_id: user._id,
			email: user.email,
			name: user.name,
			role: user.role,
		},
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
	);
};

const generateRefreshToken = function (user) {
	return jwt.sign(
		{
			_id: user._id,
		},
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
	);
};

/**
 * @description Method responsible for generating tokens for email verification, password reset etc.
 */
export const generateTemporaryToken = function () {
	// This token should be client facing
	// for example: for email verification unHashedToken should go into the user's mail
	const unHashedToken = crypto.randomBytes(20).toString('hex');

	// This should stay in the DB to compare at the time of verification
	const hashedToken = crypto
		.createHash('sha256')
		.update(unHashedToken)
		.digest('hex');
	// This is the expiry time for the token (20 minutes)
	const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;

	console.log(tokenExpiry);

	return { unHashedToken, hashedToken, tokenExpiry };
};
const generateAccessAndRefreshTokens = async (userId) => {
	try {
		const user = await User.findById(userId);

		const accessToken = await generateAccessToken(user);
		const refreshToken = await generateRefreshToken(user);

		// attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
		user.refreshToken = refreshToken;

		await user.save({ validateBeforeSave: false });
		return { accessToken, refreshToken };
	} catch (error) {
		// console.log(error)
		throw new ApiError(
			500,
			'Something went wrong while generating the access token'
		);
	}
};

export default generateAccessAndRefreshTokens;
