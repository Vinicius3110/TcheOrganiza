import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6366F1',
      surfaceElevated: '#1C2333',
      danger: '#EF4444',
      textPrimary: '#E6EDF3',
      textTertiary: '#6E7681',
      border: '#30363D',
    },
    isDark: true,
  }),
}));

describe('Button', () => {
  it('renders title text', () => {
    const { getByText } = render(<Button title="Entrar" onPress={jest.fn()} />);
    expect(getByText('Entrar')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPress} />);
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    render(<Button title="Loading" onPress={onPress} loading />);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders danger variant with text', () => {
    const { getByText } = render(<Button title="Delete" onPress={jest.fn()} variant="danger" />);
    expect(getByText('Delete')).toBeTruthy();
  });

  it('renders ghost variant with text', () => {
    const { getByText } = render(<Button title="Ghost" onPress={jest.fn()} variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });
});
