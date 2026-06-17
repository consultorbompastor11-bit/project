import { vi } from 'vitest';

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock integrations if they exist
vi.mock('../integrations/asaas/asaasApi', () => ({
  asaasApi: {
    fetchPayments: vi.fn(),
    markAsReceivedInCash: vi.fn(),
  },
}));
