import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log format
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.align(),
	winston.format.printf(
		(info) => `${info.timestamp} ${info.level}: ${info.message}`
	)
);

// Colorize console output only
const consoleFormat = winston.format.combine(
	winston.format.colorize(),
	logFormat
);

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Create logger instance
const logger = winston.createLogger({
	level: isDevelopment ? 'debug' : 'info',
	format: logFormat,
	transports: [
		// Always log to console in development
		new winston.transports.Console({
			format: consoleFormat,
			level: isDevelopment ? 'debug' : 'info',
		}),

		// File transports only in production
		...(isDevelopment
			? []
			: [
					new winston.transports.DailyRotateFile({
						filename: path.join(__dirname, '../logs/error-%DATE%.log'),
						datePattern: 'YYYY-MM-DD',
						level: 'error',
						maxFiles: '30d',
					}),
					new winston.transports.DailyRotateFile({
						filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
						datePattern: 'YYYY-MM-DD',
						maxFiles: '30d',
					}),
			  ]),
	],
	exceptionHandlers: [
		new winston.transports.Console({ format: consoleFormat }),
		...(isDevelopment
			? []
			: [
					new winston.transports.File({
						filename: path.join(__dirname, '../logs/exceptions.log'),
					}),
			  ]),
	],
	rejectionHandlers: [
		new winston.transports.Console({ format: consoleFormat }),
		...(isDevelopment
			? []
			: [
					new winston.transports.File({
						filename: path.join(__dirname, '../logs/rejections.log'),
					}),
			  ]),
	],
});

// Add Morgan stream for HTTP request logging
logger.stream = {
	write: (message) => {
		logger.info(message.trim());
	},
};

// Pretty print for development
if (isDevelopment) {
	logger.debug('Logger running in development mode');
}

export default logger;
