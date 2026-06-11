import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';

interface AmountDisplayProps {
  amount: number;
  size?: 'lg' | 'md' | 'sm';
}

export function AmountDisplay({ amount, size = 'lg' }: AmountDisplayProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [amount]);

  const fontSize = { lg: 36, md: 24, sm: 18 }[size];
  const color = amount >= 0 ? colors.success : colors.danger;

  return (
    <Animated.Text style={[{ color, fontSize, fontFamily: 'Inter-Bold' }, { opacity: fadeAnim }]}>
      {formatCurrency(amount)}
    </Animated.Text>
  );
}
