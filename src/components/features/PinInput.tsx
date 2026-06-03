import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  title: string;
  error?: string | null;
}

export function PinInput({ length = 6, onComplete, title, error }: PinInputProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');

  const handleDigit = useCallback(
    (digit: string) => {
      const newPin = pin + digit;
      if (newPin.length <= length) {
        setPin(newPin);
        if (newPin.length === length) {
          onComplete(newPin);
        }
      }
    },
    [pin, length, onComplete]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      {/* Pin dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length ? colors.primary : colors.surface,
                borderColor: i < pin.length ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {/* Numpad */}
      <View style={styles.numpad}>
        {digits.map((digit, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.digitButton, digit === '' && styles.emptyButton]}
            onPress={() => {
              if (digit === '⌫') handleDelete();
              else if (digit !== '') handleDigit(digit);
            }}
            disabled={digit === ''}
            accessibilityRole={digit === '⌫' ? 'button' : digit !== '' ? 'button' : undefined}
            accessibilityLabel={digit === '⌫' ? 'Apagar' : digit !== '' ? digit : undefined}
          >
            {digit === '⌫' ? (
              <Text style={[styles.digitText, { color: colors.textSecondary }]}>⌫</Text>
            ) : digit !== '' ? (
              <Text style={[styles.digitText, { color: colors.textPrimary }]}>{digit}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 20, fontFamily: 'Inter-SemiBold', marginBottom: 32, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  error: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 8 },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 48,
    maxWidth: 300,
  },
  digitButton: {
    width: 72,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyButton: { opacity: 0 },
  digitText: { fontSize: 24, fontFamily: 'Inter-Regular' },
});
