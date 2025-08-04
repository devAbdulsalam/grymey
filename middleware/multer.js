import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// const storage = multer.memoryStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, join(__dirname, '../public', 'uploads'));
// 	},
// 	filename: (req, file, cb) => {
// 		const fileName =
// 			new Date().getTime().toString() + path.extname(file.originalname);
// 		cb(null, fileName);
// 	},
// });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// This storage needs public/images folder in the root directory
		// Else it will throw an error saying cannot find path public/images
		cb(null, './public/uploads');
	},
	// Store file in a .png/.jpeg/.jpg format instead of binary
	filename: function (req, file, cb) {
		let fileExtension = '';
		if (file.originalname.split('.').length > 1) {
			fileExtension = file.originalname.substring(
				file.originalname.lastIndexOf('.')
			);
		}
		const filenameWithoutExtension = file.originalname
			.toLowerCase()
			.split(' ')
			.join('-')
			?.split('.')[0];
		cb(
			null,
			filenameWithoutExtension +
				Date.now() +
				Math.ceil(Math.random() * 1e5) + // avoid rare name conflict
				fileExtension
		);
	},
});


const fileFilter = (req, file, cb) => {
	const ext = path.extname(file.originalname).toLowerCase();
	if (['.jpg', '.jpeg', '.png', '.mp4', '.mov'].includes(ext)) {
		cb(null, true);
	} else {
		cb(new Error('Only image and video files are allowed!'), false);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

const videoFileFilter = (req, file, cb) => {
	// console.log('Video file filter:', file.originalname);
	const ext = path.extname(file.originalname).toLowerCase();
	if (ext !== '.mp4' && ext !== '.mov' && ext !== '.avi' && ext !== '.mkv') {
		return cb(
			new Error('Only video files (MP4, MOV, AVI, MKV) are allowed!'),
			false
		);
	}
	cb(null, true);
};

const videoUpload = multer({
	storage: storage,
	fileFilter: videoFileFilter,
	limits: {
		fileSize: 60 * 1024 * 1024, // 60 MB (1-minute HD video estimate)
		files: 1,
	},
});

const imageFileFilter = (req, file, cb) => {
	const ext = path.extname(file.originalname).toLowerCase();
	if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.webp') {
		return cb(
			new Error('Only image files (JPG, PNG, WEBP) are allowed!'),
			false
		);
	}
	cb(null, true);
};

const imageUpload = multer({
	storage: storage,
	fileFilter: imageFileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB max
		files: 5, // up to 5 images
	},
});

export { upload, videoUpload, imageUpload };


