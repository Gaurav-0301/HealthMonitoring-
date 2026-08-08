import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VitalsControlRoom from '../pages/VitalsControlRoom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

// Mock ResizeObserver for Recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
    api.get.mockImplementation((url) => {
      if (url === '/elder-profile') {
        return Promise.resolve({ data: mockElders });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <VitalsControlRoom />
        </AuthContext.Provider>
      );
    });

    await waitFor(() => {
      // 1. Check title & headers
      expect(screen.getByText(/Vitals Control Room & Active Emergency Trigger Simulator/i)).toBeInTheDocument();

      // 2. Check Radio Chip Monitored Elder Selection
      expect(screen.getAllByText(/Savitri Devi/i).length).toBeGreaterThan(0);

      // 3. Check Radio Cards for Scenarios
      expect(screen.getByText(/Healthy Baseline/i)).toBeInTheDocument();
      expect(screen.getByText(/Cardiac Risk Pattern/i)).toBeInTheDocument();
      expect(screen.getByText(/Respiratory Risk/i)).toBeInTheDocument();

      // 4. Check 9 Sensor Sliders presence
      expect(screen.getAllByText(/Instant/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Resting/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Variability/i)).toBeInTheDocument();
      expect(screen.getAllByText(/SpO2/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Skin Temperature/i)).toBeInTheDocument();
      expect(screen.getByText(/Steps Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Sleep Duration/i)).toBeInTheDocument();
      expect(screen.getByText(/Sleep Efficiency/i)).toBeInTheDocument();
    });
  });
});
