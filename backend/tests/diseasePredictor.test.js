const { predictHealthRisks } = require('../services/diseasePredictor');

describe('ML Disease Risk Predictor Service Unit Tests', () => {
  test('formats canonical 9-sensor vitals payload correctly and returns risk probabilities', async () => {
    const rawVitals = {
      heartRate: 78,
      restingHeartRate: 62,
      heartRateSd: 7,
      spo2Avg: 97,
      spo2Min: 95,
      skinTemp: 33.8,
      stepsToday: 4200,
      sleepHours: 6.5,
      sleepEfficiency: 85
    };

    const result = await predictHealthRisks(rawVitals);

    expect(result).toHaveProperty('risks');
    expect(result.risks).toHaveProperty('cardiac_risk');
    expect(result.risks).toHaveProperty('respiratory_risk');
    expect(result.risks).toHaveProperty('fever_infection_risk');
    expect(result.risks).toHaveProperty('stress_fatigue_risk');
    expect(result.risks).toHaveProperty('metabolic_lifestyle_risk');

    expect(typeof result.risks.cardiac_risk).toBe('number');
    expect(typeof result.risks.respiratory_risk).toBe('number');
    expect(typeof result.risks.fever_infection_risk).toBe('number');
    expect(typeof result.risks.stress_fatigue_risk).toBe('number');
    expect(typeof result.risks.metabolic_lifestyle_risk).toBe('number');

    expect(Array.isArray(result.flagged)).toBe(true);
    expect(typeof result.disclaimer).toBe('string');
  });

  test('correctly triggers cardiac risk spike on high heart rate (120 BPM)', async () => {
    const rawVitals = {
      heartRate: 120,
      restingHeartRate: 98,
      heartRateSd: 18,
      spo2Avg: 97,
      spo2Min: 95,
      skinTemp: 33.8,
      stepsToday: 4200,
      sleepHours: 6.5,
      sleepEfficiency: 85
    };

    const result = await predictHealthRisks(rawVitals);
    expect(result.risks.cardiac_risk).toBeGreaterThan(0.70);
  });

  test('correctly triggers respiratory risk spike on low SpO2 (88%)', async () => {
    const rawVitals = {
      heartRate: 75,
      restingHeartRate: 65,
      heartRateSd: 6,
      spo2Avg: 88,
      spo2Min: 85,
      skinTemp: 33.8,
      stepsToday: 4200,
      sleepHours: 6.5,
      sleepEfficiency: 85
    };

    const result = await predictHealthRisks(rawVitals);
    expect(result.risks.respiratory_risk).toBeGreaterThan(0.70);
  });

  test('correctly triggers fever/infection risk spike on elevated skin temp (37.5°C)', async () => {
    const rawVitals = {
      heartRate: 102,
      restingHeartRate: 85,
      heartRateSd: 8,
      spo2Avg: 96,
      spo2Min: 94,
      skinTemp: 37.5,
      stepsToday: 1200,
      sleepHours: 5.0,
      sleepEfficiency: 70
    };

    const result = await predictHealthRisks(rawVitals);
    expect(result.risks.fever_infection_risk).toBeGreaterThan(0.70);
  });
});
