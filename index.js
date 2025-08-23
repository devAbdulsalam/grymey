import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

// routes
// import adminRoutes from './routes/admin/index.js';
import userRoutes from './routes/user.js';
// import momentRoutes from './routes/moment.js';
import indexRoutes from './routes/index.js';
import walletRoutes from './routes/wallet.js';
import receiveMoneyRoutes from './routes/receiveMoney.js';
import splitPaymentRoutes from './routes/splitPayment.js';
import moneyJarRoutes from './routes/moneyJar.js';
import virtualCardRoutes from './routes/virtualCard.js';
import escrowRoutes from './routes/escrow.js';
import grymeyCircleRoutes from './routes/grymeyCircle.js';
import securityRoutes from './routes/security.js';
import billRoutes from './routes/bill.js';
import errorHandler from './middleware/errorHandler.js';
// import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// setups
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = fs.readFileSync(path.resolve(__dirname, './swagger.yaml'), 'utf8');
const swaggerDocument = YAML.parse(file);
/* CONFIGURATION */
dotenv.config();
const app = express();

const PORT = process.env.PORT || 9000;
// Rate limiter to avoid misuse of the service and avoid cost spikes
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	validate: { xForwardedForHeader: false },
	handler: (_, __, ___, options) => {
		throw new Error(
			options.statusCode || 500,
			`There are too many requests. You are only allowed ${
				options.max
			} requests per ${options.windowMs / 60000} minutes`
		);
	},
});

// Apply the rate limiting middleware to all requests
app.use(limiter);
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(express.static('public')); // configure static file to save images locally
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
	cors({
		origin: [
			'http://localhost:3000',
			'http://localhost:8080',
			'http://localhost:5173',
			'http://www.iamgbono.com',
			'https://www.iamgbono.com',
		],
		credentials: true,
	})
);

// required for passport
app.use(
	session({
		secret: process.env.EXPRESS_SESSION_SECRET,
		resave: true,
		saveUninitialized: true,
	})
); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

/* ROUTES */
// app.use('/api/v1/admins', adminRoutes);
app.use('/', indexRoutes);
app.use('/api/v1/wecome', (req, res) => {
	res.status(200).json({ message: 'Welcome to Grymey API' });
});
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/receive', receiveMoneyRoutes);
app.use('/api/v1/split-payments', splitPaymentRoutes);
app.use('/api/v1/jars', moneyJarRoutes);
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/v1/circles', grymeyCircleRoutes);
app.use('/api/v1/cards', virtualCardRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/security', securityRoutes);
// app.use('/api/v1/moments', momentRoutes);

// * API DOCS
// ? Keeping swagger code at the end so that we can load swagger on "/" route
app.use(
	'/',
	swaggerUi.serve,
	swaggerUi.setup(swaggerDocument, {
		swaggerOptions: {
			docExpansion: 'all', // keep all the sections collapsed by default none/all
		},
		customSiteTitle: `${process.env.PROJECT_NAME || 'backend'} api docs`,
	})
);

// error
// common error handling middleware
app.use(errorHandler);

/* MONGOOSE SETUP */
mongoose
	.connect(process.env.MONGO_URL)
	.then(() => {
		app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
		logger.info(`Server running on port ${PORT}`);
		logger.info(
			`API documentation available at http://localhost:${PORT}/api-docs`
		);
	})
	.then(() => logger.info('MongoDB connected successfully'))
	.catch((err) => logger.error('MongoDB connection error:', err));

// app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
