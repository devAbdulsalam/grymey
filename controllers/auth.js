import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { Readable } from 'stream';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENTID,
	process.env.GOOGLE_CLIENTSECRET,
	process.env.GOOGLE_REDIRECT // e.g., http://localhost:3000/oauth2callback
);

oauth2Client.setCredentials({
	refresh_token: process.env.OAUTH_REFRESHTOKEN,
});

export const auth = async (req, res) => {
	const url = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: ['https://www.googleapis.com/auth/youtube.upload'],
		prompt: 'consent',
	});
	return res.redirect(url);
};

export const oauthCallback = async (req, res) => {
	const { code } = req.query;
	try {
		if (!code) {
			return;
		}
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);
		return res.send(tokens);
	} catch (error) {
		console.error('Error during OAuth callback:', error);
		return res.status(500).json({ message: 'OAuth callback failed', error });
	}
};
