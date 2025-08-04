async function ghostLogin(userId, ghostPassword) {
	// 1. Verify ghost credentials
	const user = await User.findById(userId);
	if (!user || !(await bcrypt.compare(ghostPassword, user.ghostPasswordHash))) {
		throw new Error('Invalid ghost credentials');
	}

	// 2. Create ghost session
	const ghostToken = jwt.sign(
		{ userId: user._id, isGhost: true },
		process.env.JWT_SECRET,
		{ expiresIn: '1h' }
	);

	// 3. Generate dummy data for ghost mode
	const ghostWallet = await generateGhostWallet(user._id);
	const ghostTransactions = await generateGhostTransactions(user._id);

	return {
		token: ghostToken,
		wallet: ghostWallet,
		transactions: ghostTransactions,
	};
}

async function generateGhostWallet(userId) {
	// Generate random balance between 5,000 and 50,000 NGN
	const balance = Math.floor(Math.random() * 45000) + 5000;

	return {
		balance,
		currency: 'NGN',
		ledger: Array.from({ length: 10 }, (_, i) => ({
			transactionId: new mongoose.Types.ObjectId(),
			amount: Math.floor(Math.random() * 20000),
			balanceBefore: balance - Math.floor(Math.random() * 20000),
			balanceAfter: balance,
			type: i % 2 === 0 ? 'credit' : 'debit',
			date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
		})),
	};
}
