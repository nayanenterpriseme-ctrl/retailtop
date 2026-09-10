"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useRouter, usePathname } from "next/navigation";

export const AUTHORIZED_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_AUTHORIZED_ADMIN_EMAIL || "stacklyn96@gmail.com"
).trim().toLowerCase();

export const DEMO_ADMIN_PASSWORD = (
  process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "Priya@123"
).trim();

interface AuthUser {
  email: string;
  uid: string;
  role: "admin";
  displayName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLockerLocked: boolean;
  lockLocker: () => void;
  unlockLocker: (pass: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  isLockerLocked: false,
  lockLocker: () => {},
  unlockLocker: () => false,
});

const AUTH_STORAGE_KEY = "pos_vault_admin_session";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
          return parsed;
        }
      }
    } catch {
      // Ignored
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isLockerLocked, setIsLockerLocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        if (fbUser.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
          const authUser: AuthUser = {
            email: fbUser.email,
            uid: fbUser.uid,
            role: "admin",
            displayName: fbUser.displayName || "Stacklyn Admin",
          };
          setUser(authUser);
          try {
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          } catch {
            // Ignored
          }
        } else {
          // If signed in with an unauthorized email, sign out
          signOut(auth).catch(() => {});
          setUser(null);
          try {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          } catch {
            // Ignored
          }
        }
      }
      setLoading(false);
    });

    // Safety timeout: don't let loading stay true if Firebase is offline or slow
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // 2. Strict Route Protection
  useEffect(() => {
    if (loading) return;

    const isAdminRoute = pathname.startsWith("/admin");
    const isLoginPage = pathname === "/" || pathname === "/login";

    if (isAdminRoute) {
      if (!user || user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
        router.replace("/");
      }
    } else if (isLoginPage && user && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL && !isLockerLocked) {
      router.replace("/admin");
    }
  }, [user, loading, pathname, router, isLockerLocked]);

  // 3. High-Security Admin Login
  const login = async (emailInput: string, passInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passInput.trim();

    // Enforce locker-level whitelist
    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL) {
      return {
        success: false,
        error: "ACCESS DENIED: Locker is sealed. Only the designated admin (" + AUTHORIZED_ADMIN_EMAIL + ") can unlock this terminal."
      };
    }

    // Check against demo password
    const isDemoPassMatch = cleanPass === DEMO_ADMIN_PASSWORD;

    if (isDemoPassMatch) {
      const authUser: AuthUser = {
        email: AUTHORIZED_ADMIN_EMAIL,
        uid: "admin_uid_stacklyn",
        role: "admin",
        displayName: "Stacklyn Admin",
      };
      setUser(authUser);
      setIsLockerLocked(false);
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {
        // Ignored
      }

      // Sync with Firebase in background without blocking login
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
        signInWithEmailAndPassword(auth, cleanEmail, cleanPass).catch((fbErr) => {
          if (fbErr && typeof fbErr === "object" && "code" in fbErr) {
            if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
              createUserWithEmailAndPassword(auth, cleanEmail, cleanPass).catch(() => {});
            }
          }
        });
      }

      return { success: true };
    }

    // If password doesn't match demo passkey, try Firebase Auth
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        const authUser: AuthUser = {
          email: userCredential.user.email || AUTHORIZED_ADMIN_EMAIL,
          uid: userCredential.user.uid,
          role: "admin",
          displayName: userCredential.user.displayName || "Stacklyn Admin",
        };
        setUser(authUser);
        setIsLockerLocked(false);
        try {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } catch {
          // Ignored
        }
        return { success: true };
      } catch (fbErr: unknown) {
        let msg = "INVALID CREDENTIALS: Password incorrect.";
        if (fbErr && typeof fbErr === "object" && "code" in fbErr) {
          if (fbErr.code === "auth/network-request-failed") {
            msg = "Network connection failed. Please check internet access or use the demo password.";
          }
        }
        return { success: false, error: msg };
      }
    }

    return {
      success: false,
      error: "INVALID CREDENTIALS: Password incorrect. Use passkey: " + DEMO_ADMIN_PASSWORD
    };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignored
    }
    setUser(null);
    setIsLockerLocked(false);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignored
    }
    router.replace("/");
  };

  const lockLocker = () => {
    setIsLockerLocked(true);
  };

  const unlockLocker = (pass: string) => {
    if (pass.trim() === DEMO_ADMIN_PASSWORD) {
      setIsLockerLocked(false);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isLockerLocked, lockLocker, unlockLocker }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
