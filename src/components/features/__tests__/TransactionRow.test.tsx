import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionRow } from '../TransactionRow';
import type { Transaction } from '../../../types/models';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6366F1',
      surface: '#161B22',
      border: '#30363D',
      textPrimary: '#E6EDF3',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      success: '#22C55E',
      successBg: 'rgba(34, 197, 94, 0.15)',
      danger: '#EF4444',
      dangerBg: 'rgba(239, 68, 68, 0.15)',
      divider: '#21262D',
    },
  }),
}));

const mockTx: Transaction = {
  id: 'tx-001',
  accountId: 'acc-1',
  userId: 'user-1',
  externalId: 'ext-1',
  amount: -45.90,
  description: 'Pagamento restaurante',
  merchantName: 'Restaurante do João',
  merchantCnpj: null,
  categoryId: 'cat-food',
  userCategoryId: null,
  date: '2026-06-03',
  type: 'DEBIT',
  status: 'posted',
  metadata: {},
  createdAt: '2026-06-03T12:00:00Z',
};

describe('TransactionRow', () => {
  it('renders merchant name', () => {
    const { getByText } = render(<TransactionRow transaction={mockTx} />);
    expect(getByText('Restaurante do João')).toBeTruthy();
  });

  it('falls back to description when no merchant name', () => {
    const descTx = { ...mockTx, merchantName: null, description: 'Compra online' };
    const { getByText } = render(<TransactionRow transaction={descTx} />);
    expect(getByText('Compra online')).toBeTruthy();
  });

  it('shows category name when provided', () => {
    const { getByText } = render(
      <TransactionRow transaction={mockTx} categoryName="Alimentação" categoryIcon="🍔" />
    );
    expect(getByText('Alimentação')).toBeTruthy();
  });

  it('shows plus sign for income transactions', () => {
    const incomeTx = { ...mockTx, amount: 1000.00 };
    const { getByText } = render(<TransactionRow transaction={incomeTx} />);
    const el = getByText(/\+/);
    expect(el).toBeTruthy();
  });

  it('shows relative date "Hoje" for today', () => {
    const today = new Date().toISOString();
    const todayTx = { ...mockTx, date: today };
    const { getByText } = render(<TransactionRow transaction={todayTx} />);
    expect(getByText('Hoje')).toBeTruthy();
  });
});
