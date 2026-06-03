import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatRelativeDate } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';
import type { Transaction } from '../../types/models';

interface TransactionRowProps {
  transaction: Transaction;
  categoryName?: string;
  categoryIcon?: string;
}

export function TransactionRow({ transaction, categoryName, categoryIcon }: TransactionRowProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const isPositive = transaction.amount >= 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.divider }]}
      onPress={() => router.push(`/transaction/${transaction.id}`)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.merchantName ?? transaction.description}, ${formatCurrency(transaction.amount)}`}
    >
      <View style={[styles.icon, { backgroundColor: isPositive ? colors.successBg : colors.dangerBg }]}>
        <Text style={styles.iconText}>{categoryIcon ?? (isPositive ? '💰' : '💸')}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.textPrimary }]} numberOfLines={1}>
          {transaction.merchantName ?? transaction.description}
        </Text>
        {categoryName && (
          <Text style={[styles.category, { color: colors.textSecondary }]}>{categoryName}</Text>
        )}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatRelativeDate(transaction.date)}
        </Text>
      </View>

      <Text style={[styles.amount, { color: isPositive ? colors.success : colors.danger }]}>
        {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  description: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  category: { fontSize: 13, fontFamily: 'Inter-Regular' },
  date: { fontSize: 12, fontFamily: 'Inter-Regular' },
  amount: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
