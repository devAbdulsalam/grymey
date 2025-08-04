import express from 'express';
import securityController from '../controllers/security.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Security endpoints
router.post('/ghost-transfer', securityController.initiateGhostTransfer);
router.post('/report-fraud', securityController.reportFraudulentAccount);
router.post('/verify-transfer', securityController.verifySuspiciousTransfer);

export default router;
