import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { CategorySelector } from '../../../src/components/features/CategorySelector';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { AmountDisplay } from '../../../src/components/features/AmountDisplay';
import { formatDate, getEffectiveCategory } from '../../../src/utils/format';
import { supabase } from '../../../src/services/supabase';

const CATEGORIES = [
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6366F1' },
  { id: 'food', name: 'Alimentação', icon: '🍔', color: '#F59E0B' },
  { id: 'home', name: 'Moradia', icon: '🏠', color: '#8B5CF6' },
  { id: 'health', name: 'Saúde', icon: '💊', color: '#EF4444' },
  { id: 'leisure', name: 'Lazer', icon: '🎮', color: '#22C55E' },
  { id: 'salary', name: 'Receita', icon: '💰', color: '#10B981' },
  { id: 'shopping', name: 'Compras', icon: '🛒', color: '#EC4899' },
  { id: 'education', name: 'Educação', icon: '📚', color: '#3B82F6' },
  { id: 'investment', name: 'Investimentos', icon: '💸', color: '#F97316' },
  { id: 'other', name: 'Outros', icon: '❓', color: '#6E7681' },
];

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: transactions, isLoading } = useTransactions({ limit: 100 });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [updating, setUpdating] = useState(false);

  const tx = (transactions ?? []).find((t) => t.id === id);
  const effectiveCategoryId = tx ? getEffectiveCategory(tx) : null;
  const category = CATEGORIES.find((c) => c.id === effectiveCategoryId);

  const handleCategoryChange = async (categoryId: string) => {
    if (!tx) return;
    setUpdating(true);
    await supabase.from('transactions').update({ user_category_id: categoryId, status: 'categorized' }).eq('id', tx.id);
    setUpdating(false);
    setShowCategorySelector(false);
  };

  if (isLoading || !tx) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Skeleton height={200} style={{ margin: 24 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <AmountDisplay amount={tx.amount} size="lg" />
        <Text style={[styles.merchant, { color: colors.textPrimary }]}>{tx.merchantName ?? tx.description}</Text>
      </View>

      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Data</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(tx.date)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Descrição</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.description}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tipo</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.type}</Text>
        </View>
        {tx.merchantCnpj ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CNPJ</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.merchantCnpj}</Text>
            </View>
          </>
        ) : null}
      </Card>

      <Card style={styles.categoryCard}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Categoria</Text>
        <Button
          title={category ? `${category.icon} ${category.name}` : 'Selecionar categoria'}
          variant={category ? 'secondary' : 'primary'}
          onPress={() => setShowCategorySelector(true)}
          loading={updating}
        />
      </Card>

      <CategorySelector
        visible={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelect={handleCategoryChange}
        selectedId={effectiveCategoryId}
        categories={CATEGORIES}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16 },
  header: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  merchant: { fontSize: 20, fontFamily: 'Inter-SemiBold', textAlign: 'center' },
  detailsCard: { gap: 0 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  detailLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  detailValue: { fontSize: 14, fontFamily: 'Inter-SemiBold', flex: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth },
  categoryCard: { gap: 12 },
  sectionLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
