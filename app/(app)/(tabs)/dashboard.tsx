import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useAccounts } from '../../../src/hooks/useAccounts';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { BalanceCard } from '../../../src/components/features/BalanceCard';
import { AccountCarousel } from '../../../src/components/features/AccountCarousel';
import { TransactionRow } from '../../../src/components/features/TransactionRow';
import { Button } from '../../../src/components/ui/Button';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { SpendingChart } from '../../../src/components/features/SpendingChart';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { data: transactions, isLoading: txsLoading, refetch: refetchTxs } = useTransactions({ limit: 5 });

  const totalBalance = useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const isRefreshing = accountsLoading || txsLoading;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => { refetchAccounts(); refetchTxs(); }} tintColor={colors.primary} />
      }
    >
      <BalanceCard totalBalance={totalBalance} isLoading={accountsLoading} />

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Suas Contas</Text>
      <AccountCarousel accounts={accounts ?? []} isLoading={accountsLoading} />

      {/* Spending Charts */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Análise de Gastos</Text>
      <SpendingChart />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 0 }]}>Transações Recentes</Text>
        <Button title="Ver todas" variant="ghost" size="sm" onPress={() => router.push('/(app)/(tabs)/transactions')} />
      </View>

      {txsLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={180} height={16} />
                <Skeleton width={100} height={12} />
              </View>
              <Skeleton width={80} height={16} />
            </View>
          ))}
        </View>
      ) : (transactions ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma transação ainda</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Conecte um banco para começar a ver suas transações aqui.
          </Text>
          <Button title="Conectar Banco" onPress={() => router.push('/connect-bank')} style={{ marginTop: 16 }} />
        </View>
      ) : (
        (transactions ?? []).map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', paddingHorizontal: 24, marginTop: 24, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12, marginTop: 24 },
  skeletonList: { paddingHorizontal: 24, gap: 12, marginTop: 12 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 20 },
});
