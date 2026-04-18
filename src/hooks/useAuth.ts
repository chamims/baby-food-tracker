import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  SUPABASE_ENABLED,
  getSession,
  signInWithGoogle as signInWithGoogleHelper,
  signOutFromSupabase,
  onAuthStateChange,
  dbGetHousehold,
  dbCreateHousehold,
  dbRedeemPendingInvite,
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
  const isResolvingRef = useRef(false);

  const resolveHousehold = useCallback(async (user: User) => {
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;
    try {
      const existing = await dbGetHousehold();
      if (existing) {
        setState(prev => ({ ...prev, householdId: existing.id, authReady: true }));
        return;
      }
      // No existing membership: first try to auto-redeem a pending invite
      // matching the user's verified Google email. If none, create a new solo household.
      const redeemed = await dbRedeemPendingInvite();
      if (redeemed) {
        setState(prev => ({ ...prev, householdId: redeemed, authReady: true }));
        return;
      }
      const id = await dbCreateHousehold(user.id);
      setState(prev => ({ ...prev, householdId: id, authReady: true }));
    } catch (err) {
      console.error('Failed to resolve household:', err);
      setState(prev => ({ ...prev, authReady: true }));
    } finally {
      isResolvingRef.current = false;
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

  const signInWithGoogle = useCallback(async () => {
    await signInWithGoogleHelper();
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
  }, []);

  return { ...state, signInWithGoogle, signOut };
}
