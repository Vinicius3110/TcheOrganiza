import React from 'react';
import { render } from '@testing-library/react-native';
import { BalanceCard } from '../BalanceCard';

jest.mock('../../ui/Card', () => ({
  Card: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('../../ui/Skeleton', () => ({
  Skeleton: ({ height, width }: any) => {
    const { View } = require('react-native');
    return <View testID="skeleton" style={{ height, width }} />;
  },
}));

jest.mock('../AmountDisplay', () => ({
  AmountDisplay: ({ amount }: any) => {
    const { Text } = require('react-native');
    return <Text testID="amount">{String(amount)}</Text>;
  },
}));

jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      surface: '#161B22',
      textPrimary: '#E6EDF3',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      success: '#22C55E',
      danger: '#EF4444',
      border: '#30363D',
    },
  }),
}));

describe('BalanceCard', () => {
  it('renders skeletons when loading', () => {
    const { queryAllByTestId } = render(<BalanceCard totalBalance={1000} isLoading={true} />);
    expect(queryAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders "Saldo Total" label when loaded', () => {
    const { getByText } = render(<BalanceCard totalBalance={5000.75} isLoading={false} />);
    expect(getByText('Saldo Total')).toBeTruthy();
  });

  it('renders amount via AmountDisplay', () => {
    const { getByTestId } = render(<BalanceCard totalBalance={5000.75} isLoading={false} />);
    expect(getByTestId('amount')).toBeTruthy();
  });

  it('shows positive month change with up arrow', () => {
    const { getByText } = render(
      <BalanceCard totalBalance={1000} isLoading={false} monthChange={5.2} />
    );
    expect(getByText(/▲/)).toBeTruthy();
    expect(getByText(/5.2%/)).toBeTruthy();
  });

  it('shows negative month change with down arrow', () => {
    const { getByText } = render(
      <BalanceCard totalBalance={1000} isLoading={false} monthChange={-3.1} />
    );
    expect(getByText(/▼/)).toBeTruthy();
    expect(getByText(/3.1%/)).toBeTruthy();
  });
});
