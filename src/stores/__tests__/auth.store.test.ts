import { useAuthStore } from '../auth.store';

// Mock supabase module first
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
jest.mock('../../services/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mock-salt'),
  hash: jest.fn().mockResolvedValue('mock-hash'),
  compare: jest.fn(),
}));

// Mock SecureStore with a persistent store
const secureStore: Record<string, string | null> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockImplementation((key: string) =>
    Promise.resolve(secureStore[key] ?? null)
  ),
  setItemAsync: jest.fn().mockImplementation((key: string, value: string) => {
    secureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn().mockImplementation((key: string) => {
    delete secureStore[key];
    return Promise.resolve();
  }),
}));

function resetState() {
  Object.keys(secureStore).forEach((k) => delete secureStore[k]);
  useAuthStore.setState({
    user: null,
    session: null,
    isLoading: false,
    isBiometricAvailable: false,
    pinAttempts: 0,
    pinBlockedUntil: null,
  });
  jest.clearAllMocks();
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcryptjs = require('bcryptjs');

// ============================================
// Session state
// ============================================
describe('useAuthStore — session state', () => {
  beforeEach(resetState);

  it('initial state has null user and session', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('setUser updates the user', () => {
    useAuthStore.getState().setUser({ id: '123' } as any);
    expect(useAuthStore.getState().user).toEqual({ id: '123' });
  });

  it('login success sets user and session', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: '1' }, session: { access_token: 'tok' } },
      error: null,
    });

    const { error } = await useAuthStore.getState().login('a@b.com', 'pass');

    expect(error).toBeNull();
    expect(useAuthStore.getState().user).toEqual({ id: '1' });
    expect(useAuthStore.getState().session).toEqual({ access_token: 'tok' });
  });

  it('login failure returns error message', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    });

    const { error } = await useAuthStore.getState().login('a@b.com', 'wrong');

    expect(error).toBe('Invalid credentials');
    expect(useAuthStore.getState().user).toBeNull();
  });
});

// ============================================
// PIN management
// ============================================
describe('useAuthStore — PIN management', () => {
  beforeEach(resetState);

  it('isPinSet returns false when no PIN stored', async () => {
    expect(await useAuthStore.getState().isPinSet()).toBe(false);
  });

  it('setupPin stores bcrypt hash', async () => {
    await useAuthStore.getState().setupPin('123456');

    expect(secureStore['tcheorganiza_pin_hash']).toBe('mock-hash');
    expect(secureStore['tcheorganiza_pin_attempts']).toBe('0');
  });

  it('setupPin throws if PIN already set', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'existing';

    await expect(useAuthStore.getState().setupPin('111111'))
      .rejects.toThrow('PIN já configurado');
  });

  it('isPinSet returns true after setupPin', async () => {
    await useAuthStore.getState().setupPin('123456');
    expect(await useAuthStore.getState().isPinSet()).toBe(true);
  });

  it('verifyPin returns true for correct PIN', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'stored-hash';
    bcryptjs.compare.mockResolvedValueOnce(true);

    const result = await useAuthStore.getState().verifyPin('123456');

    expect(result).toBe(true);
    expect(useAuthStore.getState().pinAttempts).toBe(0);
  });

  it('verifyPin increments attempts and persists on failure', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'stored-hash';
    bcryptjs.compare.mockResolvedValueOnce(false);

    const result = await useAuthStore.getState().verifyPin('wrong');

    expect(result).toBe(false);
    expect(useAuthStore.getState().pinAttempts).toBe(1);
    expect(secureStore['tcheorganiza_pin_attempts']).toBe('1');
  });

  it('verifyPin blocks after MAX_PIN_ATTEMPTS (5) and persists block', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'stored-hash';
    bcryptjs.compare.mockResolvedValue(false);
    useAuthStore.setState({ pinAttempts: 4 });

    const before = Date.now();
    const result = await useAuthStore.getState().verifyPin('wrong');

    expect(result).toBe(false);
    expect(useAuthStore.getState().pinAttempts).toBe(5);
    expect(useAuthStore.getState().pinBlockedUntil).toBeGreaterThanOrEqual(before + 30000);
    expect(secureStore['tcheorganiza_pin_blocked_until']).toBeTruthy();
  });

  it('verifyPin returns false during active lockout', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'stored-hash';
    useAuthStore.setState({ pinBlockedUntil: Date.now() + 20000 });

    const result = await useAuthStore.getState().verifyPin('123456');

    expect(result).toBe(false);
    // bcrypt.compare should not be called during lockout
    expect(bcryptjs.compare).not.toHaveBeenCalled();
  });

  it('verifyPin clears expired block on next attempt', async () => {
    secureStore['tcheorganiza_pin_hash'] = 'stored-hash';
    useAuthStore.setState({ pinAttempts: 5, pinBlockedUntil: Date.now() - 1000 });
    bcryptjs.compare.mockResolvedValueOnce(false);

    await useAuthStore.getState().verifyPin('wrong');

    // Block was expired, so it gets cleared
    expect(useAuthStore.getState().pinAttempts).toBe(1);
    expect(useAuthStore.getState().pinBlockedUntil).toBeNull();
  });

  it('verifyPin returns false when no PIN stored', async () => {
    expect(await useAuthStore.getState().verifyPin('123456')).toBe(false);
  });
});

// ============================================
// hydratePinState (survive app restart)
// ============================================
describe('useAuthStore — hydratePinState', () => {
  beforeEach(resetState);

  it('restores pinAttempts from SecureStore', async () => {
    secureStore['tcheorganiza_pin_attempts'] = '3';

    await useAuthStore.getState().hydratePinState();

    expect(useAuthStore.getState().pinAttempts).toBe(3);
  });

  it('restores active block from SecureStore', async () => {
    const futureBlock = Date.now() + 15000;
    secureStore['tcheorganiza_pin_attempts'] = '5';
    secureStore['tcheorganiza_pin_blocked_until'] = String(futureBlock);

    await useAuthStore.getState().hydratePinState();

    expect(useAuthStore.getState().pinAttempts).toBe(5);
    expect(useAuthStore.getState().pinBlockedUntil).toBe(futureBlock);
  });

  it('clears expired block during hydration', async () => {
    secureStore['tcheorganiza_pin_attempts'] = '5';
    secureStore['tcheorganiza_pin_blocked_until'] = String(Date.now() - 1000);

    await useAuthStore.getState().hydratePinState();

    expect(useAuthStore.getState().pinAttempts).toBe(0);
    expect(useAuthStore.getState().pinBlockedUntil).toBeNull();
  });

  it('defaults to zero when nothing stored', async () => {
    await useAuthStore.getState().hydratePinState();

    expect(useAuthStore.getState().pinAttempts).toBe(0);
    expect(useAuthStore.getState().pinBlockedUntil).toBeNull();
  });
});

// ============================================
// resetPinAttempts
// ============================================
describe('useAuthStore — resetPinAttempts', () => {
  beforeEach(resetState);

  it('clears attempts and block from memory and SecureStore', async () => {
    useAuthStore.setState({ pinAttempts: 5, pinBlockedUntil: Date.now() + 10000 });
    secureStore['tcheorganiza_pin_blocked_until'] = String(Date.now() + 10000);

    await useAuthStore.getState().resetPinAttempts();

    expect(useAuthStore.getState().pinAttempts).toBe(0);
    expect(useAuthStore.getState().pinBlockedUntil).toBeNull();
    expect(secureStore['tcheorganiza_pin_blocked_until']).toBeUndefined();
  });
});

// ============================================
// logout
// ============================================
describe('useAuthStore — logout', () => {
  beforeEach(resetState);

  it('clears everything and signs out', async () => {
    useAuthStore.setState({
      user: { id: '1' } as any,
      session: { access_token: 'x' } as any,
      pinAttempts: 3,
      pinBlockedUntil: Date.now() + 1000,
    });
    secureStore['tcheorganiza_pin_hash'] = 'hash';
    secureStore['tcheorganiza_pin_attempts'] = '3';
    secureStore['tcheorganiza_pin_blocked_until'] = String(Date.now() + 1000);

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().pinAttempts).toBe(0);
    expect(useAuthStore.getState().pinBlockedUntil).toBeNull();
    expect(secureStore['tcheorganiza_pin_hash']).toBeUndefined();
    expect(secureStore['tcheorganiza_pin_attempts']).toBeUndefined();
    expect(secureStore['tcheorganiza_pin_blocked_until']).toBeUndefined();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
