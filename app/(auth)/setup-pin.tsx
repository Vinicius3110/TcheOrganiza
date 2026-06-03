import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinInput } from '../../src/components/features/PinInput';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function SetupPinScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setupPin = useAuthStore((s) => s.setupPin);
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (pin: string) => {
    setFirstPin(pin);
    setStep('confirm');
    setError(null);
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setError('Os PINs não coincidem. Tente novamente.');
      setStep('create');
      setFirstPin('');
      return;
    }

    await setupPin(pin);

    // Enable biometrics if available
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ativar acesso biométrico?',
        cancelLabel: 'Pular',
      });
    }

    router.replace('/(app)/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'create' ? (
        <PinInput
          title="Crie seu PIN de acesso"
          onComplete={handleCreate}
          error={error}
        />
      ) : (
        <PinInput
          title="Confirme seu PIN"
          onComplete={handleConfirm}
          error={error}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
});
