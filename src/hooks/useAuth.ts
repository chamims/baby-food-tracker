import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  SUPABASE_ENABLED,
  getSession,
  signInWithOtp,
  signOutFromSupabase,
  onAuthStateChange,
  dbGetHousehold,
  dbCreateHousehold,
} from '../utils/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  householdId: string | null;
  authReady: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    householdId: null,
    authReady: !SUPABASE_ENABLED,
  });

  const resolveHousehold = useCallback(async (user: User) => {
    try {
      const existing = await dbGetHousehold();
      if (existing) {
        setState(prev => ({ ...prev, householdId: existing.id, authReady: true }));
        return;
      }
      const id = await dbCreateHousehold(user.id);
      setState(prev => ({ ...prev, householdId: id, authReady: true }));
    } catch (err) {
      console.error('Failed to resolve household:', err);
      setState(prev => ({ ...prev, authReady: true }));
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    getSession().then(session => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        resolveHousehold(session.user);
      } else {
        setState(prev => ({ ...prev, authReady: true }));
      }
    });

    return onAuthStateChange(session => {
      if (session) {
        setState(prev => ({
          ...prev,
          session,
          user: session.user,
          householdId: null,
          authReady: false,
        }));
        resolveHousehold(session.user);
      } else {
        setState({ session: null, user: null, householdId: null, authReady: true });
      }
    });
  }, [resolveHousehold]);

  const signIn = useCallback(async (email: string) => {
    await signInWithOtp(email);
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
  }, []);

  return { ...state, signIn, signOut };
}
