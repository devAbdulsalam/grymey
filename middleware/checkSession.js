import User from '../models/User.js';
const checkSessionUser = (req, res, next) => {
	if (!req.session.user) {
		return next();
	}

	User.findById(req.session.user._id)
		.select('-password')
		.then((user) => {
			if (!user) {
				return next();
			}
			req.user = user;
			next();
		})
		.catch((err) => {
			next(new Error(err));
		});
};

export default checkSessionUser;
