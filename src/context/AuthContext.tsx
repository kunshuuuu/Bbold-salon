import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_WINDOW_MS = 60 * 1000;          // 60 seconds warning before auto sign-out
const ADMIN_ALLOWED_EMAIL = 'bboldmumbaisalon@gmail.com';
const ADMIN_ALLOWED_PASS = 'bbold@2026';
const ADMIN_SESSION_STORAGE_KEY = 'bbold_admin_strict_session_v1';

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  unauthorizedMessage: string | null;
  inactivitySecondsLeft: number | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  resetInactivityTimer: () => void;
  enablePreviewAdminSession: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isLoading: true,
  unauthorizedMessage: null,
  inactivitySecondsLeft: null,
  signIn: async () => ({ error: 'Auth not initialized', isAdmin: false }),
  signOut: async () => {},
  sendPasswordReset: async () => ({ error: 'Auth not initialized' }),
  resetInactivityTimer: () => {},
  enablePreviewAdminSession: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  const checkAdminMembership = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setIsAdmin(false);
      setUnauthorizedMessage(null);
      return false;
    }

    if ((currentUser.email || '').trim().toLowerCase() !== ADMIN_ALLOWED_EMAIL) {
      setIsAdmin(false);
      setUnauthorizedMessage('You are signed in, but you are not authorized as an admin.');
      return false;
    }

    setIsAdmin(true);
    setUnauthorizedMessage(null);
    return true;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const storedEmail =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
          : null;

      if (storedEmail === ADMIN_ALLOWED_EMAIL) {
        if (mounted) {
          setUser({
            id: 'bbold-admin-owner',
            email: ADMIN_ALLOWED_EMAIL,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as User);
          setIsAdmin(true);
          setUnauthorizedMessage(null);
          setIsLoading(false);
        }
        return;
      }

      if (!isSupabaseConfigured()) {
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const sessionUser = session?.user ?? null;
        if (
          sessionUser &&
          (sessionUser.email || '').trim().toLowerCase() === ADMIN_ALLOWED_EMAIL
        ) {
          if (mounted) {
            setUser(sessionUser);
            setIsAdmin(true);
            setUnauthorizedMessage(null);
          }
        } else {
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      mounted = false;
    };
  }, [checkAdminMembership]);

  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setIsAdmin(false);
    setUnauthorizedMessage(null);
    setInactivitySecondsLeft(null);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivitySecondsLeft(null);
  }, []);

  // 30-minute inactivity auto sign-out with 60-second warning
  useEffect(() => {
    if (!user || !isAdmin) {
      setInactivitySecondsLeft(null);
      return;
    }

    lastActivityRef.current = Date.now();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
      setInactivitySecondsLeft((prev) => (prev !== null ? null : prev));
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;

      if (remainingMs <= 0) {
        void signOut();
      } else if (remainingMs <= WARNING_WINDOW_MS) {
        setInactivitySecondsLeft(Math.ceil(remainingMs / 1000));
      } else {
        setInactivitySecondsLeft(null);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.clearInterval(interval);
    };
  }, [user, isAdmin, signOut]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null; isAdmin: boolean }> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail !== ADMIN_ALLOWED_EMAIL || password !== ADMIN_ALLOWED_PASS) {
        return { error: 'Incorrect email or password', isAdmin: false };
      }

      setIsLoading(true);
      try {
        if (isSupabaseConfigured()) {
          await supabase.auth
            .signInWithPassword({
              email: normalizedEmail,
              password,
            })
            .catch(() => {});
        }

        const adminUser = {
          id: 'bbold-admin-owner',
          email: ADMIN_ALLOWED_EMAIL,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, ADMIN_ALLOWED_EMAIL);
        }

        setUser(adminUser);
        setIsAdmin(true);
        setUnauthorizedMessage(null);
        lastActivityRef.current = Date.now();
        setIsLoading(false);
        return { error: null, isAdmin: true };
      } catch {
        setIsLoading(false);
        return { error: 'Incorrect email or password', isAdmin: false };
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured yet.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    if (error) {
      return { error: 'Could not send password reset email. Please verify the address.' };
    }
    return { error: null };
  }, []);

  const enablePreviewAdminSession = useCallback(() => {
    if (isSupabaseConfigured()) return;
    setUser({
      id: 'preview-owner-uid',
      email: 'owner@bbold.preview',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);
    setIsAdmin(true);
    setUnauthorizedMessage(null);
    lastActivityRef.current = Date.now();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        unauthorizedMessage,
        inactivitySecondsLeft,
        signIn,
        signOut,
        sendPasswordReset,
        resetInactivityTimer,
        enablePreviewAdminSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
