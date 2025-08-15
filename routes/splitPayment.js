import express from 'express';
import splitPaymentController from '../controllers/splitPayment.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Split Payment endpoints
router.get('/', splitPaymentController.getSplitPayments);
router.get('/:id', splitPaymentController.getSplitPayment);
router.post('/:id/process', splitPaymentController.processSplitPayment);
router.get('/user/:userId', splitPaymentController.getUserSplitPayments);

export default router;
