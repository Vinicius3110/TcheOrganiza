import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

const PIN_KEY = 'tcheorganiza_pin_hash';
const PIN_ATTEMPTS_KEY = 'tcheorganiza_pin_attempts';
const PIN_BLOCKED_UNTIL_KEY = 'tcheorganiza_pin_blocked_until';
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

  /** Restore PIN state from SecureStore on app startup. Prevents lockout bypass. */
  hydratePinState: () => Promise<void>;
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
    await SecureStore.deleteItemAsync(PIN_BLOCKED_UNTIL_KEY);
    set({ user: null, session: null, pinAttempts: 0, pinBlockedUntil: null });
  },

  /**
   * Restore PIN attempt counter and block timestamp from SecureStore.
   * Call once during app initialization to prevent lockout bypass via app restart.
   */
  hydratePinState: async () => {
    const storedAttempts = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
    const storedBlockedUntil = await SecureStore.getItemAsync(PIN_BLOCKED_UNTIL_KEY);

    const pinAttempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
    const pinBlockedUntil = storedBlockedUntil ? parseInt(storedBlockedUntil, 10) : null;

    // If the block duration has expired, clear it
    if (pinBlockedUntil && Date.now() >= pinBlockedUntil) {
      await SecureStore.deleteItemAsync(PIN_BLOCKED_UNTIL_KEY);
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
      set({ pinAttempts: 0, pinBlockedUntil: null });
    } else {
      set({ pinAttempts, pinBlockedUntil });
    }
  },

  setupPin: async (pin: string) => {
    // Guard: require existing PIN verification if PIN is already set
    const hashAlreadySet = await SecureStore.getItemAsync(PIN_KEY);
    if (hashAlreadySet) {
      throw new Error('PIN já configurado. Use alterar PIN nas configurações.');
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(pin, salt);
    await SecureStore.setItemAsync(PIN_KEY, hash);
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
  },

  verifyPin: async (pin: string) => {
    let { pinBlockedUntil, pinAttempts } = get();

    // Check block state (survives app restarts via hydratePinState)
    if (pinBlockedUntil && Date.now() < pinBlockedUntil) {
      return false;
    }

    // If block expired, clear it
    if (pinBlockedUntil && Date.now() >= pinBlockedUntil) {
      await SecureStore.deleteItemAsync(PIN_BLOCKED_UNTIL_KEY);
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
      set({ pinAttempts: 0, pinBlockedUntil: null });
      // Re-read state so the incremented attempts start from 0
      const fresh = get();
      pinBlockedUntil = fresh.pinBlockedUntil;
      pinAttempts = fresh.pinAttempts;
    }

    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedHash) return false;

    const valid = await bcrypt.compare(pin, storedHash);

    if (!valid) {
      const newAttempts = pinAttempts + 1;
      await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, String(newAttempts));

      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        const blockedUntil = Date.now() + BLOCK_DURATION_MS;
        await SecureStore.setItemAsync(PIN_BLOCKED_UNTIL_KEY, String(blockedUntil));
        set({ pinAttempts: newAttempts, pinBlockedUntil: blockedUntil });
      } else {
        set({ pinAttempts: newAttempts });
      }
      return false;
    }

    // Reset on success
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
    await SecureStore.deleteItemAsync(PIN_BLOCKED_UNTIL_KEY);
    set({ pinAttempts: 0, pinBlockedUntil: null });
    return true;
  },

  isPinSet: async () => {
    const hash = await SecureStore.getItemAsync(PIN_KEY);
    return hash !== null;
  },

  resetPinAttempts: async () => {
    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, '0');
    await SecureStore.deleteItemAsync(PIN_BLOCKED_UNTIL_KEY);
    set({ pinAttempts: 0, pinBlockedUntil: null });
  },
}));
