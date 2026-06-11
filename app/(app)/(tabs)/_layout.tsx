import { Tabs } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontFamily: 'Inter-Regular', fontSize: 12 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Visão Geral', tabBarLabel: 'Início' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transações', tabBarLabel: 'Transações' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categorias', tabBarLabel: 'Categorias' }} />
      <Tabs.Screen name="settings" options={{ title: 'Configurações', tabBarLabel: 'Ajustes' }} />
    </Tabs>
  );
}
