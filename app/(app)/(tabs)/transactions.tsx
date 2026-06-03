import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { TransactionRow } from '../../../src/components/features/TransactionRow';
import { TransactionFilters } from '../../../src/components/features/TransactionFilters';
import type { TransactionFilter } from '../../../src/components/features/TransactionFilters';
import { Skeleton } from '../../../src/components/ui/Skeleton';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<TransactionFilter>({});
  const { data, isLoading, refetch } = useTransactions(filter);

  const categories = useMemo(
    () => [
      { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6366F1' },
      { id: 'food', name: 'Alimentação', icon: '🍔', color: '#F59E0B' },
      { id: 'home', name: 'Moradia', icon: '🏠', color: '#8B5CF6' },
      { id: 'health', name: 'Saúde', icon: '💊', color: '#EF4444' },
      { id: 'leisure', name: 'Lazer', icon: '🎮', color: '#22C55E' },
      { id: 'salary', name: 'Receita', icon: '💰', color: '#10B981' },
      { id: 'shopping', name: 'Compras', icon: '🛒', color: '#EC4899' },
    ],
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionFilters activeFilter={filter} onChange={setFilter} categories={categories} />
      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {filter.type || filter.categoryId ? 'Nenhuma transação com esse filtro' : 'Nenhuma transação'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletonList: { paddingHorizontal: 24, gap: 12, marginTop: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Inter-Regular' },
});
