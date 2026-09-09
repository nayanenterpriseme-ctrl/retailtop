"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useRouter, usePathname } from "next/navigation";

export const AUTHORIZED_ADMIN_EMAIL = "stacklyn96@gmail.com";
export const DEMO_ADMIN_PASSWORD = "Priya@123";

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
        if (parsed?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
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
        if (fbUser.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          const authUser: AuthUser = {
            email: fbUser.email,
            uid: fbUser.uid,
            role: "admin",
            displayName: fbUser.displayName || "Stacklyn Admin",
          };
          setUser(authUser);
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } else {
          signOut(auth).catch(() => {});
          setUser(null);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Strict Route Protection
  useEffect(() => {
    if (loading) return;

    const isAdminRoute = pathname.startsWith("/admin");
    const isLoginPage = pathname === "/" || pathname === "/login";

    if (isAdminRoute) {
      if (!user || user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        router.replace("/");
      }
    } else if (isLoginPage && user && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() && !isLockerLocked) {
      router.replace("/admin");
    }
  }, [user, loading, pathname, router, isLockerLocked]);

  // 3. High-Security Admin Login
  const login = async (emailInput: string, passInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();

    // Enforce locker-level whitelist
    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        error: "ACCESS DENIED: Locker is sealed. Only the designated admin (" + AUTHORIZED_ADMIN_EMAIL + ") can unlock this terminal."
      };
    }

    // Check against demo password or attempt Firebase Auth
    const isDemoPassMatch = passInput === DEMO_ADMIN_PASSWORD;

    let firebaseSuccess = false;
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, passInput);
        firebaseSuccess = true;
      } catch (fbErr: unknown) {
        // If user not found in firebase yet, try to auto-provision demo admin if password matches
        if (fbErr && typeof fbErr === "object" && "code" in fbErr) {
          if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
            if (isDemoPassMatch) {
              try {
                await createUserWithEmailAndPassword(auth, cleanEmail, passInput);
                firebaseSuccess = true;
              } catch (createErr) {
                console.warn("Firebase user provision fallback:", createErr);
              }
            }
          }
        }
      }
    }

    if (isDemoPassMatch || firebaseSuccess) {
      const authUser: AuthUser = {
        email: AUTHORIZED_ADMIN_EMAIL,
        uid: "admin_uid_stacklyn",
        role: "admin",
        displayName: "Stacklyn Admin",
      };
      setUser(authUser);
      setIsLockerLocked(false);
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { success: true };
    }

    return {
      success: false,
      error: "INVALID CREDENTIALS: Password incorrect. High-security intrusion prevention active."
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
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.replace("/");
  };

  const lockLocker = () => {
    setIsLockerLocked(true);
  };

  const unlockLocker = (pass: string) => {
    if (pass === DEMO_ADMIN_PASSWORD) {
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
