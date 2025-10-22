const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Recording = require('../models/Recording');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Use /tmp directory in serverless environment (Vercel), local uploads otherwise
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';

// Create uploads directory if it doesn't exist (only works locally)
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// In Vercel, create /tmp/uploads if it doesn't exist
if (process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Could not create uploads directory:', err);
  }
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/webm|audio\/wav|audio\/mp3|audio\/mpeg|audio\/ogg/;
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

    const recording = await Recording.create({
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      duration: req.body.duration || 0
    });

    res.status(201).json({
      message: 'Recording uploaded successfully',
      recording
    });
  } catch (error) {
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

module.exports = router;

