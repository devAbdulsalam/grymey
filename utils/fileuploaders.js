import ImageKit from 'imagekit'; // Assuming you have the ImageKit library installed and imported

const imagekit = new ImageKit({
	publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
	privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
	urlEndpoint: `https://ik.imagekit.io/${process.env.IMAGE_KIT_ID}`,
});

export const uploader = async (file, filename, folder) => {
	try {
		const result = await imagekit.upload({
			file: file, // url, base_64, or binary data
			fileName: filename, // You might want to make this dynamic
			// folder: folder, // Specify the folder
			extensions: [
				{
					name: 'google-auto-tagging',
					maxTags: 5,
					minConfidence: 95,
				},
			],
			transformation: {
				pre: 'l-text,i-Imagekit,fs-50,l-end',
				post: [
					{
						type: 'transformation',
						value: 'w-100',
					},
				],
			},
		});
		return {
			public_id: result.fileId,
			url: result.url,
		};
	} catch (error) {
		console.error(error);
		throw error; // Re-throw the error after logging it
	}
};

import AWS from 'aws-sdk';

// Configure AWS with your access and secret key.
const s3 = new AWS.S3({
	accessKeyId: 'your_access_key_id',
	secretAccessKey: 'your_secret_access_key',
	region: 'your_region',
});

export const uploadToS3 = async (file, bucketName) => {
	const params = {
		Bucket: bucketName,
		Key: `folder/${file.name}`, // Folder and file name
		Body: file,
		ACL: 'public-read', // Make the file publicly accessible
	};

	try {
		const data = await s3.upload(params).promise();
		return {
			public_id: data.Key,
			url: data.Location,
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
};
