import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Perfil</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Button title="Editar Perfil" variant="ghost" size="sm" onPress={() => router.push('/profile')} />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Segurança</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Alterar PIN</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Biometria</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bancos Conectados</Text>
        <Button title="Conectar Banco" onPress={() => router.push('/connect-bank')} style={{ marginTop: 8 }} />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Aparência</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Dark mode (padrão)</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dados</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/export')}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Exportar Extrato</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/budgets')}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Orçamentos Mensais</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      <Button title="Sair da Conta" variant="danger" onPress={handleLogout} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  email: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  rowArrow: { fontSize: 22, fontFamily: 'Inter-Regular' },
});
