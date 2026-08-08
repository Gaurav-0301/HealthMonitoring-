const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000);

let mongoServer;
let app;
let jwtToken;
let elderId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_SECRET = 'test_jwt_secret_123';

  // Import app after env vars set
  app = require('../server');

  // Seed demo accounts
  const seedRes = await request(app).post('/api/auth/seed-demo');
  const ElderProfile = require('../models/ElderProfile');
  const elder = await ElderProfile.findOne({ name: 'Savitri Devi' });
  elderId = seedRes.body?.elder?._id || elder?._id;

  // Login as demo family member
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'demo@carepulse.com', password: 'password123' });

  jwtToken = loginRes.body.token;
}, 300000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Vitals API & Checkup Summary Endpoints', () => {
  test('POST /api/vitals/:elderId/mock-simulate with custom 9-sensor inputs logs vitals and predicts risks', async () => {
    const res = await request(app)
      .post(`/api/vitals/${elderId}/mock-simulate`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        heartRate: 115,
        restingHeartRate: 92,
        heartRateSd: 16,
        spo2Avg: 97,
        spo2Min: 95,
        skinTemp: 33.8,
        stepsToday: 5200,
        sleepHours: 7.0,
        sleepEfficiency: 85
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('insertedReadings');
    expect(res.body.insertedReadings[0].cardiacRisk).toBeGreaterThan(0.70);
  });

  test('GET /api/vitals/:elderId/checkup-summary aggregates elder profile, medical history, vitals, and flags spiked risks (>= 0.70)', async () => {
    const res = await request(app)
      .get(`/api/vitals/${elderId}/checkup-summary`)
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('elderProfile');
    expect(res.body).toHaveProperty('medicalHistory');
    expect(res.body).toHaveProperty('checkupSuggested', true);
    expect(res.body.spikedRisks.length).toBeGreaterThan(0);
    expect(res.body.spikedRisks[0].category).toEqual('Cardiac Risk');
  });
});
