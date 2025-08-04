import sendEmail from './emailService'; // Email sending logic
import sendSMS from './smsService'; // SMS sending logic
import sendPushNotification from './pushService'; // Push notification logic

const sendNotification = async ({ userId, message, notificationTypes }) => {
	try {
		if (notificationTypes.includes('EMAIL')) {
			await sendEmail(userId, message);
		}
		if (notificationTypes.includes('SMS')) {
			await sendSMS(userId, message);
		}
		if (notificationTypes.includes('PUSH')) {
			await sendPushNotification(userId, message);
		}
	} catch (error) {
		console.error('Error sending notification:', error);
	}
};

export default sendNotification;
import schedule from 'node-schedule';
import NotificationSetting from './models/NotificationSetting';
import sendNotification from './utils/notificationSender'; // Utility to send notifications

const scheduleNotifications = async () => {
	try {
		const settings = await NotificationSetting.find({ dailyReminder: true });
		settings.forEach((setting) => {
			const { reminderTime, timeZone, userId, notificationTypes } = setting;

			// Schedule a job for the user's reminder time
			const [hour, minute] = reminderTime.split(':');
			const rule = new schedule.RecurrenceRule();
			rule.hour = parseInt(hour, 10);
			rule.minute = parseInt(minute, 10);
			rule.tz = timeZone;

			schedule.scheduleJob(rule, async () => {
				await sendNotification({
					userId,
					message: 'This is your daily reminder!',
					notificationTypes,
				});
			});
		});
	} catch (error) {
		console.error('Error scheduling notifications:', error);
	}
};

// Call the scheduler function
scheduleNotifications();
