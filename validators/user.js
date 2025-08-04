import { body } from 'express-validator';
import { AvailableUserRoles } from '../constants.js';

const userRegisterValidator = [
	body('email')
		.trim()
		.notEmpty()
		.withMessage('Email is required')
		.isEmail()
		.withMessage('Email is invalid'),
	body('name')
		.trim()
		.notEmpty()
		.withMessage('Name is required')
		.isLowercase()
		.withMessage('Name must be lowercase')
		.isLength({ min: 3 })
		.withMessage('Name must be at lease 3 characters long'),
	body('password')
		.trim()
		.notEmpty()
		.withMessage('Password is required')
		.isLength({ min: 4 })
		.withMessage('Enter a strong password'),
];

const userLoginValidator = [
	body('email').trim().notEmpty().isEmail().withMessage('Email is required'),
	// body('phone').trim().notEmpty().withMessage('Phone is invalid'),
	// body('username').optional(),
	body('password').notEmpty().withMessage('Password is required'),
];
const userRoleBaseLoginValidator = [
	body('email').trim().notEmpty().isEmail().withMessage('Email is required'),
	body('password').notEmpty().withMessage('Password is required'),
	body('role').notEmpty().withMessage('Role is required'),
];

const userChangeCurrentPasswordValidator = [
	body('oldPassword').notEmpty().withMessage('Old password is required'),
	body('newPassword').notEmpty().withMessage('New password is required'),
];

const userForgotPasswordValidator = [
	body('email')
		.notEmpty()
		.withMessage('Email is required')
		.isEmail()
		.withMessage('Email is invalid'),
];
const userResetForgottenPasswordValidator = [
	body('newPassword').notEmpty().withMessage('Password is required'),
];

const userAssignRoleValidator = [
	body('role')
		.optional()
		.isIn(AvailableUserRoles)
		.withMessage('Invalid user role'),
];

export {
	userChangeCurrentPasswordValidator,
	userForgotPasswordValidator,
	userLoginValidator,
	userRoleBaseLoginValidator,
	userRegisterValidator,
	userResetForgottenPasswordValidator,
	userAssignRoleValidator,
};
