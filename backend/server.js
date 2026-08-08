const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const elderProfileRoutes = require('./routes/elderProfile');
const vitalsRoutes = require('./routes/vitals');
const alertsRoutes = require('./routes/alerts');
const volunteerRoutes = require('./routes/volunteers');
const subscriptionRoutes = require('./routes/subscription');
const { initVitalsSyncCron } = require('./jobs/vitalsSyncJob');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/elder-profile', elderProfileRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'CircleBack Elderly Health Monitoring Platform',
    timestamp: new Date()
  });
});

// Port & DB connection configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/circleback';

const connectDatabase = async () => {
  try {
    // Attempt standard MongoDB connection first with 3s timeout
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[MongoDB] Connected to local database at ${MONGODB_URI}`);
  } catch (err) {
    console.warn(`[MongoDB] Local connection to ${MONGODB_URI} failed. Launching MongoMemoryServer in-memory fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`[MongoDB] Connected successfully to in-memory database at ${mongoUri}`);
    } catch (memErr) {
      console.error('[MongoDB Critical Error] Failed to start in-memory database:', memErr.message);
    }
  }
};

connectDatabase().then(async () => {
  // Auto seed demo data if database is empty
  try {
    const axios = require('axios');
    // Seed internally via direct function call or model check
    const User = require('./models/User');
    const existing = await User.findOne({ email: 'demo@carepulse.com' });
    if (!existing) {
      console.log('[Auto-Seed] Seeding demo accounts (Family, Volunteer, Admin) and elder Savitri Devi...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);

      const familyUser = await User.create({
        name: 'Rajesh Sharma (Family)',
        email: 'demo@carepulse.com',
        phone: '+91 98765 43210',
        passwordHash,
        role: 'family',
        subscriptionTier: 'family_care',
        subscriptionStatus: 'active'
      });

      const Subscription = require('./models/Subscription');
      await Subscription.create({ userId: familyUser._id, tier: 'family_care', paymentStatus: 'active' });

      const volunteerUser = await User.create({
        name: 'Amit Patel (Volunteer)',
        email: 'volunteer@carepulse.com',
        phone: '+91 98111 22334',
        passwordHash,
        role: 'volunteer',
        subscriptionTier: 'free',
        subscriptionStatus: 'active'
      });

      const Volunteer = require('./models/Volunteer');
      await Volunteer.create({
        userId: volunteerUser._id,
        address: 'Sector 14, Vasant Kunj, New Delhi',
        geoLocation: { type: 'Point', coordinates: [77.2090, 28.6139] },
        idProofUrl: '/uploads/demo-id.pdf',
        verified: true,
        availabilityStatus: 'available'
      });

      const ElderProfile = require('./models/ElderProfile');
      const MedicalHistory = require('./models/MedicalHistory');
      const VitalsHistory = require('./models/VitalsHistory');

      const elder = await ElderProfile.create({
        linkedFamilyUserId: familyUser._id,
        name: 'Savitri Devi',
        age: 74,
        gender: 'female',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        address: 'Flat 402, Sunshine Apartments, Vasant Kunj, New Delhi',
        landmark: 'Opposite Community Park',
        geoLocation: { lat: 28.6139, lng: 77.2090 },
        emergencyContacts: [
          { name: 'Rajesh Sharma', relation: 'Son', phone: '+91 98765 43210' },
          { name: 'Priya Sharma', relation: 'Daughter-in-law', phone: '+91 98123 45678' }
        ],
        googleFitAuthToken: 'mock_google_fit_token_savitri_devi',
        baselineHeartRateMin: 65,
        baselineHeartRateMax: 95,
        calibrationComplete: true,
        status: 'active'
      });

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

      const now = Date.now();
      await VitalsHistory.insertMany([
        { elderProfileId: elder._id, heartRate: 72, steps: 140, source: 'google_fit', timestamp: new Date(now - 45 * 60000) },
        { elderProfileId: elder._id, heartRate: 75, steps: 90, source: 'google_fit', timestamp: new Date(now - 30 * 60000) },
        { elderProfileId: elder._id, heartRate: 70, steps: 40, source: 'google_fit', timestamp: new Date(now - 15 * 60000) }
      ]);
      console.log('[Auto-Seed] Demo accounts & elder Savitri Devi successfully created!');
    }
  } catch (seedErr) {
    console.error('[Auto-Seed Error]', seedErr.message);
  }

  // Start scheduled cron job
  initVitalsSyncCron();

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 CircleBack Backend Server listening on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`==================================================\n`);
  });
});

module.exports = app;
