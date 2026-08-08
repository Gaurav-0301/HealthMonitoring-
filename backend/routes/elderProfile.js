const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ElderProfile = require('../models/ElderProfile');
const MedicalHistory = require('../models/MedicalHistory');
const { authMiddleware } = require('../middleware/auth');

// Multer Storage Configuration
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/elder-profile - Create new elder profile
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, age, gender, photoUrl, address, landmark, lat, lng, emergencyContacts } = req.body;

    if (!name || !age || !gender || !address) {
      return res.status(400).json({ message: 'Name, age, gender, and address are required' });
    }

    // Sanitize emergency contacts so schema validation never fails
    const sanitizedContacts = Array.isArray(emergencyContacts)
      ? emergencyContacts
          .filter(c => c && typeof c === 'object' && c.name && c.phone)
          .map(c => ({
            name: String(c.name).trim(),
            relation: c.relation ? String(c.relation).trim() : 'Family Contact',
            phone: String(c.phone).trim()
          }))
      : [];

    const numLat = Number(lat);
    const numLng = Number(lng);

    const elder = await ElderProfile.create({
      linkedFamilyUserId: req.user.id,
      name: String(name).trim(),
      age: Number(age),
      gender: ['male', 'female', 'other'].includes(gender) ? gender : 'female',
      photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      address: String(address).trim(),
      landmark: landmark ? String(landmark).trim() : '',
      geoLocation: {
        lat: !isNaN(numLat) ? numLat : 28.6139,
        lng: !isNaN(numLng) ? numLng : 77.2090
      },
      emergencyContacts: sanitizedContacts
    });

    // Safely upsert default empty medical history (never throw if exists)
    try {
      await MedicalHistory.findOneAndUpdate(
        { elderProfileId: elder._id },
        {
          elderProfileId: elder._id,
          conditions: [],
          medications: [],
          allergies: [],
          bloodGroup: 'Unknown'
        },
        { upsert: true, new: true }
      );
    } catch (medErr) {
      console.warn('[MedicalHistory Init Warning]', medErr.message);
    }

    res.status(201).json({ message: 'Elder profile created successfully', elder });
  } catch (error) {
    console.error('[Elder Profile Creation Error]', error);
    res.status(500).json({ message: 'Error creating elder profile: ' + error.message, error: error.message });
  }
});

// GET /api/elder-profile - List all elders linked to logged-in family user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'family') {
      query.linkedFamilyUserId = req.user.id;
    }
    const elders = await ElderProfile.find(query).sort({ createdAt: -1 });
    res.json(elders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching elder profiles', error: error.message });
  }
});

// PUT /api/elder-profile/:id - Update existing elder profile details & contacts
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, age, gender, photoUrl, address, landmark, emergencyContacts } = req.body;
    const elder = await ElderProfile.findById(req.params.id);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    if (name) elder.name = String(name).trim();
    if (age) elder.age = Number(age);
    if (gender) elder.gender = gender;
    if (photoUrl !== undefined) elder.photoUrl = photoUrl;
    if (address) elder.address = String(address).trim();
    if (landmark !== undefined) elder.landmark = String(landmark).trim();

    if (Array.isArray(emergencyContacts)) {
      elder.emergencyContacts = emergencyContacts
        .filter(c => c && typeof c === 'object' && (c.name || c.phone))
        .map(c => ({
          name: c.name ? String(c.name).trim() : 'Emergency Contact',
          relation: c.relation ? String(c.relation).trim() : 'Contact',
          phone: c.phone ? String(c.phone).trim() : ''
        }));
    }

    await elder.save();
    res.json({ message: 'Elder profile updated successfully', elder });
  } catch (error) {
    res.status(500).json({ message: 'Error updating elder profile', error: error.message });
  }
});

// GET /api/elder-profile/:id - Single elder profile details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const elder = await ElderProfile.findById(req.params.id);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });
    res.json(elder);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// POST /api/elder-profile/:id/medical-history - Multipart form with file upload (max 5 files)
router.post('/:id/medical-history', authMiddleware, upload.array('documents', 5), async (req, res) => {
  try {
    const elderId = req.params.id;
    const elder = await ElderProfile.findById(elderId);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    let { conditions, allergies, medications, bloodGroup, doctorName, doctorContact, pastSurgeries } = req.body;

    // Parse JSON strings if passed from multipart form
    if (typeof conditions === 'string') {
      try { conditions = JSON.parse(conditions); } catch (e) { conditions = conditions.split(',').map(s => s.trim()); }
    }
    if (typeof allergies === 'string') {
      try { allergies = JSON.parse(allergies); } catch (e) { allergies = allergies.split(',').map(s => s.trim()); }
    }
    if (typeof pastSurgeries === 'string') {
      try { pastSurgeries = JSON.parse(pastSurgeries); } catch (e) { pastSurgeries = pastSurgeries.split(',').map(s => s.trim()); }
    }
    if (typeof medications === 'string') {
      try { medications = JSON.parse(medications); } catch (e) { medications = []; }
    }

    const uploadedDocUrls = (req.files || []).map(file => `/uploads/${file.filename}`);

    let history = await MedicalHistory.findOne({ elderProfileId: elderId });
    if (history) {
      history.conditions = conditions || history.conditions;
      history.allergies = allergies || history.allergies;
      history.medications = medications || history.medications;
      history.bloodGroup = bloodGroup || history.bloodGroup;
      history.doctorName = doctorName || history.doctorName;
      history.doctorContact = doctorContact || history.doctorContact;
      history.pastSurgeries = pastSurgeries || history.pastSurgeries;
      if (uploadedDocUrls.length > 0) {
        history.documentsUploaded = [...history.documentsUploaded, ...uploadedDocUrls];
      }
      history.updatedAt = new Date();
      await history.save();
    } else {
      history = await MedicalHistory.create({
        elderProfileId: elderId,
        conditions: conditions || [],
        allergies: allergies || [],
        medications: medications || [],
        bloodGroup: bloodGroup || 'Unknown',
        doctorName: doctorName || '',
        doctorContact: doctorContact || '',
        pastSurgeries: pastSurgeries || [],
        documentsUploaded: uploadedDocUrls
      });
    }

    res.json({ message: 'Medical history updated successfully', history });
  } catch (error) {
    res.status(500).json({ message: 'Error updating medical history', error: error.message });
  }
});

// GET /api/elder-profile/:id/medical-history
router.get('/:id/medical-history', authMiddleware, async (req, res) => {
  try {
    const history = await MedicalHistory.findOne({ elderProfileId: req.params.id });
    if (!history) {
      return res.json({
        elderProfileId: req.params.id,
        conditions: [],
        medications: [],
        allergies: [],
        bloodGroup: 'Unknown',
        doctorName: '',
        doctorContact: '',
        pastSurgeries: [],
        documentsUploaded: []
      });
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching medical history', error: error.message });
  }
});

// POST /api/elder-profile/:id/connect-google-fit - Link Google Fit / Fitness band
router.post('/:id/connect-google-fit', authMiddleware, async (req, res) => {
  try {
    const { authCode, mockToken } = req.body;
    const elder = await ElderProfile.findById(req.params.id);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    // Store Google Fit OAuth access/refresh token
    const tokenToStore = mockToken || `mock_google_fit_token_${Date.now()}`;
    elder.googleFitAuthToken = tokenToStore;
    await elder.save();

    res.json({
      message: 'Fitness band (Google Fit / HealthKit) linked successfully!',
      elderId: elder._id,
      googleFitConnected: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Error connecting Google Fit', error: error.message });
  }
});

// DELETE /api/elder-profile/:id - Remove elder profile and clean up associated records
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const elder = await ElderProfile.findById(req.params.id);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    const VitalsHistory = require('../models/VitalsHistory');
    const AlertLog = require('../models/AlertLog');

    await Promise.all([
      ElderProfile.findByIdAndDelete(req.params.id),
      MedicalHistory.deleteMany({ elderProfileId: req.params.id }),
      VitalsHistory.deleteMany({ elderProfileId: req.params.id }),
      AlertLog.deleteMany({ elderProfileId: req.params.id })
    ]);

    res.json({ message: 'Elder profile and all associated records deleted successfully', deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting elder profile', error: error.message });
  }
});

module.exports = router;
