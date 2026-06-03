import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategorySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  selectedId?: string | null;
  categories: CategoryOption[];
}

export function CategorySelector({ visible, onClose, onSelect, selectedId, categories }: CategorySelectorProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}><View /></Pressable>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Selecionar Categoria</Text>
        <ScrollView style={styles.list}>
          {categories.map((cat) => {
            const isSelected = cat.id === selectedId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.option, { backgroundColor: isSelected ? cat.color + '20' : 'transparent' }]}
                onPress={() => onSelect(cat.id)}
              >
                <Text style={styles.optionIcon}>{cat.icon}</Text>
                <Text style={[styles.optionName, { color: colors.textPrimary }]}>{cat.name}</Text>
                {isSelected && <Text style={[styles.check, { color: cat.color }]}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 32, maxHeight: '60%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Inter-SemiBold', paddingHorizontal: 24, marginBottom: 16 },
  list: { paddingHorizontal: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, gap: 12 },
  optionIcon: { fontSize: 24 },
  optionName: { fontSize: 16, fontFamily: 'Inter-SemiBold', flex: 1 },
  check: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
});
