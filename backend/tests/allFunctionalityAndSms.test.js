const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { sendSMS, makeIVRCall, sendPushNotification } = require('../services/notification');

jest.setTimeout(60000);

let mongoServer;
let app;
let familyToken;
let volunteerToken;
let adminToken;
let elderId;
let alertLogId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_SECRET = 'test_jwt_secret_all_func_123';
  process.env.NODE_ENV = 'test';

  app = require('../server');

  // Seed demo data
  await request(app).post('/api/auth/seed-demo');

  // Login Family User
  const familyRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'demo@carepulse.com', password: 'password123' });
  familyToken = familyRes.body.token;

  // Login Volunteer User
  const volRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'volunteer@carepulse.com', password: 'password123' });
  volunteerToken = volRes.body.token;

  // Login Admin User
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@carepulse.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const ElderProfile = require('../models/ElderProfile');
  const elder = await ElderProfile.findOne({ name: 'Savitri Devi' });
  elderId = elder ? elder._id.toString() : '';
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('CircleBack Platform - Comprehensive Functionality & SMS/Alert Tests', () => {

  describe('1. SMS & Voice Call Notification Services', () => {
    test('sendSMS returns successful simulation in test environment', async () => {
      const smsRes = await sendSMS('+918600475388', 'Test SMS Message from CircleBack Platform');
      expect(smsRes).toHaveProperty('success', true);
      expect(smsRes).toHaveProperty('simulated', true);
    });

    test('makeIVRCall returns successful simulation in test environment', async () => {
      const ivrRes = await makeIVRCall('+918600475388', 'CircleBack Emergency IVR Check-in script.');
      expect(ivrRes).toHaveProperty('success', true);
    });

    test('sendPushNotification returns successful simulation status', async () => {
      const pushRes = await sendPushNotification('demo_device_token', 'Health Alert', 'Test Body');
      expect(pushRes).toHaveProperty('success', true);
    });
  });

  describe('2. Authentication & User Profile Endpoints', () => {
    test('POST /api/auth/signup creates a new user and returns JWT token', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test Relative',
          email: 'testrelative@carepulse.com',
          phone: '+919988776655',
          password: 'Password@123',
          role: 'family'
        });
      expect(signupRes.statusCode).toEqual(201);
      expect(signupRes.body).toHaveProperty('token');
      expect(signupRes.body.user).toHaveProperty('email', 'testrelative@carepulse.com');
    });

    test('GET /api/auth/me returns current logged in user details', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${familyToken}`);
      expect(meRes.statusCode).toEqual(200);
      expect(meRes.body).toHaveProperty('email', 'demo@carepulse.com');
    });
  });

  describe('3. Elder Profile & Medical History Operations', () => {
    let newElderId;

    test('POST /api/elder-profile creates a new elder profile with emergency contacts', async () => {
      const createRes = await request(app)
        .post('/api/elder-profile')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          name: 'Ramesh Kumar',
          age: 78,
          gender: 'male',
          address: 'Block B, Green Park, New Delhi',
          emergencyContacts: [
            { name: 'Test Son', relation: 'Son', phone: '+918600475388' }
          ]
        });
      expect(createRes.statusCode).toEqual(201);
      expect(createRes.body.elder).toHaveProperty('name', 'Ramesh Kumar');
      newElderId = createRes.body.elder._id;
    });

    test('GET /api/elder-profile lists elder profiles', async () => {
      const listRes = await request(app)
        .get('/api/elder-profile')
        .set('Authorization', `Bearer ${familyToken}`);
      expect(listRes.statusCode).toEqual(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThan(0);
    });

    test('POST /api/elder-profile/:id/medical-history updates medical details', async () => {
      const medRes = await request(app)
        .post(`/api/elder-profile/${newElderId}/medical-history`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          conditions: ['Hypertension', 'Diabetes'],
          allergies: ['Dust'],
          bloodGroup: 'A+',
          doctorName: 'Dr. Sharma',
          doctorContact: '+919876543210'
        });
      expect(medRes.statusCode).toEqual(200);
      expect(medRes.body.history).toHaveProperty('bloodGroup', 'A+');
    });

    test('POST /api/elder-profile/:id/connect-google-fit links fitness wearable', async () => {
      const fitRes = await request(app)
        .post(`/api/elder-profile/${newElderId}/connect-google-fit`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ mockToken: 'fit_token_test_123' });
      expect(fitRes.statusCode).toEqual(200);
      expect(fitRes.body).toHaveProperty('googleFitConnected', true);
    });
  });

  describe('4. Emergency Alerts, Manual SOS & Twilio IVR Workflow', () => {
    test('POST /api/alerts/manual-sos triggers manual emergency escalation and creates AlertLog', async () => {
      const sosRes = await request(app)
        .post('/api/alerts/manual-sos')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          elderId,
          notes: 'Panic button pressed on mobile app'
        });
      expect(sosRes.statusCode).toEqual(201);
      expect(sosRes.body).toHaveProperty('alertLog');
      expect(sosRes.body.alertLog.triggerType).toEqual('manual_sos');
      alertLogId = sosRes.body.alertLog._id;
    });

    test('POST /api/alerts (alias) triggers manual emergency escalation', async () => {
      const sosAliasRes = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          elderId,
          message: 'Elder dashboard emergency button pressed'
        });
      expect(sosAliasRes.statusCode).toEqual(201);
      expect(sosAliasRes.body).toHaveProperty('alertLog');
    });

    test('GET /api/alerts/elder/:elderId fetches alert history', async () => {
      const historyRes = await request(app)
        .get(`/api/alerts/elder/${elderId}`)
        .set('Authorization', `Bearer ${familyToken}`);
      expect(historyRes.statusCode).toEqual(200);
      expect(Array.isArray(historyRes.body)).toBe(true);
      expect(historyRes.body.length).toBeGreaterThan(0);
    });

    test('GET /api/alerts/active lists active pending alerts', async () => {
      const activeRes = await request(app)
        .get('/api/alerts/active')
        .set('Authorization', `Bearer ${familyToken}`);
      expect(activeRes.statusCode).toEqual(200);
      expect(Array.isArray(activeRes.body)).toBe(true);
    });

    test('POST /api/alerts/twilio-ivr-callback handles elder pressing 1 (confirming safe status)', async () => {
      const ivrCallbackRes = await request(app)
        .post('/api/alerts/twilio-ivr-callback')
        .send({
          Digits: '1',
          alertId: alertLogId,
          elderId
        });
      expect(ivrCallbackRes.statusCode).toEqual(200);
      expect(ivrCallbackRes.text).toContain('<Response>');
      expect(ivrCallbackRes.text).toContain('safe status has been recorded');
    });

    test('PATCH /api/alerts/:alertId/resolve marks alert resolved by responder', async () => {
      const resolveRes = await request(app)
        .patch(`/api/alerts/${alertLogId}/resolve`)
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ note: 'Elder confirmed safe via phone check' });
      expect(resolveRes.statusCode).toEqual(200);
      expect(resolveRes.body.alertLog.finalStatus).toEqual('resolved_by_family');
    });
  });

  describe('5. Community Volunteers & Geospatial Searching', () => {
    test('GET /api/volunteers/me fetches volunteer details', async () => {
      const volMeRes = await request(app)
        .get('/api/volunteers/me')
        .set('Authorization', `Bearer ${volunteerToken}`);
      expect(volMeRes.statusCode).toEqual(200);
      expect(volMeRes.body).toHaveProperty('verified', true);
    });

    test('GET /api/volunteers/nearby performs $near 5km geospatial search', async () => {
      const nearRes = await request(app)
        .get('/api/volunteers/nearby?lat=28.6139&lng=77.2090&radius=5')
        .set('Authorization', `Bearer ${familyToken}`);
      expect(nearRes.statusCode).toEqual(200);
      expect(Array.isArray(nearRes.body)).toBe(true);
    });

    test('PATCH /api/volunteers/:id/availability updates volunteer availability status', async () => {
      const statusRes = await request(app)
        .patch('/api/volunteers/any_id/availability')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ availabilityStatus: 'available' });
      expect(statusRes.statusCode).toEqual(200);
      expect(statusRes.body.volunteer).toHaveProperty('availabilityStatus', 'available');
    });
  });

  describe('6. Billing & Subscription Upgrade Operations', () => {
    test('GET /api/subscription/current returns current subscription tier', async () => {
      const subRes = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${familyToken}`);
      expect(subRes.statusCode).toEqual(200);
      expect(subRes.body).toHaveProperty('tier');
    });

    test('POST /api/subscription/create-order creates Razorpay payment order', async () => {
      const orderRes = await request(app)
        .post('/api/subscription/create-order')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ tier: 'complete_care' });
      expect(orderRes.statusCode).toEqual(200);
      expect(orderRes.body).toHaveProperty('orderId');
      expect(orderRes.body.amount).toEqual(99900); // 999 INR in paisa
    });

    test('POST /api/subscription/verify-payment upgrades subscription tier', async () => {
      const verifyRes = await request(app)
        .post('/api/subscription/verify-payment')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_123',
          tier: 'complete_care'
        });
      expect(verifyRes.statusCode).toEqual(200);
      expect(verifyRes.body.user).toHaveProperty('subscriptionTier', 'complete_care');
    });
  });

  describe('7. API Health Endpoint', () => {
    test('GET /api/health returns online status', async () => {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.statusCode).toEqual(200);
      expect(healthRes.body).toHaveProperty('status', 'online');
    });
  });
});
