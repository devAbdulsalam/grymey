import express from 'express';
const router = express.Router();
import passport from 'passport';
import { authenticate, verifyPermission } from '../middleware/auth.js';
import { validate } from '../validators/validate.js';
import { upload } from '../middleware/multer.js';
import {
	userRegisterValidator,
	userLoginValidator,
	userAssignRoleValidator,
	userRoleBaseLoginValidator,
	userChangeCurrentPasswordValidator,
	userForgotPasswordValidator,
	userResetForgottenPasswordValidator,
} from '../validators/user.js';
import {
	signinUser,
	roleBasedLogin,
	loginUser,
	phoneLogin,
	getUser,
	getUsers,
	assignRole,
	logoutUser,
	updateProfile,
	updateAvatar,
	forgetPassword,
	verifyResetToken,
	resetPassword,
	changePassword,
	sendOTP,
	verifyOTP,
	refreshAccessToken,
	resendEmailVerification,
	verifyEmail,
	deleteUser,
	handleSocialLogin,
} from '../controllers/user.js';

// console.log('hello');

// // get user
router.post('/login', userLoginValidator, validate, loginUser);
router.post('/phone-login', phoneLogin);
// // role base login
router.post('/signin', userRoleBaseLoginValidator, validate, roleBasedLogin);

// //new user
router.post('/register', userRegisterValidator, validate, signinUser);

// //forget Password link to mail
router.post(
	'/forgot-password',
	userForgotPasswordValidator,
	validate,
	forgetPassword
);

router.post('/refresh-token', refreshAccessToken);
router.get('/verify-email/:verificationToken', verifyEmail);
router.post(
	'/resend-email-verification',
	authenticate,
	resendEmailVerification
);

// //send otp to mail
router.post('/send-otp', sendOTP);

// //verify otp
router.post('/verify-otp', verifyOTP);

// // //resetPassword
router.get('/verify-token/:token', verifyResetToken);

// verify refresh token and update password
router.post(
	'/reset-password/:token',
	userResetForgottenPasswordValidator,
	validate,
	resetPassword
);

// // //change Password
router.post(
	'/change-password',
	authenticate,
	userChangeCurrentPasswordValidator,
	validate,
	changePassword
);

// Authenticate user
// //get user
router.get('/current-user', authenticate, getUser);

// //log out user
router.post('/logout', authenticate, logoutUser);

// // //update user profile
router.patch('/avatar', authenticate, upload.single('avatar'), updateAvatar);

// // //update user profile with image or without image
router.patch('/profile', authenticate, upload.single('avatar'), updateProfile);

router.delete('/delete-account', authenticate, deleteUser);

// admin roles
router.get(
	'/',
	// authenticate, verifyPermission(['ADMIN']),
	getUsers
);
router.post(
	'/assign-role/:id',
	userAssignRoleValidator,
	authenticate,
	verifyPermission(['ADMIN']),
	assignRole
);

// SSO routes
router.route('/google').get(
	passport.authenticate('google', {
		scope: ['profile', 'email'],
	}),
	(req, res) => {
		res.send('redirecting to google...');
	}
);

router
	.route('/google/callback')
	.get(passport.authenticate('google'), handleSocialLogin);

export default router;
