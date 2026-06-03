import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Share } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTransactions } from '../../src/hooks/useTransactions';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { formatCurrency, formatDate } from '../../src/utils/format';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { data: transactions } = useTransactions();
  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Sem dados', 'Nenhuma transação para exportar.');
      return;
    }

    setExporting(true);

    const header = 'Data,Descrição,Estabelecimento,Tipo,Valor\n';
    const rows = transactions
      .map((tx) => {
        const date = formatDate(tx.date);
        const desc = `"${tx.description.replace(/"/g, '""')}"`;
        const merchant = `"${(tx.merchantName ?? '').replace(/"/g, '""')}"`;
        const amount = formatCurrency(tx.amount).replace(/\s/g, ' ').trim();
        return `${date},${desc},${merchant},${tx.type},${amount}`;
      })
      .join('\n');

    const csv = header + rows;

    await Share.share({ message: csv, title: 'extrato-tcheorganiza.csv' });
    setExporting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Exportar Extrato</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {transactions?.length ?? 0} transações disponíveis
      </Text>

      <Card style={styles.optionCard}>
        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>CSV</Text>
        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
          Compatível com Excel, Google Sheets e qualquer planilha
        </Text>
        <Button title="Exportar CSV" onPress={exportCSV} loading={exporting} />
      </Card>

      <Card style={styles.optionCard}>
        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>PDF</Text>
        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
          Relatório formatado com resumo por categoria
        </Text>
        <Button title="Exportar PDF" onPress={() => Alert.alert('Em breve', 'Exportação PDF será implementada na próxima versão.')} variant="secondary" />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', marginTop: 24 },
  subtitle: { fontSize: 15, fontFamily: 'Inter-Regular' },
  optionCard: { gap: 8, paddingVertical: 20 },
  optionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  optionDesc: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 8 },
});
