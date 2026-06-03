import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { user, setUser, setSession } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
    const currentUser = useAuthStore.getState().user;

    if (!currentUser && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (currentUser && inAuthGroup) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }, [user, segments, isReady]);

  return { isReady };
}
