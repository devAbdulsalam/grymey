import express from 'express';
import receiveMoneyController from '../controllers/receiveMoney.js';
import authMiddleware from '../middleware/auth.js';
import ghostModeMiddleware from '../middleware/ghostMode.js';

const router = express.Router();

router.use(authMiddleware.authenticate);
router.use(ghostModeMiddleware.checkGhostMode);

// Receive Money endpoints
router.post('/invoice', receiveMoneyController.generateInvoice);
router.post('/payment-link', receiveMoneyController.createPaymentLink);
router.post('/split-link', receiveMoneyController.createSplitLink);
router.post('/crowdfunding', receiveMoneyController.createCrowdfunding);
router.get('/links', receiveMoneyController.getActiveLinks);
router.get('/links/:id', receiveMoneyController.getPaymentLink);

export default router;
