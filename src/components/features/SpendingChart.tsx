import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Rect, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { getEffectiveCategory, formatCurrency } from '../../utils/format';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - 96;
const PIE_RADIUS = 80;
const BAR_CHART_H = 180;

/** Compute SVG arc path for a pie slice */
function pieSlicePath(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

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

  const pieSlices = useMemo(() => {
    let angle = -Math.PI / 2;
    return pieData.map((slice) => {
      const pct = slice.y / totalSpent;
      const startAngle = angle;
      const endAngle = angle + pct * Math.PI * 2;
      angle = endAngle;
      return { ...slice, startAngle, endAngle };
    });
  }, [pieData, totalSpent]);

  const barMax = useMemo(
    () => Math.max(...barData.map((d) => d.y), 1),
    [barData],
  );
  const barW = Math.max((CHART_SIZE - 40) / barData.length - 8, 4);

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
      {/* Pie Chart */}
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Gastos por Categoria</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Total: {formatCurrency(-totalSpent)}
        </Text>
        <View style={styles.chartWrap}>
          <Svg width={CHART_SIZE} height={200} viewBox={`0 0 ${PIE_RADIUS * 2} ${PIE_RADIUS * 2}`}>
            <G x={PIE_RADIUS} y={PIE_RADIUS}>
              {pieSlices.map((slice) => (
                <Path
                  key={slice.x}
                  d={pieSlicePath(0, 0, PIE_RADIUS - 2, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  opacity={0.9}
                />
              ))}
            </G>
          </Svg>
        </View>
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

      {/* Bar Chart */}
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Últimos 7 Dias</Text>
        <Svg width={CHART_SIZE} height={BAR_CHART_H} viewBox={`0 0 ${CHART_SIZE} ${BAR_CHART_H}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = 20 + (BAR_CHART_H - 60) * (1 - pct);
            return (
              <G key={`grid-${pct}`}>
                <SvgLine x1={30} y1={y} x2={CHART_SIZE - 8} y2={y} stroke={colors.divider} strokeWidth={0.5} />
                <SvgText x={26} y={y + 4} fill={colors.textTertiary} fontSize={9} textAnchor="end">
                  {barMax * pct >= 1000 ? `${((barMax * pct) / 1000).toFixed(0)}k` : String(Math.round(barMax * pct))}
                </SvgText>
              </G>
            );
          })}
          {barData.map((d, i) => {
            const barH = barMax > 0 ? ((d.y / barMax) * (BAR_CHART_H - 60)) : 0;
            const x = 36 + i * (barW + 8);
            const y = BAR_CHART_H - 24 - barH;
            return (
              <G key={d.x}>
                <Rect x={x} y={y} width={barW} height={barH} rx={4} ry={4} fill={colors.primary} />
                <SvgText x={x + barW / 2} y={BAR_CHART_H - 6} fill={colors.textTertiary} fontSize={8} textAnchor="middle">
                  {d.x}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { gap: 4 },
  chartWrap: { alignItems: 'center', marginTop: 8 },
  title: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter-Regular' },
  empty: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', paddingVertical: 24 },
  legend: { marginTop: 8, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular' },
  legendValue: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
