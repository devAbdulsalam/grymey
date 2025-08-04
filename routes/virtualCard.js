import express from 'express';
import virtualCardController from '../controllers/virtualCard.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Virtual Card endpoints
router.post('/', virtualCardController.requestNewCard);
router.get('/', virtualCardController.getUserCards);
router.post('/:id/fund', virtualCardController.fundCard);
router.post('/:id/freeze', virtualCardController.freezeCard);
router.get('/:id/transactions', virtualCardController.getCardTransactions);
router.get('/:id/subscriptions', virtualCardController.getCardSubscriptions);

export default router;
