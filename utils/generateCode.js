// // Function to generate a unique referral code
export const generateReferralCode = () => {
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZasabcdefghijklmnopqrstuvwxyz0123456789';
	let code = '';
	for (let i = 0; i < 5; i++) {
		code += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return code;
};
