async function processSplitPayment(splitPaymentId, payerId, paymentMethod) {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// 1. Get split payment details
		const splitPayment = await SplitPayment.findById(splitPaymentId).session(
			session
		);

		// 2. Process main payment from payer
		const totalAmount = splitPayment.recipients.reduce(
			(sum, r) => sum + r.amount,
			0
		);
		const paymentResult = await processPayment({
			from: payerId,
			amount: totalAmount,
			method: paymentMethod,
			session,
		});

		// 3. Distribute to recipients
		const distributionPromises = splitPayment.recipients.map(
			async (recipient) => {
				await transferFunds({
					from: paymentResult.holdingAccount,
					to: recipient.userId,
					amount: recipient.amount,
					reference: `Split payment distribution - ${splitPaymentId}`,
					session,
				});

				// Send notification to recipient
				await sendNotification(recipient.userId, {
					title: 'Split Payment Received',
					message: `You've received ${recipient.amount} from a split payment`,
				});
			}
		);

		await Promise.all(distributionPromises);

		// 4. Update split payment status
		splitPayment.status = 'completed';
		splitPayment.completedAt = new Date();
		await splitPayment.save({ session });

		await session.commitTransaction();

		// Send success notification to payer
		await sendNotification(payerId, {
			title: 'Split Payment Completed',
			message: 'Your split payment has been successfully processed',
		});

		return { success: true, splitPayment };
	} catch (error) {
		await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
}
