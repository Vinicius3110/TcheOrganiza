import React from 'react';
import { FlatList, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AmountDisplay } from './AmountDisplay';
import { useTheme } from '../../theme/ThemeProvider';
import type { Account } from '../../types/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

interface AccountCarouselProps {
  accounts: Account[];
  isLoading: boolean;
}

export function AccountCarousel({ accounts, isLoading }: AccountCarouselProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <FlatList
        horizontal
        data={[1, 2]}
        keyExtractor={(i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        renderItem={() => (
          <Card style={styles.card}>
            <Skeleton height={16} width={100} />
            <Skeleton height={28} width={160} style={{ marginTop: 8 }} />
            <Skeleton height={14} width={80} style={{ marginTop: 4 }} />
          </Card>
        )}
      />
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhuma conta conectada ainda.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={accounts}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <Card style={[styles.card, { width: CARD_WIDTH }]}>
          <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <AmountDisplay amount={item.balance} size="md" />
          <Text style={[styles.accountType, { color: colors.textTertiary }]}>
            {item.type === 'corrente' ? 'Conta Corrente' : item.type === 'poupanca' ? 'Poupança' : 'Investimentos'}
          </Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24 },
  card: { gap: 4, paddingVertical: 20 },
  accountName: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  accountType: { fontSize: 13, fontFamily: 'Inter-Regular', textTransform: 'capitalize' },
  emptyContainer: { paddingHorizontal: 24, paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
