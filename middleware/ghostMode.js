import logger from '../utils/logger.js'
import User from '../models/User.js'

/**
 * Middleware to check and handle Ghost Mode authentication
 */
const ghostMode = {
	/**
	 * Check if the request is in Ghost Mode
	 */
	checkGhostMode: async (req, res, next) => {
		try {
			// Check for Ghost Mode specific headers or auth methods
			const ghostToken = req.header('X-Ghost-Token');
			const ghostAuthCode = req.header('X-Ghost-Auth-Code');

			if (ghostToken || ghostAuthCode) {
				// Verify Ghost Mode credentials
				const user = await User.findOne({
					_id: req.user._id,
					ghostToken,
					ghostAuthCode,
				});

				if (!user) {
					throw new Error('Invalid Ghost Mode credentials');
				}

				// Flag the request as Ghost Mode
				req.isGhostMode = true;

				logger.info(`Ghost Mode activated for user ${req.user._id}`);
			} else {
				req.isGhostMode = false;
			}

			next();
		} catch (error) {
			logger.error(`Ghost Mode check error: ${error.message}`);
			res.status(401).send({
				success: false,
				error: 'Ghost Mode authentication failed',
			});
		}
	},

	/**
	 * Middleware to require Ghost Mode authentication
	 */
	requireGhostMode: (req, res, next) => {
		if (!req.isGhostMode) {
			logger.warn(
				`Ghost Mode required but not active for user ${req.user._id}`
			);
			return res.status(403).send({
				success: false,
				error: 'Ghost Mode authentication required',
			});
		}
		next();
	},

	/**
	 * Middleware to prevent access in Ghost Mode
	 */
	preventGhostMode: (req, res, next) => {
		if (req.isGhostMode) {
			logger.warn(
				`Attempted real action in Ghost Mode by user ${req.user._id}`
			);
			return res.status(403).send({
				success: false,
				error: 'Action not available in Ghost Mode',
			});
		}
		next();
	},
};

export default ghostMode;
