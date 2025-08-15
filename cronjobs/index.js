import cron from 'node-cron';

// Schedule daily savings aggregation task at midnight
cron.schedule('0 0 * * *', async () => {
	try {
		const users = await User.find({});
		users.forEach(async (user) => {
			if (user.dailySpending > 0) {
				const savings = (user.savingsPercentage / 100) * user.dailySpending;
				user.totalSavings += savings;
				user.transactions.push({ type: 'savings', amount: savings });
				user.dailySpending = 0;
				user.lastSavingsDate = new Date();
				await user.save();
			}
		});
		console.log('Daily savings aggregated.');
	} catch (err) {
		console.error('Error in daily savings aggregation:', err);
	}
});

async function updateGamificationMetrics() {
	try {
		const users = await User.find({});

		users.forEach(async (user) => {
			// Calculate stars based on savings progress or other actions
			const starsEarned = Math.floor(user.totalSavings / 100); // Example: 1 star for every $100 saved

			user.stars = starsEarned;

			// Update level and rank based on stars
			if (user.stars >= 50) {
				user.level = 'Advanced';
				user.rank = 'Silver';
			} else if (user.stars >= 20) {
				user.level = 'Intermediate';
				user.rank = 'Gold';
			} else {
				user.level = 'Beginner';
				user.rank = 'Bronze';
			}

			await user.save();
		});

		console.log('Gamification metrics updated.');
	} catch (err) {
		console.error('Error updating gamification metrics:', err);
	}
}

// Schedule the function to run periodically
cron.schedule('0 0 * * *', () => {
	updateGamificationMetrics();
});

// Function to process automatic savings based on frequency
const processAutomaticSavings = async (user) => {
	try {
		let totalSaved = 0;

		// Calculate savings amount based on frequency
		user.automaticSavings.forEach((savings) => {
			if (savings.frequency === 'daily') {
				totalSaved += savings.amount;
			} else if (savings.frequency === 'weekly') {
				totalSaved += savings.amount * 7; // Assuming 7 days in a week
			} else if (savings.frequency === 'monthly') {
				// Logic to calculate savings for each day of the month
				const daysInMonth = new Date(
					new Date().getFullYear(),
					new Date().getMonth() + 1,
					0
				).getDate();
				totalSaved += savings.amount * daysInMonth;
			}
		});

		user.balance += totalSaved;
		user.totalSavings += totalSaved;

		// Record transaction
		user.transactions.push({ type: 'savings', amount: totalSaved });

		await user.save();
		console.log('Automatic savings processed for user:', user.name);
	} catch (err) {
		console.error('Error processing automatic savings:', err);
	}
};

// Schedule automatic savings processing (e.g., daily at midnight)
cron.schedule('0 0 * * *', async () => {
	try {
		const users = await User.find({});
		users.forEach(async (user) => {
			if (user.automaticSavings.length > 0) {
				await processAutomaticSavings(user);
			}
		});
	} catch (err) {
		console.error('Error scheduling automatic savings:', err);
	}
});
