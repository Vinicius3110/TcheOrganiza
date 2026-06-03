import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

const PIN_KEY = 'tcheorganiza_pin_hash';
const PIN_ATTEMPTS_KEY = 'tcheorganiza_pin_attempts';
const MAX_PIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 30 * 1000;

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isBiometricAvailable: boolean;
  pinAttempts: number;
  pinBlockedUntil: number | null;

  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometricAvailable: (available: boolean) => void;

  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;

  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  isPinSet: () => Promise<boolean>;
  resetPinAttempts: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isBiometricAvailable: false,
  pinAttempts: 0,
  pinBlockedUntil: null,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setBiometricAvailable: (isBiometricAvailable) => set({ isBiometricAvailable }),

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    set({ session: data.session, user: data.user });
    return { error: null };
  },

  logout: async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    set({ user: null, session: null, pinAttempts: 0, pinBlockedUntil: null });
  },

  setupPin: async (pin: string) => {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(pin, salt);
    await SecureStore.setItemAsync(PIN_KEY, hash);
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
  },

  verifyPin: async (pin: string) => {
    const { pinBlockedUntil, pinAttempts } = get();

    if (pinBlockedUntil && Date.now() < pinBlockedUntil) {
      return false;
    }

    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedHash) return false;

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(pin, storedHash);

    if (!valid) {
      const newAttempts = pinAttempts + 1;
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, String(newAttempts));

      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        set({
          pinAttempts: newAttempts,
          pinBlockedUntil: Date.now() + BLOCK_DURATION_MS,
        });
      } else {
        set({ pinAttempts: newAttempts });
      }
      return false;
    }

    // Reset on success
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
    set({ pinAttempts: 0, pinBlockedUntil: null });
    return true;
  },

  isPinSet: async () => {
    const hash = await SecureStore.getItemAsync(PIN_KEY);
    return hash !== null;
  },

  resetPinAttempts: async () => {
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
    set({ pinAttempts: 0, pinBlockedUntil: null });
  },
}));
