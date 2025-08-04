// Database configuration
const dbConfig = {
	mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/grymey',
	options: {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: false,
	},
	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: process.env.REDIS_PORT || 6379,
		password: process.env.REDIS_PASSWORD || '',
	},
};

// Test configuration
if (process.env.NODE_ENV === 'test') {
	dbConfig.mongoURI =
		process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/grymey_test';
}

export default dbConfig;
