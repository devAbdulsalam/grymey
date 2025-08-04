import securityService from '../services/security.js';
import {
	validateGhostTransfer,
	validateReportFraud,
	validateVerifyTransfer,
} from '../validators/security.js';
import logger from '../utils/logger.js';

class SecurityController {
	async initiateGhostTransfer(req, res, next) {
		try {
			const { userId } = req.user;
			const ghostData = validateGhostTransfer(req.body);

			const result = await securityService.initiateGhostTransfer(
				userId,
				ghostData,
				req.ip,
				req.get('User-Agent')
			);

			res.json({
				success: true,
				message: 'Ghost transfer initiated',
				fakeReference: result.fakeReference,
			});
		} catch (error) {
			logger.error(`Ghost transfer error: ${error.message}`);
			next(error);
		}
	}

	async reportFraudulentAccount(req, res, next) {
		try {
			const { userId } = req.user;
			const reportData = validateReportFraud(req.body);

			const result = await securityService.reportFraudulentAccount(
				userId,
				reportData,
				req.ip,
				req.get('User-Agent')
			);

			res.json({
				success: true,
				message: result.message,
				reportId: result.reportId,
			});
		} catch (error) {
			logger.error(`Report fraud error: ${error.message}`);
			next(error);
		}
	}

	async verifySuspiciousTransfer(req, res, next) {
		try {
			const { userId } = req.user;
			const verificationData = validateVerifyTransfer(req.body);

			const result = await securityService.verifySuspiciousTransfer(
				userId,
				verificationData,
				req.ip,
				req.get('User-Agent')
			);

			res.json({
				success: true,
				message: result.message,
				transactionId: result.transactionId,
				status: result.status,
			});
		} catch (error) {
			logger.error(`Verify transfer error: ${error.message}`);
			next(error);
		}
	}
}

export default new SecurityController();
