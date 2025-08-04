import express from 'express';
import billController from '../controllers/bill.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Bills endpoints
router.get('/providers', billController.getBillProviders);
router.post('/pay', billController.payBill);
router.get('/history', billController.getPaymentHistory);

export default router;
