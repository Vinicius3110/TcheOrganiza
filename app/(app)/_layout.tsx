import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import { LockScreen } from '../../src/components/features/LockScreen';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function AppLayout() {
  const { isReady } = useAuthGuard();
  const { colors } = useTheme();

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LockScreen>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="connect-bank" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="export" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="budgets" options={{ animation: 'slide_from_right', headerShown: true, title: 'Orçamentos' }} />
      </Stack>
    </LockScreen>
  );
}
