import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Share, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useCategories } from '../../src/hooks/useCategories';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { formatCurrency, formatDate, getEffectiveCategory } from '../../src/utils/format';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const categoryStats = useMemo(() => {
    if (!categories || !transactions) return [];
    return categories
      .map((cat) => {
        const catTx = transactions.filter((tx) => {
          const effective = getEffectiveCategory(tx);
          return effective === cat.id && tx.amount < 0;
        });
        const total = catTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        return { ...cat, total, count: catTx.length };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, transactions]);

  const totalSpent = useMemo(
    () => categoryStats.reduce((sum, c) => sum + c.total, 0),
    [categoryStats],
  );

  const exportCSV = async () => {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Sem dados', 'Nenhuma transação para exportar.');
      return;
    }
    setExporting('csv');

    const header = 'Data,Descrição,Estabelecimento,Tipo,Valor\n';
    const rows = transactions
      .map((tx) => {
        const date = formatDate(tx.date);
        const desc = `"${tx.description.replace(/"/g, '""')}"`;
        const merchant = `"${(tx.merchantName ?? '').replace(/"/g, '""')}"`;
        const amount = formatCurrency(tx.amount)
          .replace('R$', '')
          .trim();
        return `${date},${desc},${merchant},${tx.type},${amount}`;
      })
      .join('\n');

    await Share.share({ message: header + rows, title: 'extrato-tcheorganiza.csv' });
    setExporting(null);
  };

  const exportPDF = async () => {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Sem dados', 'Nenhuma transação para exportar.');
      return;
    }
    setExporting('pdf');

    const rowsHtml = transactions
      .slice(0, 500)
      .map((tx) => {
        const cat = categories?.find((c) => c.id === getEffectiveCategory(tx));
        const color = tx.amount >= 0 ? '#22C55E' : '#EF4444';
        return `<tr>
          <td>${formatDate(tx.date)}</td>
          <td>${tx.merchantName ?? tx.description}</td>
          <td>${tx.type}</td>
          <td style="text-align:right;color:${color}">${formatCurrency(tx.amount)}</td>
          <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
        </tr>`;
      })
      .join('');

    const summaryHtml = categoryStats
      .map((cat) => {
        const pct = totalSpent > 0 ? ((cat.total / totalSpent) * 100).toFixed(1) : '0';
        return `<tr>
          <td>${cat.icon} ${cat.name}</td>
          <td>${cat.count}</td>
          <td style="text-align:right">${formatCurrency(-cat.total)}</td>
          <td style="text-align:right">${pct}%</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; padding: 16px; color: #1F2328; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 24px; border-bottom: 1px solid #D0D7DE; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #EAECEF; }
  th { background: #F6F8FA; font-weight: 600; }
  .total { font-size: 18px; font-weight: bold; margin-top: 8px; }
</style></head><body>
<h1>TcheOrganiza — Extrato</h1>
<p>Gerado em ${formatDate(new Date().toISOString())} • ${transactions.length} transações</p>

<h2>Resumo por Categoria</h2>
<table><tr><th>Categoria</th><th>Qtd</th><th>Total</th><th>%</th></tr>
${summaryHtml}</table>
<p class="total">Total de gastos: ${formatCurrency(-totalSpent)}</p>

<h2>Transações</h2>
<table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Categoria</th></tr>
${rowsHtml}</table>
</body></html>`;

    const { uri } = await Print.printToFileAsync({ html });

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar extrato PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF gerado', `Arquivo salvo em: ${uri}`);
      }
    }

    setExporting(null);
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
        <Button
          title="Exportar CSV"
          onPress={exportCSV}
          loading={exporting === 'csv'}
          disabled={exporting !== null}
        />
      </Card>

      <Card style={styles.optionCard}>
        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>PDF</Text>
        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
          Relatório formatado com resumo por categoria e lista de transações
        </Text>
        <Button
          title="Exportar PDF"
          onPress={exportPDF}
          variant="secondary"
          loading={exporting === 'pdf'}
          disabled={exporting !== null}
        />
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
