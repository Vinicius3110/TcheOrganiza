import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinInput } from './PinInput';
import { useAuthStore } from '../../stores/auth.store';
import { useTheme } from '../../theme/ThemeProvider';

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface LockScreenProps {
  children: React.ReactNode;
}

export function LockScreen({ children }: LockScreenProps) {
  const { colors } = useTheme();
  const { verifyPin, hydratePinState } = useAuthStore();
  const [isLocked, setIsLocked] = useState(false);
  const [lastActive, setLastActive] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  // Restore PIN lockout state on mount (survives app restart)
  useEffect(() => {
    hydratePinState();
  }, []);

  // Lock on app background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const elapsed = Date.now() - lastActive;
        if (elapsed > LOCK_TIMEOUT_MS) {
          setIsLocked(true);
          attemptBiometric();
        }
      } else if (state === 'background') {
        setLastActive(Date.now());
        setIsLocked(true);
      }
    });

    return () => subscription.remove();
  }, [lastActive]);

  const attemptBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloqueie o TcheOrganiza',
        fallbackLabel: 'Usar PIN',
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch {
      // Fall through to PIN
    }
  };

  const handlePinSubmit = async (pin: string) => {
    const valid = await verifyPin(pin);
    if (valid) {
      setIsLocked(false);
      setError(null);
    } else {
      const { pinBlockedUntil } = useAuthStore.getState();
      if (pinBlockedUntil) {
        const remaining = Math.ceil((pinBlockedUntil - Date.now()) / 1000);
        setError(`Acesso bloqueado por ${remaining}s`);
      } else {
        setError('PIN incorreto');
      }
    }
  };

  if (isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PinInput title="Desbloqueie o app" onComplete={handlePinSubmit} error={error} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
});
