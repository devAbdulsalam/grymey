import mongoose from 'mongoose';

const momentSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	type: { type: String, enum: ['image', 'video'], required: true },
	caption: String,
	mediaUrl: String, // Cloudinary URL or YouTube video URL
	thumbnailUrl: String, // Optional: for video preview
	cloudinaryId: String, // for image deletion (optional)
	youtubeVideoId: String, // for managing YouTube videos
	createdAt: { type: Date, default: Date.now },
	status: {
		type: String,
		enum: ['approved', 'pending', 'suspended', 'deleted'],
		default: 'approved',
	},
});

const Moment = mongoose.model('Moment', momentSchema);
export default Moment;
