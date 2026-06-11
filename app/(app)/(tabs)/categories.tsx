import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useCategories } from '../../../src/hooks/useCategories';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { Card } from '../../../src/components/ui/Card';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { formatCurrency, getEffectiveCategory } from '../../../src/utils/format';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { data: categories, isLoading: catsLoading, refetch: refetchCats } = useCategories();
  const { data: transactions, isLoading: txsLoading, refetch: refetchTxs } = useTransactions();

  const categoryStats = useMemo(() => {
    if (!categories || !transactions) return [];
    return categories
      .map((cat) => {
        const catTransactions = transactions.filter((tx) => getEffectiveCategory(tx) === cat.id && tx.amount < 0);
        const total = catTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        return { ...cat, total, count: catTransactions.length };
      })
      .sort((a, b) => b.total - a.total);
  }, [categories, transactions]);

  const totalSpent = useMemo(() => categoryStats.reduce((sum, cat) => sum + cat.total, 0), [categoryStats]);

  if (catsLoading || txsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={64} style={{ marginBottom: 8 }} />)}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={categoryStats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const percentage = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0;
        return (
          <Card style={styles.categoryCard}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.categoryCount, { color: colors.textTertiary }]}>
                  {item.count} transação{item.count !== 1 ? 'ões' : ''}
                </Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={[styles.categoryAmount, { color: colors.danger }]}>{formatCurrency(-item.total)}</Text>
                <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
                  <View style={[styles.progressFill, { backgroundColor: item.color, width: `${Math.min(percentage, 100)}%` }]} />
                </View>
              </View>
            </View>
          </Card>
        );
      }}
      refreshControl={
        <RefreshControl refreshing={catsLoading || txsLoading} onRefresh={() => { refetchCats(); refetchTxs(); }} tintColor={colors.primary} />
      }
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Gastos por Categoria</Text>
          <Text style={[styles.headerTotal, { color: colors.danger }]}>Total: {formatCurrency(-totalSpent)}</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}><Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhum gasto registrado</Text></View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 8 },
  header: { marginBottom: 16, gap: 4 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold' },
  headerTotal: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  categoryCard: { paddingVertical: 14, paddingHorizontal: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { fontSize: 28 },
  categoryInfo: { flex: 1, gap: 2 },
  categoryName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  categoryCount: { fontSize: 12, fontFamily: 'Inter-Regular' },
  amountCol: { alignItems: 'flex-end', gap: 4, minWidth: 110 },
  categoryAmount: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  progressBar: { width: '100%', height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  skeletonList: { padding: 24 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
