import express from 'express';
import billController from '../controllers/bill.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);
// console.log('Auth middleware applied to bill routes');
// Bills endpoints
router.get('/providers', billController.getBillProviders);
router.get('/history', billController.getPaymentHistory);
router.post('/pay', billController.payBill);

export default router;
