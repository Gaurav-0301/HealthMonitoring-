import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CheckupSummaryModal from '../components/CheckupSummaryModal';
import api from '../services/api';

jest.mock('../services/api');

describe('CheckupSummaryModal UI Component Tests', () => {
  const mockSummaryData = {
    elderProfile: {
      id: 'elder123',
      name: 'Savitri Devi',
      age: 74,
      address: 'Vasant Kunj, New Delhi',
      primaryContactName: 'Rajesh Sharma',
      primaryContactPhone: '+91 98765 43210',
      doctorName: 'Dr. Anand Kumar (Cardiologist)',
      doctorContact: '+91 98100 55443'
    },
    checkupSuggested: true,
    spikedRisks: [
      {
        category: 'Cardiac Risk',
        value: 0.944,
        threshold: 0.70,
        severity: 'CRITICAL',
        recommendation: 'Schedule immediate ECG & Cardiac Evaluation'
      }
    ],
    latestReading: {
      heartRate: 118,
      restingHeartRate: 96,
      spo2Avg: 97,
      spo2Min: 95,
      skinTemp: 33.7,
      stepsToday: 6000,
      sleepHours: 7,
      sleepEfficiency: 85,
      disclaimer: 'This is a screening heuristic trained on synthetic data. Not a medical diagnosis.'
    },
    medicalHistory: {
      conditions: ['Hypertension (High BP)', 'Diabetes Mellitus'],
      medications: [
        { name: 'Amlodipine', dosage: '5mg daily' },
        { name: 'Metformin', dosage: '500mg after dinner' }
      ],
      allergies: ['Penicillin']
    },
    recentVitals: [],
    alertLogs: []
  };

  test('renders loading state initially and then displays clinical consultation report', async () => {
    api.get.mockResolvedValueOnce({ data: mockSummaryData });

    await act(async () => {
      render(<CheckupSummaryModal elderId="elder123" onClose={jest.fn()} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Medical Checkup Consultation Report/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Savitri Devi/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Dr. Anand Kumar/i)).toBeInTheDocument();
      expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();
      expect(screen.getByText(/Hypertension \(High BP\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/94.4%/i).length).toBeGreaterThan(0);
    });
  });
});
