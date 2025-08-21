import express from 'express';
import grymeyCircleController from '../controllers/grymeyCircle.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware.authenticate);

// Grymey Circle endpoints
router.post('/', grymeyCircleController.createCircle);
router.get('/', grymeyCircleController.getCircles);
router.get('/user', grymeyCircleController.getUserCircles);
router.get('/:id', grymeyCircleController.getCircle);
router.post('/:id/invite', grymeyCircleController.inviteToCircle);
// router.post('/:id/join', grymeyCircleController.inviteToCircle);
router.post('/:id/contribute', grymeyCircleController.contributeToCircle);
router.post('/:id/withdraw', grymeyCircleController.withdrawFromCircle);

export default router;
