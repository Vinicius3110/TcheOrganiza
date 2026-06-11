import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

const BANKS = [
  { ispb: '26041819', name: 'Nubank', available: true },
  { ispb: '60701190', name: 'Itaú', available: true },
  { ispb: '60746948', name: 'Bradesco', available: true },
];

export default function ConnectBankScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Conectar Banco</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Selecione o banco para conectar via Open Finance
      </Text>
      {BANKS.map((bank) => (
        <View key={bank.ispb} style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
          <Text style={[styles.bankStatus, { color: bank.available ? colors.success : colors.textTertiary }]}>
            {bank.available ? 'Disponível' : 'Em breve'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', marginTop: 24 },
  subtitle: { fontSize: 15, fontFamily: 'Inter-Regular', marginBottom: 16 },
  bankCard: { padding: 20, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bankName: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bankStatus: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
