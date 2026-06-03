import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type TransactionFilter = {
  type?: string;
  categoryId?: string;
};

interface TransactionFiltersProps {
  activeFilter: TransactionFilter;
  onChange: (filter: TransactionFilter) => void;
  categories: { id: string; name: string; icon: string; color: string }[];
}

const TYPE_OPTIONS = [
  { key: '', label: 'Todos' },
  { key: 'DEBIT', label: 'Débito' },
  { key: 'CREDIT', label: 'Crédito' },
  { key: 'PIX', label: 'PIX' },
  { key: 'TED', label: 'TED' },
  { key: 'BOLETO', label: 'Boleto' },
];

export function TransactionFilters({ activeFilter, onChange, categories }: TransactionFiltersProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => {
          const isActive = (activeFilter.type || '') === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: colors.border }]}
              onPress={() => onChange({ ...activeFilter, type: opt.key || undefined })}
            >
              <Text style={[styles.chipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {categories.map((cat) => {
          const isActive = activeFilter.categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, { backgroundColor: isActive ? cat.color : colors.surface, borderColor: colors.border }]}
              onPress={() => onChange({ ...activeFilter, categoryId: isActive ? undefined : cat.id })}
            >
              <Text style={styles.chipText}>{cat.icon} {cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingVertical: 8 },
  typeRow: { paddingHorizontal: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
