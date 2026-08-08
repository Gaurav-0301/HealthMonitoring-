import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VitalsControlRoom from '../pages/VitalsControlRoom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

describe('VitalsControlRoom UI Component Tests', () => {
  const mockAuthContext = {
    user: { id: 'usr1', name: 'Demo Family', role: 'family' },
    login: jest.fn()
  };

  const mockElders = [
    {
      _id: 'elder_1',
      name: 'Savitri Devi',
      age: 74,
      baselineHeartRateMin: 65,
      baselineHeartRateMax: 95
    }
  ];

  test('renders 9-sensor telemetry range sliders and radio button scenario selectors', async () => {
    api.get.mockResolvedValueOnce({ data: mockElders });

    await act(async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <VitalsControlRoom />
        </AuthContext.Provider>
      );
    });

    await waitFor(() => {
      // 1. Check title & headers
      expect(screen.getByText(/Vitals Control Room & Emergency Trigger Simulator/i)).toBeInTheDocument();

      // 2. Check Radio Chip Monitored Elder Selection
      expect(screen.getAllByText(/Savitri Devi/i).length).toBeGreaterThan(0);

      // 3. Check Radio Cards for Scenarios
      expect(screen.getByText(/Healthy Baseline/i)).toBeInTheDocument();
      expect(screen.getByText(/Cardiac Risk Pattern/i)).toBeInTheDocument();
      expect(screen.getByText(/Respiratory Risk/i)).toBeInTheDocument();

      // 4. Check 9 Sensor Sliders presence
      expect(screen.getByText(/1. Heart Rate \(Instant\)/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Resting Heart Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/3. HR SD \(Variability\)/i)).toBeInTheDocument();
      expect(screen.getByText(/4. SpO2 Average/i)).toBeInTheDocument();
      expect(screen.getByText(/5. SpO2 Minimum Drop/i)).toBeInTheDocument();
      expect(screen.getByText(/6. Skin Temperature/i)).toBeInTheDocument();
      expect(screen.getByText(/7. Steps Today/i)).toBeInTheDocument();
      expect(screen.getByText(/8. Sleep Duration/i)).toBeInTheDocument();
      expect(screen.getByText(/9. Sleep Efficiency/i)).toBeInTheDocument();
    });
  });
});
