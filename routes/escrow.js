import express from 'express';
import escrowController from '../controllers/escrow.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Escrow endpoints
router.get('/', escrowController.getEscrows);
router.post('/', escrowController.createEscrow);
router.post('/:id/release', escrowController.releaseEscrow);
router.post('/:id/dispute', escrowController.raiseDispute);
router.get('/user/:userId', escrowController.getUserEscrows);

export default router;
