import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// Cloudinary configuration
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const uploader = (file, folder) => {
// 	return new Promise((resolve, reject) => {
// 		cloudinary.uploader.upload(
// 			file, (result) =>
// 			{
// 				resolve({
// 					public_id: result.public_id,
// 					url: result.url,
// 				});
// 			},
// 			{
// 				resource_type: 'auto',
// 				folder: `${process.env.PROJECT_NAME}/${folder}`,
// 			}
// 		);
// 	});
// }

const uploader = (file, folder) => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader.upload(
			file,
			{
				resource_type: 'auto',
				folder: `${process.env.PROJECT_NAME}/${folder}`,
			},
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						public_id: result.public_id,
						url: result.url,
					});
				}
			}
		);
	});
};

export { uploader, cloudinary };
// export { cloudinary };
