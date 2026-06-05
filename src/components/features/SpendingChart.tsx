import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryPie, VictoryBar, VictoryChart, VictoryAxis } from 'victory-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { getEffectiveCategory, formatCurrency } from '../../utils/format';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - 96;

export function SpendingChart() {
  const { colors } = useTheme();
  const { data: transactions, isLoading: txsLoading } = useTransactions();
  const { data: categories, isLoading: catsLoading } = useCategories();

  const pieData = useMemo(() => {
    if (!categories || !transactions) return [];
    return categories
      .map((cat) => {
        const total = transactions
          .filter((tx) => getEffectiveCategory(tx) === cat.id && tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        return { x: cat.name, y: total, color: cat.color };
      })
      .filter((d) => d.y > 0)
      .sort((a, b) => b.y - a.y)
      .slice(0, 6);
  }, [categories, transactions]);

  const barData = useMemo(() => {
    if (!transactions) return [];
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7Days[key] = 0;
    }
    transactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        if (tx.date in last7Days) {
          last7Days[tx.date] += Math.abs(tx.amount);
        }
      });
    return Object.entries(last7Days).map(([date, amount]) => {
      const [, m, d] = date.split('-');
      return { x: `${d}/${m}`, y: Math.round(amount * 100) / 100 };
    });
  }, [transactions]);

  const totalSpent = useMemo(
    () => pieData.reduce((sum, d) => sum + d.y, 0),
    [pieData],
  );

  if (txsLoading || catsLoading) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Gastos por Categoria</Text>
        <Skeleton height={180} style={{ marginTop: 12 }} />
      </Card>
    );
  }

  if (pieData.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Gastos por Categoria</Text>
        <Text style={[styles.empty, { color: colors.textTertiary }]}>
          Sem dados suficientes para exibir gráficos.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Gastos por Categoria</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Total: {formatCurrency(-totalSpent)}
        </Text>
        <VictoryPie
          data={pieData}
          width={CHART_SIZE}
          height={200}
          innerRadius={55}
          padAngle={2}
          colorScale={pieData.map((d) => d.color)}
          labels={() => null}
          style={{ data: { fillOpacity: 0.9 } }}
        />
        <View style={styles.legend}>
          {pieData.map((item) => (
            <View key={item.x} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.x}
              </Text>
              <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                {((item.y / totalSpent) * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Últimos 7 Dias</Text>
        <VictoryChart
          width={CHART_SIZE}
          height={200}
          domainPadding={20}
        >
          <VictoryAxis
            style={{
              axis: { stroke: colors.border },
              tickLabels: { fill: colors.textTertiary, fontSize: 10 },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: 'transparent' },
              tickLabels: { fill: colors.textTertiary, fontSize: 10 },
            }}
            tickFormat={(t: number) => (t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(t))}
          />
          <VictoryBar
            data={barData}
            style={{ data: { fill: colors.primary, width: 20 } }}
            cornerRadius={4}
          />
        </VictoryChart>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { gap: 4 },
  title: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter-Regular' },
  empty: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', paddingVertical: 24 },
  legend: { marginTop: 8, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular' },
  legendValue: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
