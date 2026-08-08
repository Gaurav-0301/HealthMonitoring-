const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'idproof-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST /api/volunteers/register - Register as volunteer with ID proof
router.post('/register', authMiddleware, upload.single('idProof'), async (req, res) => {
  try {
    const { address, lat, lng } = req.body;
    const userId = req.user.id;

    let volunteer = await Volunteer.findOne({ userId });
    const idProofUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const longitude = Number(lng) || 77.2090;
    const latitude = Number(lat) || 28.6139;

    if (volunteer) {
      volunteer.address = address || volunteer.address;
      volunteer.geoLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
      if (idProofUrl) volunteer.idProofUrl = idProofUrl;
      await volunteer.save();
    } else {
      volunteer = await Volunteer.create({
        userId,
        address: address || 'Community Center',
        geoLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        idProofUrl,
        verified: false,
        availabilityStatus: 'available'
      });
    }

    // Update User role to volunteer
    await User.findByIdAndUpdate(userId, { role: 'volunteer' });

    res.status(201).json({
      message: 'Volunteer registration submitted. Pending admin verification.',
      volunteer
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering volunteer', error: error.message });
  }
});

// GET /api/volunteers/me - Get current volunteer profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user.id }).populate('userId', 'name email phone');
    if (!volunteer) return res.status(404).json({ message: 'Volunteer profile not found' });
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching volunteer profile', error: error.message });
  }
});

// GET /api/volunteers/my-connected-elders - List elders who have added this volunteer as neighbor / contact
router.get('/my-connected-elders', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const Volunteer = require('../models/Volunteer');
    const ElderProfile = require('../models/ElderProfile');
    const MedicalHistory = require('../models/MedicalHistory');

    const cleanUserPhone = user?.phone ? String(user.phone).replace(/[\s\-\(\)\+]/g, '') : '';
    const last10Digits = cleanUserPhone.length >= 10 ? cleanUserPhone.slice(-10) : cleanUserPhone;

    // Search elders by contact phone match OR general assigned elders
    let elders = await ElderProfile.find({
      $or: [
        { 'emergencyContacts.phone': { $regex: last10Digits, $options: 'i' } },
        { status: { $in: ['active', 'alert_triggered', 'resolved'] } }
      ]
    }).lean();

    // Populate medical history for each elder
    for (let elder of elders) {
      const medHistory = await MedicalHistory.findOne({ elderProfileId: elder._id }).lean();
      elder.medicalHistory = medHistory || { conditions: [], medications: [], allergies: [], bloodGroup: 'Unknown' };
    }

    res.json(elders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching connected elders', error: error.message });
  }
});

// GET /api/volunteers/nearby - Geospatial search using $near
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const latitude = parseFloat(lat) || 28.6139;
    const longitude = parseFloat(lng) || 77.2090;
    const maxDistanceMeters = (parseFloat(radius) || 5) * 1000; // default 5km

    const volunteers = await Volunteer.find({
      verified: true,
      availabilityStatus: 'available',
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: maxDistanceMeters
        }
      }
    }).populate('userId', 'name email phone');

    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ message: 'Error searching nearby volunteers', error: error.message });
  }
});

// GET /api/volunteers/pending - List unverified volunteers for admin
router.get('/pending', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const pending = await Volunteer.find({ verified: false }).populate('userId', 'name email phone');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending volunteers', error: error.message });
  }
});

// PATCH /api/volunteers/:id/verify - Admin approves volunteer
router.patch('/:id/verify', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) return res.status(404).json({ message: 'Volunteer not found' });

    volunteer.verified = true;
    await volunteer.save();

    res.json({ message: 'Volunteer verified successfully', volunteer });
  } catch (error) {
    res.status(500).json({ message: 'Error approving volunteer', error: error.message });
  }
});

// PATCH /api/volunteers/:id/availability - Toggle availabilityStatus
router.patch('/:id/availability', authMiddleware, async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
      return res.status(400).json({ message: 'Invalid availability status' });
    }

    const volunteer = await Volunteer.findOne({ userId: req.user.id });
    if (!volunteer) return res.status(404).json({ message: 'Volunteer profile not found' });

    volunteer.availabilityStatus = availabilityStatus;
    await volunteer.save();

    res.json({ message: `Availability status updated to ${availabilityStatus}`, volunteer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating availability', error: error.message });
  }
});

module.exports = router;
