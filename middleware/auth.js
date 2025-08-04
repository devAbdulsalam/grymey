import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

 export const authenticate = async (req, res, next) => {
	// verify user is authenticated
	const { authorization } = req.headers;
	const token =
		req.cookies?.accessToken ||
		authorization?.split(' ')[1] ||
		req.header('Authorization')?.replace('Bearer ', '');

	if (!token) {
		return res.status(401).json({ error: 'Authorization token required' });
	}
	try {
		const { _id } = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		const user = await User.findOne({ _id }).select('-password -refreshToken');

		if (!user) {
			return res.status(401).json({ error: 'Invalid access token' });
		}

		req.token = token;
		req.user = user;
		next();
	} catch (error) {
		logger.error(`Authentication error: ${error.message}`);
		res.status(401).json({ error: 'Request is not authorized' });
	}
};

export const verifyPermission = (roles = []) =>
	asyncHandler(async (req, res, next) => {
		if (!req.user?._id) {
			throw new Error(401, 'Unauthorized request');
		}
		if (roles.includes(req.user?.role)) {
			next();
		} else {
			throw new Error(403, 'You are not allowed to perform this action');
		}
	});
 export const verifyStatus = (status = []) =>
	asyncHandler(async (req, res, next) => {
		if (!req.user?._id) {
			throw new Error(401, 'Unauthorized request');
		}
		if (status.includes(req.user?.status)) {
			next();
		} else {
			throw new Error(
				403,
				'You are not allowed to perform this action, contact admin for more information'
			);
		}
	});

 export const isAdmin = async (req, res, next) => {
	try {
		if (!req.user.isAdmin) {
			throw new Error('Admin access required');
		}
		next();
	} catch (error) {
		logger.error(`Admin check error: ${error.message}`);
		res.status(403).send({
			success: false,
			error: 'Admin privileges required',
		});
	}
};


export default  {
	authenticate,
	verifyPermission,
	verifyStatus,
	isAdmin,
};