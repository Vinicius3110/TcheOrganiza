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
