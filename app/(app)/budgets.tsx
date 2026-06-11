import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useCategories } from '../../src/hooks/useCategories';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useBudgets, useUpsertBudget } from '../../src/hooks/useBudgets';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { formatCurrency, getEffectiveCategory } from '../../src/utils/format';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const month = currentMonth();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: transactions } = useTransactions();
  const { data: budgets, isLoading: budgetsLoading, refetch } = useBudgets(month);
  const upsertBudget = useUpsertBudget();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const budgetMap = useMemo(() => {
    const map = new Map<string, number>();
    (budgets ?? []).forEach((b) => map.set(b.categoryId, b.amount));
    return map;
  }, [budgets]);

  const getSpent = (categoryId: string): number => {
    if (!transactions) return 0;
    return transactions
      .filter((tx) => getEffectiveCategory(tx) === categoryId && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  };

  const handleSetBudget = (categoryId: string) => {
    const amount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    upsertBudget.mutate({ categoryId, amount, month });
    setEditingId(null);
    setEditAmount('');
  };

  if (catsLoading || budgetsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={72} style={{ marginBottom: 8, marginHorizontal: 24 }} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={upsertBudget.isPending} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Orçamento Mensal</Text>
      <Text style={[styles.headerMonth, { color: colors.textSecondary }]}>
        {new Date(month + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </Text>

      {(categories ?? []).map((cat) => {
        const budgetAmount = budgetMap.get(cat.id);
        const spent = getSpent(cat.id);
        const pct = budgetAmount && budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const isOverBudget = budgetAmount ? spent > budgetAmount : false;
        const isNearLimit = budgetAmount ? pct >= 80 && pct < 100 : false;

        return (
          <Card key={cat.id} style={styles.budgetCard}>
            <View style={styles.budgetRow}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <View style={styles.budgetInfo}>
                <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                <Text style={[styles.spentText, { color: colors.textSecondary }]}>
                  Gasto: {formatCurrency(-spent)}
                  {budgetAmount ? ` de ${formatCurrency(budgetAmount)}` : ''}
                </Text>
                {budgetAmount ? (
                  <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
                    <View
                      style={[styles.progressFill, {
                        backgroundColor: isOverBudget ? colors.danger : isNearLimit ? colors.warning : colors.success,
                        width: `${Math.min(pct, 100)}%`,
                      }]}
                    />
                  </View>
                ) : null}
              </View>
              {editingId === cat.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.amountInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                    placeholderTextColor={colors.textTertiary}
                    autoFocus
                  />
                  <Button title="OK" size="sm" onPress={() => handleSetBudget(cat.id)} loading={upsertBudget.isPending} />
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setEditingId(cat.id); setEditAmount(budgetAmount ? String(budgetAmount) : ''); }}>
                  <Text style={[styles.setBudget, { color: colors.primary }]}>
                    {budgetAmount ? formatCurrency(budgetAmount) : 'Definir'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 8 },
  headerTitle: { fontSize: 24, fontFamily: 'Inter-Bold' },
  headerMonth: { fontSize: 15, fontFamily: 'Inter-Regular', textTransform: 'capitalize', marginBottom: 8 },
  budgetCard: { paddingVertical: 14, paddingHorizontal: 16 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { fontSize: 28 },
  budgetInfo: { flex: 1, gap: 2 },
  catName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  spentText: { fontSize: 13, fontFamily: 'Inter-Regular' },
  progressBar: { width: '100%', height: 4, borderRadius: 2, marginTop: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountInput: { width: 80, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'right' },
  setBudget: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
