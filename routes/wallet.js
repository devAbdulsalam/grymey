import express from 'express';
const router = express.Router();
import walletController from '../controllers/wallet.js';
import authMiddleware from '../middleware/auth.js';
import ghostModeMiddleware from '../middleware/ghostMode.js';

router.use(authMiddleware.authenticate);

// Wallet endpoints
router.get('/', ghostModeMiddleware.checkGhostMode, walletController.getWallet);
router.get('/:phone', ghostModeMiddleware.checkGhostMode, walletController.getWalletDetails);
router.post(
	'/fund',
	ghostModeMiddleware.checkGhostMode,
	walletController.fundWallet
);
router.post(
	'/transfer',
	ghostModeMiddleware.checkGhostMode,
	walletController.transferFunds
);
router.post(
	'/phone-transfer',
	ghostModeMiddleware.checkGhostMode,
	walletController.sendFunds
);

// Transaction endpoints
router.get(
	'/transactions',
	ghostModeMiddleware.checkGhostMode,
	walletController.getTransactions
);
router.post(
	'/transactions/search',
	ghostModeMiddleware.checkGhostMode,
	walletController.searchTransactions
);

export default router;

