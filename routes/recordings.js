const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Recording = require('../models/Recording');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Use Cloudinary for storage if configured, otherwise use local storage
let storage;
let useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  // Cloudinary storage
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'voice-recordings',
      resource_type: 'video', // 'video' resource type is used for audio files in Cloudinary
      allowed_formats: ['webm', 'wav', 'mp3', 'mpeg', 'ogg', 'm4a'],
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return 'recording-' + uniqueSuffix;
      }
    }
  });
} else {
  // Local disk storage (for development)
  const uploadsDir = 'uploads';
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir);
    } catch (err) {
      console.error('Could not create uploads directory:', err);
    }
  }
  
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/webm|audio\/wav|audio\/mp3|audio\/mpeg|audio\/ogg|audio\/m4a/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only audio files are allowed.'));
  }
});

// Upload recording (authenticated users)
router.post('/upload', verifyToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const recordingData = {
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      duration: req.body.duration || 0
    };

    // If using Cloudinary, save the URL and public ID
    if (useCloudinary && req.file.path && req.file.filename) {
      recordingData.cloudinaryUrl = req.file.path; // Cloudinary URL
      recordingData.cloudinaryId = req.file.filename; // Cloudinary public ID
    }

    const recording = await Recording.create(recordingData);

    res.status(201).json({
      message: 'Recording uploaded successfully',
      recording
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's own recordings
router.get('/my-recordings', verifyToken, async (req, res) => {
  try {
    const recordings = await Recording.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all recordings (Admin only)
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const recordings = await Recording.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recordings by user ID (Admin only)
router.get('/user/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const recordings = await Recording.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete recording (user can delete their own recordings)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    // Check if the recording belongs to the user
    if (recording.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recording' });
    }
    
    // Delete from Cloudinary if it exists
    if (useCloudinary && recording.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(recording.cloudinaryId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete from database
    await Recording.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

