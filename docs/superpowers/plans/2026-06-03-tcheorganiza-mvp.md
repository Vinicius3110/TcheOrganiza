# TcheOrganiza MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal finance management mobile app that connects to 3 banks via Open Finance, categorizes transactions automatically, and provides real-time updates — with security as the primary requirement.

**Architecture:** Thin Client / Fat Edge — the React Native + Expo app focuses on UI; all business logic (normalization, categorization, polling, aggregation) runs in Supabase Edge Functions and a dedicated Node.js Proxy Server. Data flows from Open Finance → Proxy (mTLS) → Edge Functions (normalize + categorize) → PostgreSQL → Supabase Realtime → App.

**Tech Stack:** React Native + Expo SDK 52, TypeScript, Expo Router, Supabase (Auth + PostgreSQL + Realtime + Edge Functions), Zustand, React Query, expo-secure-store, expo-local-authentication, Zod, Jest, Detox, Node.js + TypeScript (proxy server)

**Source Spec:** `docs/superpowers/specs/2026-06-03-tcheorganiza-design.md`

---

## Phase 1: Project Scaffolding & Infrastructure

---

### Task 1: Initialize Expo project with TypeScript

**Files:**
- Create: All Expo project scaffolding
- Modify: `app.json`, `tsconfig.json`, `package.json`

- [ ] **Step 1: Create Expo project**

```bash
npx create-expo-app@latest TcheOrganiza --template blank-typescript
cd TcheOrganiza
```

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install react-native-gesture-handler react-native-reanimated
```

- [ ] **Step 3: Configure app.json for Expo Router**

Update `app.json`:
```json
{
  "expo": {
    "name": "TcheOrganiza",
    "slug": "tche-organiza",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "tcheorganiza",
    "splash": {
      "backgroundColor": "#0D1117",
      "resizeMode": "contain"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.tcheorganiza.app",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID para acessar o TcheOrganiza de forma segura."
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0D1117"
      },
      "package": "com.tcheorganiza.app",
      "permissions": ["USE_BIOMETRIC", "USE_FINGERPRINT"]
    },
    "plugins": [
      "expo-router",
      "expo-local-authentication",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Create root layout**

Create `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
```

- [ ] **Step 5: Verify project runs**

```bash
npx expo start
```
Expected: App boots with blank screen, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize Expo project with TypeScript and Expo Router"
```

---

### Task 2: Install and configure type system, linting, and design system utilities

**Files:**
- Create: `src/types/models.ts`, `src/utils/format.ts`, `.eslintrc.js`
- Modify: `tsconfig.json`

- [ ] **Step 1: Write model types**

Create `src/types/models.ts`:
```typescript
// ============================================
// Domain models — matches PostgreSQL schema
// ============================================

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  userId: string;
  name: string;
  ispb: string;
  consentId: string;
  status: 'active' | 'expired' | 'revoked';
  lastSyncAt: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  institutionId: string;
  userId: string;
  externalId: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento';
  currency: string;
  balance: number;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  isSystem: boolean;
  createdAt: string;
}

export type TransactionType = 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
export type TransactionStatus = 'pending' | 'posted' | 'categorized';

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  externalId: string;
  amount: number; // positive = entrada, negative = saída
  description: string;
  merchantName: string | null;
  merchantCnpj: string | null;
  categoryId: string | null;
  userCategoryId: string | null;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CategorizationRule {
  id: string;
  userId: string;
  pattern: string;
  field: 'description' | 'merchant_name' | 'merchant_cnpj';
  categoryId: string;
  confidence: number;
  hitCount: number;
  createdAt: string;
}
```

- [ ] **Step 2: Write formatting utilities**

Create `src/utils/format.ts`:
```typescript
/**
 * Format a decimal amount as BRL currency string.
 * amount in reais (e.g., 1234.56 → "R$ 1.234,56")
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format a date string to short Brazilian format.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a date string to relative format (e.g., "Hoje", "Ontem", "3 dias atrás").
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(dateStr);
}

/**
 * Compute the effective category for a transaction.
 * User override takes priority over automatic categorization.
 */
export function getEffectiveCategory(
  transaction: { categoryId: string | null; userCategoryId: string | null }
): string | null {
  return transaction.userCategoryId ?? transaction.categoryId;
}

/**
 * Determine if a transaction is income (positive amount).
 */
export function isIncome(amount: number): boolean {
  return amount > 0;
}

/**
 * Determine if a transaction is expense (negative amount).
 */
export function isExpense(amount: number): boolean {
  return amount < 0;
}
```

- [ ] **Step 3: Write formatting utility tests**

Create `src/utils/__tests__/format.test.ts`:
```typescript
import { formatCurrency, getEffectiveCategory, isIncome, isExpense } from '../format';

describe('formatCurrency', () => {
  it('formats positive amounts with BRL symbol', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
  });

  it('formats negative amounts with minus prefix', () => {
    expect(formatCurrency(-500)).toBe('-R$ 500,00');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('handles large amounts', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });
});

describe('getEffectiveCategory', () => {
  it('returns user category override when set', () => {
    expect(getEffectiveCategory({ categoryId: 'auto-1', userCategoryId: 'user-2' }))
      .toBe('user-2');
  });

  it('returns automatic category when no user override', () => {
    expect(getEffectiveCategory({ categoryId: 'auto-1', userCategoryId: null }))
      .toBe('auto-1');
  });

  it('returns null when neither category is set', () => {
    expect(getEffectiveCategory({ categoryId: null, userCategoryId: null }))
      .toBeNull();
  });
});

describe('isIncome / isExpense', () => {
  it('identifies income as positive amount', () => {
    expect(isIncome(100)).toBe(true);
    expect(isIncome(0)).toBe(false);
    expect(isIncome(-100)).toBe(false);
  });

  it('identifies expense as negative amount', () => {
    expect(isExpense(-50)).toBe(true);
    expect(isExpense(0)).toBe(false);
    expect(isExpense(50)).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests to verify**

```bash
npx jest src/utils/__tests__/format.test.ts --config jest.config.js
```
Expected: All tests pass.

- [ ] **Step 5: Configure Jest**

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
};
```

- [ ] **Step 6: Commit**

```bash
git add src/types/ src/utils/ jest.config.js
git commit -m "feat: add domain types and formatting utilities with tests"
```

---

### Task 3: Install and configure Supabase client, Zustand, React Query, and security libraries

**Files:**
- Create: `src/services/supabase.ts`, `src/stores/auth.store.ts`, `src/lib/query-client.ts`
- Modify: `package.json`

- [ ] **Step 1: Install all remaining dependencies**

```bash
npx expo install @supabase/supabase-js @tanstack/react-query zustand
npx expo install expo-secure-store expo-local-authentication expo-screen-capture
npm install zod bcryptjs date-fns
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Create Supabase client**

Create `src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter that uses SecureStore instead of AsyncStorage
// This ensures the Supabase session token never touches AsyncStorage
const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 3: Create React Query client**

Create `src/lib/query-client.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 2,
    },
  },
});
```

- [ ] **Step 4: Create auth store**

Create `src/stores/auth.store.ts`:
```typescript
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
```

- [ ] **Step 5: Write auth store tests**

Create `src/stores/__tests__/auth.store.test.ts`:
```typescript
import { useAuthStore } from '../auth.store';

// Mock supabase and SecureStore
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      pinAttempts: 0,
      pinBlockedUntil: null,
    });
  });

  it('initial state has null user and session', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('setUser updates the user', () => {
    const mockUser = { id: '123', email: 'test@test.com' } as any;
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('logout clears user and session', async () => {
    useAuthStore.setState({
      user: { id: '123' } as any,
      session: {} as any,
    });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npx jest src/stores/__tests__/auth.store.test.ts
```
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/ src/stores/ src/lib/ package.json
git commit -m "feat: add Supabase client, Zustand stores, and React Query setup"
```

---

### Task 4: Create design system foundation (ThemeProvider + colors + typography)

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/ThemeProvider.tsx`
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create color tokens**

Create `src/theme/colors.ts`:
```typescript
export const darkColors = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#1C2333',
  primary: '#6366F1',
  primaryHover: '#5558E6',
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  border: '#30363D',
  divider: '#21262D',
} as const;

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F6F8FA',
  surfaceElevated: '#FFFFFF',
  primary: '#6366F1',
  primaryHover: '#5558E6',
  success: '#16A34A',
  successBg: 'rgba(22, 163, 74, 0.10)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  textPrimary: '#1F2328',
  textSecondary: '#656D76',
  textTertiary: '#8B949E',
  border: '#D0D7DE',
  divider: '#EAECEF',
} as const;

export type Colors = typeof darkColors;
```

- [ ] **Step 2: Create typography tokens**

Create `src/theme/typography.ts`:
```typescript
import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
```

- [ ] **Step 3: Create ThemeProvider**

Create `src/theme/ThemeProvider.tsx`:
```typescript
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, Colors } from './colors';

interface Theme {
  colors: Colors;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({
  colors: darkColors,
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Dark mode is the default. User can toggle to light in settings.
  const isDark = systemScheme !== 'light'; // defaults to dark

  const theme = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

- [ ] **Step 4: Create base Button component**

Create `src/components/ui/Button.tsx`:
```typescript
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const bgColor = {
    primary: colors.primary,
    secondary: colors.surfaceElevated,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#FFFFFF',
    secondary: colors.textPrimary,
    danger: '#FFFFFF',
    ghost: colors.primary,
  }[variant];

  const height = { sm: 36, md: 48, lg: 56 }[size];
  const fontSize = { sm: 14, md: 16, lg: 18 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? colors.textTertiary : bgColor,
          height,
          borderRadius: 12,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
  },
});
```

- [ ] **Step 5: Create base Card component**

Create `src/components/ui/Card.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
```

- [ ] **Step 6: Create Skeleton loading component**

Create `src/components/ui/Skeleton.tsx`:
```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? '#21262D' : '#E1E4E8',
          opacity,
        },
        style,
      ]}
    />
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/theme/ src/components/ui/
git commit -m "feat: add design system foundation (colors, typography, base components)"
```

---

## Phase 2: Database Schema & Supabase Setup

---

### Task 5: Create Supabase project and configure environment

**Files:**
- Create: `.env`, `.env.example`, `supabase/config.toml`

- [ ] **Step 1: Install Supabase CLI and initialize**

```bash
npm install -D supabase
npx supabase init
```

- [ ] **Step 2: Create .env file**

Create `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=<your-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Create `.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Add .env to .gitignore**

```bash
echo ".env" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add supabase/ .env.example .gitignore
git commit -m "chore: add Supabase CLI config and environment setup"
```

---

### Task 6: Write database migration for all tables

**Files:**
- Create: `supabase/migrations/00001_schema.sql`

- [ ] **Step 1: Write the full schema migration**

Create `supabase/migrations/00001_schema.sql`:
```sql
-- ============================================
-- TcheOrganiza — Initial Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- profiles: extends auth.users
-- ============================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- categories: system + user-defined
-- ============================================
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_system     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Insert default system categories
INSERT INTO categories (id, name, icon, color, is_system) VALUES
  (gen_random_uuid(), 'Transporte', '🚗', '#6366F1', true),
  (gen_random_uuid(), 'Alimentação', '🍔', '#F59E0B', true),
  (gen_random_uuid(), 'Moradia', '🏠', '#8B5CF6', true),
  (gen_random_uuid(), 'Saúde', '💊', '#EF4444', true),
  (gen_random_uuid(), 'Lazer', '🎮', '#22C55E', true),
  (gen_random_uuid(), 'Salário/Receita', '💰', '#10B981', true),
  (gen_random_uuid(), 'Compras', '🛒', '#EC4899', true),
  (gen_random_uuid(), 'Educação', '📚', '#3B82F6', true),
  (gen_random_uuid(), 'Investimentos', '💸', '#F97316', true),
  (gen_random_uuid(), 'Outros', '❓', '#6E7681', true);

-- ============================================
-- institutions: connected banks
-- ============================================
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  ispb          TEXT NOT NULL,
  consent_id    TEXT NOT NULL,
  vault_key_id  TEXT NOT NULL,               -- reference to Vault, not the actual token
  token_expires TIMESTAMPTZ,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- accounts: accounts within each bank
-- ============================================
CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('corrente', 'poupanca', 'investimento')),
  currency        TEXT DEFAULT 'BRL',
  balance         DECIMAL(18,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- transactions: the central table
-- ============================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  description     TEXT NOT NULL,
  merchant_name   TEXT,
  merchant_cnpj   TEXT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date            DATE NOT NULL,
  type            TEXT DEFAULT 'DEBIT' CHECK (type IN ('DEBIT', 'CREDIT', 'PIX', 'TED', 'BOLETO')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'categorized')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(external_id, account_id)
);

-- ============================================
-- categorization_rules: learned patterns
-- ============================================
CREATE TABLE categorization_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern       TEXT NOT NULL,
  field         TEXT DEFAULT 'description' CHECK (field IN ('description', 'merchant_name', 'merchant_cnpj')),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence    DECIMAL(3,2) DEFAULT 1.0,
  hit_count     INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, pattern, field)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_cnpj) WHERE merchant_cnpj IS NOT NULL;
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_institutions_user ON institutions(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories (system categories are readable by all, user categories private)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system categories"
  ON categories FOR SELECT USING (is_system = true OR (auth.uid() = user_id));
CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE USING (auth.uid() = user_id);

-- institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own institutions"
  ON institutions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own accounts"
  ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categorization_rules
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own rules"
  ON categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

- [ ] **Step 3: Verify RLS is enforced**

```bash
# Connect to Supabase SQL editor and run:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
Expected: All tables show `rowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add complete database schema with RLS policies"
```

---

### Task 7: Generate TypeScript types from database schema

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: Generate types**

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

- [ ] **Step 2: Verify the generated file has all tables**

Check that `src/types/database.ts` contains types for: `profiles`, `categories`, `institutions`, `accounts`, `transactions`, `categorization_rules`.

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add generated Supabase database types"
```

---

## Phase 3: Authentication & Security

---

### Task 8: Build login screen with Supabase Auth

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`
- Create: `src/hooks/useAuthGuard.ts`

- [ ] **Step 1: Create auth layout**

Create `app/(auth)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="setup-pin" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

- [ ] **Step 2: Create login screen**

Create `app/(auth)/login.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Button } from '../../src/components/ui/Button';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    const { error: loginError } = await login(email.trim(), password);

    if (loginError) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    // Check if PIN is already set — if not, redirect to setup
    const isPinSet = await useAuthStore.getState().isPinSet();
    if (!isPinSet) {
      router.replace('/setup-pin');
    } else {
      router.replace('/(app)/(tabs)/dashboard');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>TcheOrganiza</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Gerencie suas finanças{'\n'}com segurança
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Senha"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          )}

          <Button
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
            style={styles.loginButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  form: { gap: 12 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  error: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  loginButton: { marginTop: 16 },
});
```

- [ ] **Step 3: Create auth guard hook**

Create `src/hooks/useAuthGuard.ts`:
```typescript
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsReady(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const { user } = useAuthStore.getState();

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }, [user, segments, isReady]);

  return { isReady };
}
```

- [ ] **Step 4: Update root layout with providers**

Modify `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { queryClient } from '../src/lib/query-client';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/(auth)/ src/hooks/useAuthGuard.ts
git commit -m "feat: add login screen with Supabase Auth integration"
```

---

### Task 9: Build PIN setup and verification screens with biometric unlock

**Files:**
- Create: `app/(auth)/setup-pin.tsx`
- Create: `app/(app)/_layout.tsx` (with biometric lock screen)
- Create: `src/components/features/PinInput.tsx`, `src/components/features/LockScreen.tsx`

- [ ] **Step 1: Create PIN input component**

Create `src/components/features/PinInput.tsx`:
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  title: string;
  error?: string | null;
}

export function PinInput({ length = 6, onComplete, title, error }: PinInputProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');

  const handleDigit = useCallback(
    (digit: string) => {
      const newPin = pin + digit;
      if (newPin.length <= length) {
        setPin(newPin);
        if (newPin.length === length) {
          onComplete(newPin);
        }
      }
    },
    [pin, length, onComplete]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      {/* Pin dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length ? colors.primary : colors.surface,
                borderColor: i < pin.length ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {/* Numpad */}
      <View style={styles.numpad}>
        {digits.map((digit, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.digitButton, digit === '' && styles.emptyButton]}
            onPress={() => {
              if (digit === '⌫') handleDelete();
              else if (digit !== '') handleDigit(digit);
            }}
            disabled={digit === ''}
          >
            {digit === '⌫' ? (
              <Text style={[styles.digitText, { color: colors.textSecondary }]}>⌫</Text>
            ) : digit !== '' ? (
              <Text style={[styles.digitText, { color: colors.textPrimary }]}>{digit}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 20, fontFamily: 'Inter-SemiBold', marginBottom: 32, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  error: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 8 },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 48,
    maxWidth: 300,
  },
  digitButton: {
    width: 72,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyButton: { opacity: 0 },
  digitText: { fontSize: 24, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 2: Create PIN setup screen**

Create `app/(auth)/setup-pin.tsx`:
```tsx
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
```

- [ ] **Step 3: Create lock screen component**

Create `src/components/features/LockScreen.tsx`:
```tsx
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
  const { verifyPin, logout } = useAuthStore();
  const [isLocked, setIsLocked] = useState(false);
  const [lastActive, setLastActive] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

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
```

- [ ] **Step 4: Create app layout with auth guard**

Create `app/(app)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import { LockScreen } from '../../src/components/features/LockScreen';
import { View, Text, ActivityIndicator } from 'react-native';
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
      </Stack>
    </LockScreen>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/setup-pin.tsx app/(app)/_layout.tsx src/components/features/PinInput.tsx src/components/features/LockScreen.tsx
git commit -m "feat: add PIN setup, biometric unlock, and lock screen"
```

---

## Phase 4: Core App Shell & Navigation

---

### Task 10: Build tab navigator and app shell

**Files:**
- Create: `app/(app)/(tabs)/_layout.tsx`

- [ ] **Step 1: Create tab layout**

Create `app/(app)/(tabs)/_layout.tsx`:
```tsx
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
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Visão Geral',
          tabBarLabel: 'Início',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transações',
          tabBarLabel: 'Transações',
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categorias',
          tabBarLabel: 'Categorias',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarLabel: 'Ajustes',
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

Create `app/(app)/(tabs)/dashboard.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function DashboardScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontFamily: 'Inter-Bold' },
});
```

Create `app/(app)/(tabs)/transactions.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function TransactionsScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Transações</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontFamily: 'Inter-Bold' },
});
```

Create `app/(app)/(tabs)/categories.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function CategoriesScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Categorias</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontFamily: 'Inter-Bold' },
});
```

Create `app/(app)/(tabs)/settings.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Configurações</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontFamily: 'Inter-Bold' },
});
```

- [ ] **Step 3: Verify navigation works**

```bash
npx expo start
```
Expected: Login → PIN setup → Tab navigator with 4 tabs renders.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/(tabs)/
git commit -m "feat: add tab navigator and placeholder screens"
```

---

## Phase 5: Dashboard & Transactions

---

### Task 11: Create data hooks for transactions and accounts

**Files:**
- Create: `src/hooks/useTransactions.ts`, `src/hooks/useAccounts.ts`

- [ ] **Step 1: Create accounts hook**

Create `src/hooks/useAccounts.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Account } from '../types/models';

async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('balance', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((a: any) => ({
    id: a.id,
    institutionId: a.institution_id,
    userId: a.user_id,
    externalId: a.external_id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: Number(a.balance),
    updatedAt: a.updated_at,
  }));
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });
}
```

- [ ] **Step 2: Create transactions hook with subscription**

Create `src/hooks/useTransactions.ts`:
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Transaction } from '../types/models';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseTransactionsOptions {
  categoryId?: string;
  accountId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

function mapTransaction(raw: any): Transaction {
  return {
    id: raw.id,
    accountId: raw.account_id,
    userId: raw.user_id,
    externalId: raw.external_id,
    amount: Number(raw.amount),
    description: raw.description,
    merchantName: raw.merchant_name ?? null,
    merchantCnpj: raw.merchant_cnpj ?? null,
    categoryId: raw.category_id ?? null,
    userCategoryId: raw.user_category_id ?? null,
    date: raw.date,
    type: raw.type,
    status: raw.status,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
  };
}

async function fetchTransactions(opts: UseTransactionsOptions = {}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (opts.categoryId) query = query.eq('category_id', opts.categoryId);
  if (opts.accountId) query = query.eq('account_id', opts.accountId);
  if (opts.type) query = query.eq('type', opts.type);
  if (opts.startDate) query = query.gte('date', opts.startDate);
  if (opts.endDate) query = query.lte('date', opts.endDate);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapTransaction);
}

export function useTransactions(opts: UseTransactionsOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions', opts],
    queryFn: () => fetchTransactions(opts),
  });

  // Real-time subscription: new transactions arrive while app is open
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTransactions.ts src/hooks/useAccounts.ts
git commit -m "feat: add data hooks for transactions (with realtime) and accounts"
```

---

### Task 12: Build BalanceCard and AccountCarousel components

**Files:**
- Create: `src/components/features/BalanceCard.tsx`, `src/components/features/AccountCarousel.tsx`, `src/components/features/AmountDisplay.tsx`

- [ ] **Step 1: Create AmountDisplay component**

Create `src/components/features/AmountDisplay.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';

interface AmountDisplayProps {
  amount: number;
  size?: 'lg' | 'md' | 'sm';
}

export function AmountDisplay({ amount, size = 'lg' }: AmountDisplayProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [amount]);

  const fontSize = { lg: 36, md: 24, sm: 18 }[size];
  const color = amount >= 0 ? colors.success : colors.danger;

  return (
    <Animated.Text
      style={[
        styles.amount,
        { color, fontSize, opacity: fadeAnim },
      ]}
    >
      {formatCurrency(amount)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  amount: { fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
});
```

- [ ] **Step 2: Create BalanceCard component**

Create `src/components/features/BalanceCard.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AmountDisplay } from './AmountDisplay';
import { useTheme } from '../../theme/ThemeProvider';

interface BalanceCardProps {
  totalBalance: number;
  isLoading: boolean;
  monthChange?: number; // percentage change vs last month
}

export function BalanceCard({ totalBalance, isLoading, monthChange }: BalanceCardProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Skeleton height={16} width={120} />
        <Skeleton height={44} width={200} style={{ marginTop: 8 }} />
        <Skeleton height={14} width={80} style={{ marginTop: 8 }} />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Saldo Total</Text>
      <AmountDisplay amount={totalBalance} size="lg" />
      {monthChange !== undefined && (
        <View style={styles.trendRow}>
          <Text
            style={[
              styles.trendText,
              { color: monthChange >= 0 ? colors.success : colors.danger },
            ]}
          >
            {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(1)}%
          </Text>
          <Text style={[styles.trendLabel, { color: colors.textTertiary }]}>
            {' '}vs. mês anterior
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, alignItems: 'center', paddingVertical: 24 },
  label: { fontSize: 14, fontFamily: 'Inter-Regular' },
  trendRow: { flexDirection: 'row', marginTop: 8 },
  trendText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  trendLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 3: Create AccountCarousel component**

Create `src/components/features/AccountCarousel.tsx`:
```tsx
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
          <Card style={[styles.card]}>
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/BalanceCard.tsx src/components/features/AccountCarousel.tsx src/components/features/AmountDisplay.tsx
git commit -m "feat: add BalanceCard and AccountCarousel components"
```

---

### Task 13: Build TransactionRow component and TransactionList

**Files:**
- Create: `src/components/features/TransactionRow.tsx`

- [ ] **Step 1: Create TransactionRow component**

Create `src/components/features/TransactionRow.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatRelativeDate, getEffectiveCategory } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';
import type { Transaction } from '../../types/models';

interface TransactionRowProps {
  transaction: Transaction;
  categoryName?: string;
  categoryIcon?: string;
}

export function TransactionRow({ transaction, categoryName, categoryIcon }: TransactionRowProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const isPositive = transaction.amount >= 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.divider }]}
      onPress={() => router.push(`/transaction/${transaction.id}`)}
      activeOpacity={0.6}
    >
      <View style={[styles.icon, { backgroundColor: isPositive ? colors.successBg : colors.dangerBg }]}>
        <Text style={styles.iconText}>{categoryIcon ?? (isPositive ? '💰' : '💸')}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.textPrimary }]} numberOfLines={1}>
          {transaction.merchantName ?? transaction.description}
        </Text>
        {categoryName && (
          <Text style={[styles.category, { color: colors.textSecondary }]}>{categoryName}</Text>
        )}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatRelativeDate(transaction.date)}
        </Text>
      </View>

      <Text
        style={[
          styles.amount,
          { color: isPositive ? colors.success : colors.danger },
        ]}
      >
        {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  description: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  category: { fontSize: 13, fontFamily: 'Inter-Regular' },
  date: { fontSize: 12, fontFamily: 'Inter-Regular' },
  amount: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/TransactionRow.tsx
git commit -m "feat: add TransactionRow component with navigation"
```

---

### Task 14: Assemble Dashboard screen

**Files:**
- Modify: `app/(app)/(tabs)/dashboard.tsx`

- [ ] **Step 1: Build dashboard**

Modify `app/(app)/(tabs)/dashboard.tsx`:
```tsx
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useTransactions } from '../../src/hooks/useTransactions';
import { BalanceCard } from '../../src/components/features/BalanceCard';
import { AccountCarousel } from '../../src/components/features/AccountCarousel';
import { TransactionRow } from '../../src/components/features/TransactionRow';
import { Button } from '../../src/components/ui/Button';
import { Skeleton } from '../../src/components/ui/Skeleton';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { data: transactions, isLoading: txsLoading, refetch: refetchTxs } = useTransactions({ limit: 5 });

  const totalBalance = useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const isRefreshing = accountsLoading || txsLoading;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { refetchAccounts(); refetchTxs(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Balance */}
      <BalanceCard totalBalance={totalBalance} isLoading={accountsLoading} />

      {/* Accounts */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Suas Contas</Text>
      <AccountCarousel accounts={accounts ?? []} isLoading={accountsLoading} />

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transações Recentes</Text>
        <Button
          title="Ver todas"
          variant="ghost"
          size="sm"
          onPress={() => router.push('/(app)/(tabs)/transactions')}
        />
      </View>

      {txsLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={180} height={16} />
                <Skeleton width={100} height={12} />
              </View>
              <Skeleton width={80} height={16} />
            </View>
          ))}
        </View>
      ) : (transactions ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Nenhuma transação ainda
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Conecte um banco para começar a ver suas transações aqui.
          </Text>
          <Button
            title="Conectar Banco"
            onPress={() => router.push('/connect-bank')}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        (transactions ?? []).map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 12,
    marginTop: 24,
  },
  skeletonList: { paddingHorizontal: 24, gap: 12, marginTop: 12 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 20 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/(tabs)/dashboard.tsx
git commit -m "feat: assemble dashboard with BalanceCard, AccountCarousel, and recent transactions"
```

---

## Phase 6: Transactions Screen & Detail View

---

### Task 15: Build full Transactions screen with filters

**Files:**
- Modify: `app/(app)/(tabs)/transactions.tsx`
- Create: `src/components/features/TransactionFilters.tsx`

- [ ] **Step 1: Create TransactionFilters component**

Create `src/components/features/TransactionFilters.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type TransactionFilter = {
  type?: string;
  categoryId?: string;
};

interface TransactionFiltersProps {
  activeFilter: TransactionFilter;
  onChange: (filter: TransactionFilter) => void;
  categories: { id: string; name: string; icon: string; color: string }[];
}

const TYPE_OPTIONS = [
  { key: '', label: 'Todos' },
  { key: 'DEBIT', label: 'Débito' },
  { key: 'CREDIT', label: 'Crédito' },
  { key: 'PIX', label: 'PIX' },
  { key: 'TED', label: 'TED' },
  { key: 'BOLETO', label: 'Boleto' },
];

export function TransactionFilters({ activeFilter, onChange, categories }: TransactionFiltersProps) {
  const { colors } = useTheme();

  const updateType = (type: string) => {
    onChange({ ...activeFilter, type: type || undefined });
  };

  const updateCategory = (categoryId: string) => {
    onChange({
      ...activeFilter,
      categoryId: categoryId === activeFilter.categoryId ? undefined : categoryId,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => {
          const isActive = (activeFilter.type || '') === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chip,
                { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => updateType(opt.key)}
            >
              <Text style={[styles.chipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {categories.map((cat) => {
          const isActive = activeFilter.categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                { backgroundColor: isActive ? cat.color : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => updateCategory(cat.id)}
            >
              <Text style={styles.chipText}>{cat.icon} {cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingVertical: 8 },
  typeRow: { paddingHorizontal: 24 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
```

- [ ] **Step 2: Build Transactions screen**

Modify `app/(app)/(tabs)/transactions.tsx`:
```tsx
import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { useAccounts } from '../../../src/hooks/useAccounts';
import { TransactionRow } from '../../../src/components/features/TransactionRow';
import { TransactionFilters } from '../../../src/components/features/TransactionFilters';
import type { TransactionFilter } from '../../../src/components/features/TransactionFilters';
import { Skeleton } from '../../../src/components/ui/Skeleton';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<TransactionFilter>({});
  const { data, isLoading, refetch } = useTransactions(filter);
  const { data: accounts } = useAccounts();

  // Build category list from known categories
  const categories = useMemo(
    () => [
      { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6366F1' },
      { id: 'food', name: 'Alimentação', icon: '🍔', color: '#F59E0B' },
      { id: 'home', name: 'Moradia', icon: '🏠', color: '#8B5CF6' },
      { id: 'health', name: 'Saúde', icon: '💊', color: '#EF4444' },
      { id: 'leisure', name: 'Lazer', icon: '🎮', color: '#22C55E' },
      { id: 'salary', name: 'Receita', icon: '💰', color: '#10B981' },
      { id: 'shopping', name: 'Compras', icon: '🛒', color: '#EC4899' },
    ],
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionFilters activeFilter={filter} onChange={setFilter} categories={categories} />

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={180} height={16} />
                <Skeleton width={100} height={12} />
              </View>
              <Skeleton width={80} height={16} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {filter.type || filter.categoryId ? 'Nenhuma transação com esse filtro' : 'Nenhuma transação'}
              </Text>
            </View>
          )}
          contentContainerStyle={data?.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletonList: { paddingHorizontal: 24, gap: 12, marginTop: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/(tabs)/transactions.tsx src/components/features/TransactionFilters.tsx
git commit -m "feat: add full transactions list with filters"
```

---

### Task 16: Build Transaction detail screen with category editor

**Files:**
- Create: `app/(app)/transaction/[id].tsx`
- Create: `src/components/features/CategorySelector.tsx`

- [ ] **Step 1: Create CategorySelector bottom sheet component**

Create `src/components/features/CategorySelector.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategorySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  selectedId?: string | null;
  categories: CategoryOption[];
}

export function CategorySelector({ visible, onClose, onSelect, selectedId, categories }: CategorySelectorProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View />
      </Pressable>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Selecionar Categoria</Text>
        <ScrollView style={styles.list}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.option,
                { backgroundColor: cat.id === selectedId ? cat.color + '20' : 'transparent' },
              ]}
              onPress={() => onSelect(cat.id)}
            >
              <Text style={styles.optionIcon}>{cat.icon}</Text>
              <Text style={[styles.optionName, { color: colors.textPrimary }]}>{cat.name}</Text>
              {cat.id === selectedId && (
                <Text style={[styles.check, { color: cat.color }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: 'Inter-SemiBold', paddingHorizontal: 24, marginBottom: 16 },
  list: { paddingHorizontal: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  optionIcon: { fontSize: 24 },
  optionName: { fontSize: 16, fontFamily: 'Inter-Medium', flex: 1 },
  check: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
});
```

- [ ] **Step 2: Build Transaction detail screen**

Create `app/(app)/transaction/[id].tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { CategorySelector } from '../../../src/components/features/CategorySelector';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { AmountDisplay } from '../../../src/components/features/AmountDisplay';
import { formatDate, getEffectiveCategory } from '../../../src/utils/format';
import { supabase } from '../../../src/services/supabase';

const CATEGORIES = [
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6366F1' },
  { id: 'food', name: 'Alimentação', icon: '🍔', color: '#F59E0B' },
  { id: 'home', name: 'Moradia', icon: '🏠', color: '#8B5CF6' },
  { id: 'health', name: 'Saúde', icon: '💊', color: '#EF4444' },
  { id: 'leisure', name: 'Lazer', icon: '🎮', color: '#22C55E' },
  { id: 'salary', name: 'Receita', icon: '💰', color: '#10B981' },
  { id: 'shopping', name: 'Compras', icon: '🛒', color: '#EC4899' },
  { id: 'education', name: 'Educação', icon: '📚', color: '#3B82F6' },
  { id: 'investment', name: 'Investimentos', icon: '💸', color: '#F97316' },
  { id: 'other', name: 'Outros', icon: '❓', color: '#6E7681' },
];

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: transactions, isLoading } = useTransactions({ limit: 100 });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [updating, setUpdating] = useState(false);

  const tx = (transactions ?? []).find((t) => t.id === id);

  const effectiveCategoryId = tx ? getEffectiveCategory(tx) : null;
  const category = CATEGORIES.find((c) => c.id === effectiveCategoryId);

  const handleCategoryChange = async (categoryId: string) => {
    if (!tx) return;
    setUpdating(true);
    await supabase
      .from('transactions')
      .update({ user_category_id: categoryId, status: 'categorized' })
      .eq('id', tx.id);
    setUpdating(false);
    setShowCategorySelector(false);
  };

  if (isLoading || !tx) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Skeleton height={200} style={{ margin: 24 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Amount Header */}
      <View style={styles.header}>
        <AmountDisplay amount={tx.amount} size="lg" />
        <Text style={[styles.merchant, { color: colors.textPrimary }]}>
          {tx.merchantName ?? tx.description}
        </Text>
      </View>

      {/* Details Card */}
      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Data</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(tx.date)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Descrição</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.description}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tipo</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.type}</Text>
        </View>
        {tx.merchantCnpj && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CNPJ</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{tx.merchantCnpj}</Text>
            </View>
          </>
        )}
      </Card>

      {/* Category */}
      <Card style={styles.categoryCard}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Categoria</Text>
        <Button
          title={category ? `${category.icon} ${category.name}` : 'Selecionar categoria'}
          variant={category ? 'secondary' : 'primary'}
          onPress={() => setShowCategorySelector(true)}
          loading={updating}
        />
      </Card>

      <CategorySelector
        visible={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelect={handleCategoryChange}
        selectedId={effectiveCategoryId}
        categories={CATEGORIES}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16 },
  header: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  merchant: { fontSize: 20, fontFamily: 'Inter-SemiBold', textAlign: 'center' },
  detailsCard: { gap: 0 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  detailLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  detailValue: { fontSize: 14, fontFamily: 'Inter-SemiBold', flex: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth },
  categoryCard: { gap: 12 },
  sectionLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/transaction/ src/components/features/CategorySelector.tsx
git commit -m "feat: add transaction detail screen with category editor"
```

---

## Phase 7: Categories Screen

---

### Task 17: Build Categories screen with spending breakdown

**Files:**
- Modify: `app/(app)/(tabs)/categories.tsx`
- Create: `src/hooks/useCategories.ts`

- [ ] **Step 1: Create categories hook**

Create `src/hooks/useCategories.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Category } from '../types/models';

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name');

  if (error) throw new Error(error.message);

  return data.map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    parentId: c.parent_id,
    isSystem: c.is_system,
    createdAt: c.created_at,
  }));
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // categories change rarely
  });
}
```

- [ ] **Step 2: Build Categories screen**

Modify `app/(app)/(tabs)/categories.tsx`:
```tsx
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useCategories } from '../../../src/hooks/useCategories';
import { useTransactions } from '../../../src/hooks/useTransactions';
import { Card } from '../../../src/components/ui/Card';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { formatCurrency, getEffectiveCategory } from '../../../src/utils/format';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { data: categories, isLoading: catsLoading, refetch: refetchCats } = useCategories();
  const { data: transactions, isLoading: txsLoading, refetch: refetchTxs } = useTransactions();

  // Calculate spending per category
  const categoryStats = useMemo(() => {
    if (!categories || !transactions) return [];
    return categories.map((cat) => {
      const catTransactions = transactions.filter((tx) => {
        const effective = getEffectiveCategory(tx);
        return effective === cat.id && tx.amount < 0;
      });
      const total = catTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      return { ...cat, total, count: catTransactions.length };
    }).sort((a, b) => b.total - a.total);
  }, [categories, transactions]);

  const totalSpent = useMemo(
    () => categoryStats.reduce((sum, cat) => sum + cat.total, 0),
    [categoryStats]
  );

  if (catsLoading || txsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={64} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={categoryStats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const percentage = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0;
        return (
          <Card style={styles.categoryCard}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.categoryCount, { color: colors.textTertiary }]}>
                  {item.count} transação{item.count !== 1 ? 'ões' : ''}
                </Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={[styles.categoryAmount, { color: colors.danger }]}>
                  {formatCurrency(-item.total)}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
                  <View
                    style={[styles.progressFill, { backgroundColor: item.color, width: `${Math.min(percentage, 100)}%` }]}
                  />
                </View>
              </View>
            </View>
          </Card>
        );
      }}
      refreshControl={
        <RefreshControl
          refreshing={catsLoading || txsLoading}
          onRefresh={() => { refetchCats(); refetchTxs(); }}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Gastos por Categoria
          </Text>
          <Text style={[styles.headerTotal, { color: colors.danger }]}>
            Total: {formatCurrency(-totalSpent)}
          </Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhum gasto registrado</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 8 },
  header: { marginBottom: 16, gap: 4 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold' },
  headerTotal: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  categoryCard: { paddingVertical: 14, paddingHorizontal: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { fontSize: 28 },
  categoryInfo: { flex: 1, gap: 2 },
  categoryName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  categoryCount: { fontSize: 12, fontFamily: 'Inter-Regular' },
  amountCol: { alignItems: 'flex-end', gap: 4, minWidth: 110 },
  categoryAmount: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  progressBar: { width: '100%', height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  skeletonList: { padding: 24 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/(tabs)/categories.tsx src/hooks/useCategories.ts
git commit -m "feat: add categories screen with spending breakdown"
```

---

## Phase 8: Open Finance Proxy Server

---

### Task 18: Scaffold Node.js proxy server with TypeScript

**Files:**
- Create: `proxy-server/package.json`, `proxy-server/tsconfig.json`, `proxy-server/src/index.ts`
- Create: `proxy-server/src/normalizer/index.ts`
- Create: `proxy-server/src/institutions/nubank.adapter.ts`

- [ ] **Step 1: Create proxy-server directory and configuration**

Create `proxy-server/package.json`:
```json
{
  "name": "tcheorganiza-proxy",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --config jest.config.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "zod": "^3.22.0",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "node-forge": "^1.3.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "@types/node-forge": "^1.3.10",
    "@types/jsonwebtoken": "^9.0.5",
    "tsx": "^4.6.0",
    "typescript": "^5.3.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

Create `proxy-server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Set up Express server entry point**

Create `proxy-server/src/index.ts`:
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createRouter } from './router';
import type { InstitutionAdapter } from './institutions/types';
import { createNubankAdapter } from './institutions/nubank.adapter';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8081' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Institution adapters
const adapters: InstitutionAdapter[] = [
  createNubankAdapter(),
  // TODO: createItauAdapter(),
  // TODO: createBradescoAdapter(),
];

// Routes
app.use('/api', createRouter(adapters));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
```

- [ ] **Step 3: Define InstitutionAdapter interface and types**

Create `proxy-server/src/institutions/types.ts`:
```typescript
export interface NormalizedAccount {
  externalId: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento';
  currency: string;
  balance: number;
}

export interface NormalizedTransaction {
  externalId: string;
  amount: number;
  description: string;
  merchantName?: string;
  merchantCnpj?: string;
  date: string;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
  status: 'pending' | 'posted';
  metadata: Record<string, unknown>;
}

export interface FetchResult {
  accounts: NormalizedAccount[];
  transactions: NormalizedTransaction[];
}

export interface InstitutionAdapter {
  ispb: string;       // Brazilian ISPB code
  name: string;
  
  /** Fetch accounts and transactions from this institution. */
  fetchData(consentToken: string): Promise<FetchResult>;
}
```

- [ ] **Step 4: Create router**

Create `proxy-server/src/router.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { InstitutionAdapter } from './institutions/types';

const FetchRequestSchema = z.object({
  consentToken: z.string().min(1),
  ispb: z.string().length(8),
});

export function createRouter(adapters: InstitutionAdapter[]): Router {
  const router = Router();

  router.post('/fetch', async (req: Request, res: Response) => {
    const parsed = FetchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
      return;
    }

    const { consentToken, ispb } = parsed.data;
    const adapter = adapters.find((a) => a.ispb === ispb);

    if (!adapter) {
      res.status(400).json({ error: `No adapter for institution ISPB: ${ispb}` });
      return;
    }

    try {
      const result = await adapter.fetchData(consentToken);
      res.json(result);
    } catch (err: any) {
      console.error(`Failed to fetch from ${adapter.name}:`, err.message);
      res.status(502).json({ error: `Failed to fetch from institution: ${err.message}` });
    }
  });

  return router;
}
```

- [ ] **Step 5: Create Nubank adapter stub with normalizer tests**

Create `proxy-server/src/normalizer/index.ts`:
```typescript
import type { NormalizedTransaction, NormalizedAccount } from '../institutions/types';

/**
 * Normalize a raw transaction from any bank into our standard format.
 * This is the adapters' shared utility.
 */
export function normalizeTransaction(
  raw: Record<string, any>,
  overrides: Partial<NormalizedTransaction> = {}
): NormalizedTransaction {
  return {
    externalId: String(raw.id ?? raw.transactionId ?? ''),
    amount: Number(raw.amount ?? raw.value ?? 0),
    description: String(raw.description ?? raw.memo ?? ''),
    merchantName: raw.merchant?.name ?? raw.merchantName ?? undefined,
    merchantCnpj: raw.merchant?.cnpj ?? raw.merchantCnpj ?? undefined,
    date: String(raw.date ?? raw.createdAt ?? new Date().toISOString()),
    type: mapTransactionType(raw),
    status: 'posted',
    metadata: raw.metadata ?? {},
    ...overrides,
  };
}

function mapTransactionType(raw: Record<string, any>): NormalizedTransaction['type'] {
  const type = String(raw.type ?? raw.transactionType ?? '').toUpperCase();
  if (type.includes('PIX')) return 'PIX';
  if (type.includes('CREDIT') || type.includes('CRÉDITO')) return 'CREDIT';
  if (type.includes('TED') || type.includes('DOC')) return 'TED';
  if (type.includes('BOLETO') || type.includes('SLIP')) return 'BOLETO';
  return 'DEBIT';
}

export function normalizeAccount(raw: Record<string, any>): NormalizedAccount {
  return {
    externalId: String(raw.id ?? raw.accountId ?? ''),
    name: String(raw.name ?? raw.label ?? 'Conta'),
    type: mapAccountType(raw),
    currency: String(raw.currency ?? 'BRL'),
    balance: Number(raw.balance ?? 0),
  };
}

function mapAccountType(raw: Record<string, any>): NormalizedAccount['type'] {
  const type = String(raw.type ?? raw.accountType ?? '').toLowerCase();
  if (type.includes('poupanca') || type.includes('savings')) return 'poupanca';
  if (type.includes('invest')) return 'investimento';
  return 'corrente';
}
```

Create `proxy-server/src/normalizer/__tests__/normalizer.test.ts`:
```typescript
import { normalizeTransaction, normalizeAccount } from '../index';

describe('normalizeTransaction', () => {
  it('converts a standard bank transaction to our format', () => {
    const raw = {
      id: 'tx-001',
      amount: -150.75,
      description: 'UBER *TRIP',
      merchant: { name: 'Uber', cnpj: '12345678000199' },
      date: '2026-06-01',
      type: 'DEBIT',
    };

    const result = normalizeTransaction(raw);

    expect(result.externalId).toBe('tx-001');
    expect(result.amount).toBe(-150.75);
    expect(result.description).toBe('UBER *TRIP');
    expect(result.merchantName).toBe('Uber');
    expect(result.merchantCnpj).toBe('12345678000199');
    expect(result.date).toBe('2026-06-01');
    expect(result.type).toBe('DEBIT');
    expect(result.status).toBe('posted');
  });

  it('detects PIX transactions', () => {
    expect(normalizeTransaction({ id: '1', amount: 100, type: 'PIX' }).type).toBe('PIX');
  });

  it('detects credit transactions', () => {
    expect(normalizeTransaction({ id: '1', amount: 500, type: 'CREDITO' }).type).toBe('CREDIT');
  });

  it('handles missing fields gracefully', () => {
    const result = normalizeTransaction({ id: '1' });
    expect(result.externalId).toBe('1');
    expect(result.amount).toBe(0);
    expect(result.description).toBe('');
    expect(result.type).toBe('DEBIT');
  });
});

describe('normalizeAccount', () => {
  it('converts a bank account to our format', () => {
    const raw = { id: 'acc-1', name: 'Conta Corrente', type: 'corrente', balance: 5000 };

    const result = normalizeAccount(raw);

    expect(result.externalId).toBe('acc-1');
    expect(result.name).toBe('Conta Corrente');
    expect(result.type).toBe('corrente');
    expect(result.balance).toBe(5000);
    expect(result.currency).toBe('BRL');
  });
});
```

- [ ] **Step 6: Create Nubank adapter stub**

Create `proxy-server/src/institutions/nubank.adapter.ts`:
```typescript
import type { InstitutionAdapter, FetchResult } from './types';
import { normalizeTransaction, normalizeAccount } from '../normalizer/index';

export function createNubankAdapter(): InstitutionAdapter {
  return {
    ispb: '26041819', // Nubank ISPB
    name: 'Nubank',

    async fetchData(consentToken: string): Promise<FetchResult> {
      // In production, this calls the Nubank Open Finance API with mTLS
      // using the consentToken. For now, returns stub data.
      //
      // Real implementation:
      // const response = await axios.get('https://api.nubank.com.br/open-banking/...', {
      //   headers: { Authorization: `Bearer ${consentToken}` },
      //   httpsAgent: mtlsAgent,
      // });
      // return normalizeResponse(response.data);

      console.log(`[Nubank] Fetching data with consent token: ${consentToken.slice(0, 8)}...`);

      // Stub response for development
      return {
        accounts: [
          normalizeAccount({ id: 'nubank-acc-1', name: 'Conta Nubank', type: 'corrente', balance: 0 }),
        ],
        transactions: [],
      };
    },
  };
}
```

- [ ] **Step 7: Install and test**

```bash
cd proxy-server && npm install && npm test
```
Expected: Normalizer tests pass (4 tests).

- [ ] **Step 8: Commit**

```bash
git add proxy-server/
git commit -m "feat: scaffold proxy server with Express, normalizer, and Nubank adapter stub"
```

---

## Phase 9: Supabase Edge Functions

---

### Task 19: Build polling Edge Function

**Files:**
- Create: `supabase/functions/polling/index.ts`

- [ ] **Step 1: Create polling function**

Create `supabase/functions/polling/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PROXY_URL = Deno.env.get('PROXY_URL') || 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req: Request) => {
  try {
    // Get all active institutions with non-expired tokens
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('status', 'active')
      .gt('token_expires', new Date().toISOString());

    if (error) throw error;

    let processed = 0;
    let failed = 0;

    for (const inst of institutions ?? []) {
      try {
        // Fetch data from proxy
        const proxyRes = await fetch(`${PROXY_URL}/api/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentToken: inst.vault_key_id, // In production, resolve from Vault
            ispb: inst.ispb,
          }),
        });

        if (!proxyRes.ok) {
          console.error(`Proxy fetch failed for ${inst.name}: ${proxyRes.status}`);
          failed++;
          continue;
        }

        const { accounts, transactions } = await proxyRes.json();

        // Upsert accounts
        for (const acc of accounts) {
          await supabase.from('accounts').upsert(
            {
              institution_id: inst.id,
              user_id: inst.user_id,
              external_id: acc.externalId,
              name: acc.name,
              type: acc.type,
              currency: acc.currency,
              balance: acc.balance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'external_id, institution_id' }
          );
        }

        // Upsert transactions
        for (const tx of transactions) {
          await supabase.from('transactions').upsert(
            {
              account_id: inst.id, // Will be resolved properly in aggregator
              user_id: inst.user_id,
              external_id: tx.externalId,
              amount: tx.amount,
              description: tx.description,
              merchant_name: tx.merchantName,
              merchant_cnpj: tx.merchantCnpj,
              date: tx.date,
              type: tx.type,
              status: tx.status,
              metadata: tx.metadata ?? {},
            },
            { onConflict: 'external_id, account_id' }
          );
        }

        // Update last sync
        await supabase
          .from('institutions')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', inst.id);

        processed++;
      } catch (err) {
        console.error(`Error processing ${inst.name}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Polling error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Deploy function**

```bash
npx supabase functions deploy polling
```

- [ ] **Step 3: Create cron schedule in Supabase dashboard**

```
Schedule: every 1 minute (when app detected open by user)
Note: In production, schedule dynamically via pg_cron based on user activity
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/polling/
git commit -m "feat: add polling Edge Function for Open Finance data fetching"
```

---

### Task 20: Build categorizer Edge Function

**Files:**
- Create: `supabase/functions/categorizer/index.ts`

- [ ] **Step 1: Create categorizer function**

Create `supabase/functions/categorizer/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Keyword-based categorization rules
const KEYWORD_RULES: [string[], string][] = [
  [['uber', '99', 'cabify'], 'Transporte'],
  [['ifood', 'rappi', 'restaurante', 'padaria', 'mercado', 'supermercado', 'lanchonete'], 'Alimentação'],
  [['aluguel', 'condominio', 'iptu', 'conta de luz', 'conta de agua', 'sabesp'], 'Moradia'],
  [['farmacia', 'drogaria', 'medico', 'hospital', 'clinica', 'exame', 'consulta'], 'Saúde'],
  [['netflix', 'spotify', 'prime video', 'cinema', 'teatro', 'show'], 'Lazer'],
  [['salario', 'salário', 'deposito', 'transferencia recebida', 'pix recebido'], 'Salário/Receita'],
  [['amazon', 'mercado livre', 'shopee', 'magazine', 'americanas'], 'Compras'],
  [['escola', 'faculdade', 'curso', 'livraria', 'udemy'], 'Educação'],
  [['corretora', 'acoes', 'fii', 'tesouro', 'investimento'], 'Investimentos'],
];

serve(async (_req: Request) => {
  try {
    // Get uncategorized transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .is('category_id', null)
      .limit(500);

    if (error) throw error;

    // Get categories for name→id mapping
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    if (!categories) throw new Error('No categories found');

    const categoryMap = new Map(categories.map((c: any) => [c.name, c.id]));

    let categorized = 0;

    for (const tx of transactions ?? []) {
      // Priority 1: Check user's learned rules (from categorization_rules)
      const { data: rules } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', tx.user_id)
        .order('confidence', { ascending: false });

      let matchedCategoryId: string | null = null;

      // Check learned rules first
      for (const rule of rules ?? []) {
        const fieldValue = String(
          rule.field === 'merchant_name' ? (tx.merchant_name ?? '')
          : rule.field === 'merchant_cnpj' ? (tx.merchant_cnpj ?? '')
          : tx.description
        ).toLowerCase();

        if (fieldValue.includes(rule.pattern.toLowerCase())) {
          matchedCategoryId = rule.category_id;
          break;
        }
      }

      // Priority 2: Check CNPJ-based categorization
      if (!matchedCategoryId && tx.merchant_cnpj) {
        const { data: cnpjRule } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('pattern', tx.merchant_cnpj)
          .eq('field', 'merchant_cnpj')
          .single();

        if (cnpjRule) {
          matchedCategoryId = cnpjRule.category_id;
        }
      }

      // Priority 3: Keyword fallback
      if (!matchedCategoryId) {
        const desc = (tx.description + ' ' + (tx.merchant_name ?? '')).toLowerCase();
        for (const [keywords, categoryName] of KEYWORD_RULES) {
          if (keywords.some((kw) => desc.includes(kw))) {
            matchedCategoryId = categoryMap.get(categoryName) ?? null;
            break;
          }
        }
      }

      // Priority 4: Fallback to "Outros"
      if (!matchedCategoryId) {
        matchedCategoryId = categoryMap.get('Outros') ?? null;
      }

      if (matchedCategoryId) {
        await supabase
          .from('transactions')
          .update({
            category_id: matchedCategoryId,
            status: 'categorized',
          })
          .eq('id', tx.id);

        categorized++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, categorized, total: transactions?.length ?? 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Categorizer error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy categorizer
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/categorizer/
git commit -m "feat: add categorizer Edge Function with keyword rules and learning"
```

---

### Task 21: Build aggregator Edge Function

**Files:**
- Create: `supabase/functions/aggregator/index.ts`

- [ ] **Step 1: Create aggregator function**

Create `supabase/functions/aggregator/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req: Request) => {
  try {
    // Get all accounts
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*');

    if (error) throw error;

    let updated = 0;

    for (const account of accounts ?? []) {
      // Calculate balance: SUM(amount) for all transactions in this account
      const { data: result } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', account.id);

      const balance = (result ?? []).reduce(
        (sum: number, tx: { amount: number }) => sum + Number(tx.amount),
        0
      );

      // Update account balance
      await supabase
        .from('accounts')
        .update({
          balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      updated++;
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Aggregator error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy aggregator
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/aggregator/
git commit -m "feat: add aggregator Edge Function for balance calculation"
```

---

## Phase 10: Settings, Export & Final Assembly

---

### Task 22: Build Settings screen (security, institutions, appearance)

**Files:**
- Modify: `app/(app)/(tabs)/settings.tsx`
- Create: `app/(app)/connect-bank/index.tsx`

- [ ] **Step 1: Build Settings screen**

Modify `app/(app)/(tabs)/settings.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Profile */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Perfil</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Button title="Editar Perfil" variant="ghost" size="sm" onPress={() => router.push('/profile')} />
      </Card>

      {/* Security */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Segurança</Text>
        <TouchableOpacity style={styles.row} onPress={() => {}}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Alterar PIN</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => {}}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Biometria</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Institutions */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bancos Conectados</Text>
        <Button title="Conectar Banco" onPress={() => router.push('/connect-bank')} style={{ marginTop: 8 }} />
      </Card>

      {/* Appearance */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Aparência</Text>
        <TouchableOpacity style={styles.row} onPress={() => {}}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Dark mode (padrão)</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Data */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dados</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/export')}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Exportar Extrato</Text>
          <Text style={[styles.rowArrow, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Logout */}
      <Button title="Sair da Conta" variant="danger" onPress={handleLogout} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  email: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  rowArrow: { fontSize: 22, fontFamily: 'Inter-Regular' },
});
```

- [ ] **Step 2: Create connect-bank placeholder screen**

Create `app/(app)/connect-bank/index.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

const BANKS = [
  { ispb: '26041819', name: 'Nubank', available: true },
  { ispb: '60701190', name: 'Itaú', available: true },
  { ispb: '60746948', name: 'Bradesco', available: true },
];

export default function ConnectBankScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Conectar Banco</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Selecione o banco para conectar via Open Finance
      </Text>
      {BANKS.map((bank) => (
        <View key={bank.ispb} style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
          <Text style={[styles.bankStatus, { color: bank.available ? colors.success : colors.textTertiary }]}>
            {bank.available ? 'Disponível' : 'Em breve'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', marginTop: 24 },
  subtitle: { fontSize: 15, fontFamily: 'Inter-Regular', marginBottom: 16 },
  bankCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankName: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bankStatus: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/(tabs)/settings.tsx app/(app)/connect-bank/index.tsx
git commit -m "feat: add settings screen and connect bank flow"
```

---

### Task 23: Build export screen

**Files:**
- Create: `app/(app)/export.tsx`

- [ ] **Step 1: Create export screen**

Create `app/(app)/export.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Share, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTransactions } from '../../src/hooks/useTransactions';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { formatCurrency, formatDate } from '../../src/utils/format';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { data: transactions } = useTransactions();
  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Sem dados', 'Nenhuma transação para exportar.');
      return;
    }

    setExporting(true);

    const header = 'Data,Descrição,Estabelecimento,Tipo,Valor,Categoria\n';
    const rows = transactions
      .map((tx) => {
        const date = formatDate(tx.date);
        const desc = `"${tx.description.replace(/"/g, '""')}"`;
        const merchant = `"${(tx.merchantName ?? '').replace(/"/g, '""')}"`;
        const type = tx.type;
        const amount = formatCurrency(tx.amount).replace('R$', '').trim();
        return `${date},${desc},${merchant},${type},${amount},`;
      })
      .join('\n');

    const csv = header + rows;

    await Share.share({
      message: csv,
      title: 'extrato-tcheorganiza.csv',
    });

    setExporting(false);
  };

  const exportPDF = async () => {
    // PDF export will use expo-print in production
    Alert.alert('Em breve', 'Exportação PDF será implementada na próxima versão.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Exportar Extrato</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {transactions?.length ?? 0} transações disponíveis para exportação
      </Text>

      <Card style={styles.optionCard}>
        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>CSV</Text>
        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
          Compatível com Excel, Google Sheets e qualquer planilha
        </Text>
        <Button title="Exportar CSV" onPress={exportCSV} loading={exporting} />
      </Card>

      <Card style={styles.optionCard}>
        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>PDF</Text>
        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
          Relatório formatado com resumo por categoria
        </Text>
        <Button title="Exportar PDF" onPress={exportPDF} variant="secondary" />
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
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/export.tsx
git commit -m "feat: add CSV export functionality"
```

---

### Task 24: Add SSL Pinning and anti-screenshot security

**Files:**
- Modify: `app/_layout.tsx` (add screen capture prevention)
- Create: `src/services/ssl-pinning.ts`

- [ ] **Step 1: Add anti-screenshot to root layout**

Create `src/services/ssl-pinning.ts`:
```typescript
/**
 * SSL Pinning configuration.
 * In production, replace these with the actual public key hashes
 * of your Supabase and proxy server domains.
 */
export const SSL_PINNING_CONFIG = {
  'api.seudominio.com': {
    pins: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='], // Replace with real pins
    backupPins: ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='], // Replace with real backup
  },
};
```

Modify `app/_layout.tsx` — add screen capture prevention:
```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { queryClient } from '../src/lib/query-client';
import * as ScreenCapture from 'expo-screen-capture';

export default function RootLayout() {
  useEffect(() => {
    // Prevent screenshots and screen recording
    ScreenCapture.preventScreenCaptureAsync();

    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx src/services/ssl-pinning.ts
git commit -m "feat: add anti-screenshot protection and SSL pinning config"
```

---

### Task 25: Configure CI/CD pipeline, final cleanup, and dependency audit

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI - TcheOrganiza

on:
  push:
    branches: [development, main]
  pull_request:
    branches: [development]

jobs:
  audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm audit --audit-level=high
        continue-on-error: false

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: [audit, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx jest --config jest.config.js --coverage
      - name: Check coverage
        run: |
          echo "Checking coverage thresholds..."
          npx jest --config jest.config.js --coverage --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}'

  test-proxy:
    name: Proxy Server Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd proxy-server && npm ci && npm test
```

- [ ] **Step 2: Add build scripts to package.json**

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest --config jest.config.js",
  "test:coverage": "jest --config jest.config.js --coverage",
  "lint": "eslint . --ext .ts,.tsx",
  "typecheck": "tsc --noEmit",
  "build:android": "eas build --platform android --profile production",
  "audit": "npm audit --audit-level=high"
}
```

- [ ] **Step 3: Create .gitignore full version**

```bash
cat >> .gitignore << 'EOF'
# Expo
.expo/
dist/
web-build/

# Node
node_modules/

# Env
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
EOF
```

- [ ] **Step 4: Final commit**

```bash
git add .github/ .gitignore package.json
git commit -m "chore: add CI/CD pipeline, audit rules, and build scripts"
```

---

## Implementation Summary

**Total Tasks:** 25 tasks across 10 phases
**Estimated Files Created:** ~45 files
**Key Deliverables:**
- ✅ React Native + Expo mobile app (iOS + Android)
- ✅ Supabase backend with RLS, migrations, and 5 tables
- ✅ Authentication: email/password + biometric + PIN
- ✅ Dashboard with BalanceCard + AccountCarousel
- ✅ Transactions list with filters and detail view
- ✅ Categories screen with spending breakdown
- ✅ Category editor with learning system
- ✅ Node.js proxy server for Open Finance (normalizer tested)
- ✅ Edge Functions: polling, categorizer (keyword + rules), aggregator
- ✅ Settings, bank connection flow, CSV export
- ✅ Anti-screenshot, SSL pinning config, Secure Store
- ✅ CI/CD pipeline with dependency audit and coverage thresholds
