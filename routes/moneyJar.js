import express from 'express';
import moneyJarController from '../controllers/moneyJar.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Money Jar endpoints
router.post('/', moneyJarController.createMoneyJar);
router.get('/', moneyJarController.getMoneyJars);
router.post('/:id/fund', moneyJarController.fundMoneyJar);
router.post('/:id/withdraw', moneyJarController.withdrawFromMoneyJar);
router.post('/:id/lock', moneyJarController.lockMoneyJar);
router.post('/:id/unlock', moneyJarController.unlockMoneyJar);

export default router;

