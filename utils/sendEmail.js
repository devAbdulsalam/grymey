import transporter from './transporter.js';

// import sendEmail from './email';
const sendEmail = async (option) => {
	const emailOptions = {
		from: option.from || 'devAbdulsalam74@gmail.com',
		to: option.to,
		subject: option.subject,
		text: option.text,
		html: option.html,
	};
	const message = await transporter.sendMail(emailOptions);
	return message;
};
export default sendEmail;
