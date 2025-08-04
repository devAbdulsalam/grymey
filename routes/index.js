import express from 'express';
// import { upload, videoUpload, imageUpload } from '../middleware/multer.js';
import {
	auth,
	oauthCallback,
} from '../controllers/auth.js';

const router = express.Router();

router.get('/auth', auth);
router.get('/oauth2callback', oauthCallback);

export default router;
