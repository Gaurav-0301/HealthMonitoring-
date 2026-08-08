const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = ['family', 'volunteer', 'admin', 'elder'].includes(role) ? role : 'family';

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: userRole,
      subscriptionTier: 'free',
      subscriptionStatus: 'active'
    });

    // Create default Subscription entry
    await Subscription.create({
      userId: newUser._id,
      tier: 'free',
      paymentStatus: 'active'
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, subscriptionTier: newUser.subscriptionTier },
      process.env.JWT_SECRET || 'circleback_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        subscriptionTier: newUser.subscriptionTier
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error signing up', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, subscriptionTier: user.subscriptionTier },
      process.env.JWT_SECRET || 'circleback_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// POST /api/auth/seed-demo - Seed pre-configured demo data
router.post('/seed-demo', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Demo Family User
    let familyUser = await User.findOne({ email: 'demo@carepulse.com' });
    if (!familyUser) {
      familyUser = await User.create({
        name: 'Rajesh Sharma (Family)',
        email: 'demo@carepulse.com',
        phone: '+918600475388',
        passwordHash,
        role: 'family',
        subscriptionTier: 'family_care',
        subscriptionStatus: 'active'
      });
      await Subscription.create({
        userId: familyUser._id,
        tier: 'family_care',
        paymentStatus: 'active'
      });
    } else {
      familyUser.phone = '+918600475388';
      await familyUser.save();
    }

    // 2. Demo Volunteer User & Volunteer Profile
    let volunteerUser = await User.findOne({ email: 'volunteer@carepulse.com' });
    if (!volunteerUser) {
      volunteerUser = await User.create({
        name: 'Amit Patel (Volunteer)',
        email: 'volunteer@carepulse.com',
        phone: '+918600475388',
        passwordHash,
        role: 'volunteer',
        subscriptionTier: 'free',
        subscriptionStatus: 'active'
      });
      
      const Volunteer = require('../models/Volunteer');
      await Volunteer.create({
        userId: volunteerUser._id,
        address: 'Sector 14, Vasant Kunj, New Delhi',
        geoLocation: {
          type: 'Point',
          coordinates: [77.2090, 28.6139]
        },
        idProofUrl: '/uploads/demo-id.pdf',
        verified: true,
        availabilityStatus: 'available'
      });
    } else {
      volunteerUser.phone = '+918600475388';
      await volunteerUser.save();
    }

    // 3. Demo Admin User
    let adminUser = await User.findOne({ email: 'admin@carepulse.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@carepulse.com',
        phone: '+918600475388',
        passwordHash,
        role: 'admin',
        subscriptionTier: 'complete_care',
        subscriptionStatus: 'active'
      });
    }

    // 4. Demo Elder User Account
    let elderUser = await User.findOne({ email: 'elder@carepulse.com' });
    if (!elderUser) {
      elderUser = await User.create({
        name: 'Savitri Devi (Elder)',
        email: 'elder@carepulse.com',
        phone: '+918600475388',
        passwordHash,
        role: 'elder',
        subscriptionTier: 'family_care',
        subscriptionStatus: 'active'
      });
    }

    // 5. Demo Elder Profile (Savitri Devi)
    const ElderProfile = require('../models/ElderProfile');
    const MedicalHistory = require('../models/MedicalHistory');
    const VitalsHistory = require('../models/VitalsHistory');

    let elder = await ElderProfile.findOne({ linkedFamilyUserId: familyUser._id });
    if (!elder) {
      elder = await ElderProfile.create({
        linkedFamilyUserId: familyUser._id,
        name: 'Savitri Devi',
        age: 74,
        gender: 'female',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        address: 'Flat 402, Sunshine Apartments, Vasant Kunj, New Delhi',
        landmark: 'Opposite Community Park',
        geoLocation: { lat: 28.6139, lng: 77.2090 },
        emergencyContacts: [
          { name: 'Rajesh Sharma', relation: 'Son / Family', phone: '+918600475388' },
          { name: 'Verma Ji (Neighbor)', relation: 'Neighbor', phone: '+918600475388' },
          { name: 'City Hospital Ambulance', relation: 'Ambulance', phone: '+918600475388' },
          { name: 'Dr. Anand Kumar (Cardiologist)', relation: 'Family Doctor', phone: '+918600475388' }
        ],
        googleFitAuthToken: 'mock_google_fit_token_savitri_devi',
        baselineHeartRateMin: 65,
        baselineHeartRateMax: 95,
        calibrationComplete: true,
        status: 'active'
      });
    } else {
      elder.status = 'active';
      await elder.save();
    }

      // Medical History
      await MedicalHistory.create({
        elderProfileId: elder._id,
        conditions: ['Hypertension (High BP)', 'Diabetes Mellitus (Type 2)', 'Arthritis'],
        medications: [
          { name: 'Amlodipine', dosage: '5mg daily morning' },
          { name: 'Metformin', dosage: '500mg after dinner' }
        ],
        allergies: ['Penicillin / Amoxicillin'],
        bloodGroup: 'B+',
        doctorName: 'Dr. Anand Kumar (Cardiologist)',
        doctorContact: '+91 98100 55443'
      });

      // Initial baseline vitals history
      const now = Date.now();
      await VitalsHistory.insertMany([
        { elderProfileId: elder._id, heartRate: 72, steps: 140, source: 'google_fit', timestamp: new Date(now - 45 * 60000) },
        { elderProfileId: elder._id, heartRate: 75, steps: 90, source: 'google_fit', timestamp: new Date(now - 30 * 60000) },
        { elderProfileId: elder._id, heartRate: 70, steps: 40, source: 'google_fit', timestamp: new Date(now - 15 * 60000) }
      ]);
    }

    res.json({
      message: 'CarePulse Demo accounts and Savitri Devi elder profile seeded successfully!',
      credentials: {
        elderUser: { email: 'elder@carepulse.com', password: 'password123' },
        familyUser: { email: 'demo@carepulse.com', password: 'password123' },
        volunteerUser: { email: 'volunteer@carepulse.com', password: 'password123' },
        adminUser: { email: 'admin@carepulse.com', password: 'password123' }
      },
      elder
    });
  } catch (error) {
    res.status(500).json({ message: 'Error seeding demo data', error: error.message });
  }
});

module.exports = router;
