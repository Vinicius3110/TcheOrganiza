import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AmountDisplay } from './AmountDisplay';
import { useTheme } from '../../theme/ThemeProvider';

interface BalanceCardProps {
  totalBalance: number;
  isLoading: boolean;
  monthChange?: number;
}

export function BalanceCard({ totalBalance, isLoading, monthChange }: BalanceCardProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Skeleton height={16} width={120} />
        <Skeleton height={44} width={200} style={{ marginTop: 8 }} />
        <Skeleton height={14} width={80} style={{ marginTop: 8 }} />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Saldo Total</Text>
      <AmountDisplay amount={totalBalance} size="lg" />
      {monthChange !== undefined && (
        <View style={styles.trendRow}>
          <Text style={[styles.trendText, { color: monthChange >= 0 ? colors.success : colors.danger }]}>
            {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(1)}%
          </Text>
          <Text style={[styles.trendLabel, { color: colors.textTertiary }]}> vs. mês anterior</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  label: { fontSize: 14, fontFamily: 'Inter-Regular' },
  trendRow: { flexDirection: 'row', marginTop: 8 },
  trendText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  trendLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
