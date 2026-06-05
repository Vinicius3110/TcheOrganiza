import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PinInput } from '../PinInput';

jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6366F1',
      surface: '#161B22',
      border: '#30363D',
      textPrimary: '#E6EDF3',
      textSecondary: '#8B949E',
      danger: '#EF4444',
    },
  }),
}));

describe('PinInput', () => {
  it('renders title text', () => {
    const { getByText } = render(<PinInput title="Digite seu PIN" onComplete={jest.fn()} />);
    expect(getByText('Digite seu PIN')).toBeTruthy();
  });

  it('calls onComplete when 6 digits are entered', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<PinInput title="PIN" onComplete={onComplete} />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));
    fireEvent.press(getByText('4'));
    fireEvent.press(getByText('5'));
    fireEvent.press(getByText('6'));

    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not call onComplete with fewer than 6 digits', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<PinInput title="PIN" onComplete={onComplete} />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('deletes last digit when backspace is pressed', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<PinInput title="PIN" onComplete={onComplete} />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('⌫'));
    fireEvent.press(getByText('3'));
    fireEvent.press(getByText('4'));
    fireEvent.press(getByText('5'));
    fireEvent.press(getByText('6'));
    fireEvent.press(getByText('7'));

    expect(onComplete).toHaveBeenCalledWith('134567');
  });

  it('shows error text when provided', () => {
    const { getByText } = render(
      <PinInput title="PIN" onComplete={jest.fn()} error="PIN incorreto" />
    );
    expect(getByText('PIN incorreto')).toBeTruthy();
  });
});
