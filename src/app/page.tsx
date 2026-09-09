"use client";
import React, { useState, useEffect } from "react";
import { useAuth, AUTHORIZED_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "@/lib/AuthContext";
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertOctagon, 
  Sparkles, 
  ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // If already logged in, redirect to admin terminal
  useEffect(() => {
    if (!loading && user && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      router.replace("/admin");
    }
  }, [user, loading, router]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setIsUnlocked(true);
        // Short pause to show the vault unlock animation
        setTimeout(() => {
          router.push("/admin");
        }, 600);
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setErrorMessage(res.error || "Authentication failed.");

        if (nextFailed >= 4) {
          setLockoutTimer(30);
          setErrorMessage("SECURITY LOCKOUT: Too many unauthorized attempts. Terminal locked for 30 seconds.");
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected security exception occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail(AUTHORIZED_ADMIN_EMAIL);
    setPassword(DEMO_ADMIN_PASSWORD);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* High-Tech Background Grid & Gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Security Header */}
      <header className="relative z-10 px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              POS Vault Locker
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                LOCKED
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">STRICT ACCESS PROTOCOL • AES-256</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            FIREBASE DATABASE SECURED
          </span>
          <span className="text-slate-600">|</span>
          <span>ADMIN ID: stacklyn96</span>
        </div>
      </header>

      {/* Main Locker Vault Screen */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Locker Vault Card */}
          <div className={`relative bg-slate-900/90 border ${isUnlocked ? "border-emerald-500 shadow-emerald-500/20" : "border-slate-800 shadow-slate-950/80"} rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all duration-500`}>
            
            {/* Vault Status Indicator */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
                isUnlocked 
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-xl shadow-emerald-500/20 scale-105" 
                  : "bg-slate-800/80 border border-slate-700 text-cyan-400 shadow-inner"
              }`}>
                {isUnlocked ? (
                  <Unlock className="w-10 h-10 animate-bounce" />
                ) : (
                  <Lock className="w-10 h-10" />
                )}
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUnlocked ? "bg-emerald-400" : "bg-cyan-400"}`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isUnlocked ? "bg-emerald-500" : "bg-cyan-500"}`} />
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-slate-100">
                {isUnlocked ? "Locker Unlocked" : "Admin Security Clearance"}
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                This POS terminal is sealed. Access is strictly restricted to the authorized administrator.
              </p>
            </div>

            {/* Error & Security Alerts */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-start gap-3 animate-shake">
                <AlertOctagon className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Security Alert</p>
                  <p className="text-red-300/90 text-xs mt-0.5 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Admin Authorized Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={lockoutTimer > 0 || isSubmitting}
                    placeholder="Enter authorized email"
                    required
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition font-mono"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Locker Passkey
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={lockoutTimer > 0 || isSubmitting}
                    placeholder="Enter master password"
                    required
                    className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition font-mono tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit / Unlock Button */}
              <button
                type="submit"
                disabled={lockoutTimer > 0 || isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm tracking-wide transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-slate-950">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    AUTHENTICATING VAULT...
                  </span>
                ) : lockoutTimer > 0 ? (
                  `LOCKOUT ACTIVE (${lockoutTimer}s)`
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    UNLOCK POS LOCKER
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Auto-Fill Banner */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  DEMO ADMIN PASSCODE
                </span>
                <button
                  type="button"
                  onClick={handleFillDemoAdmin}
                  className="text-xs text-slate-300 hover:text-cyan-400 underline font-mono cursor-pointer transition"
                >
                  Auto-Fill Credentials
                </button>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Admin Email:</span>
                  <span className="text-slate-200 font-semibold">{AUTHORIZED_ADMIN_EMAIL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Passkey:</span>
                  <span className="text-slate-200 font-semibold">{DEMO_ADMIN_PASSWORD}</span>
                </div>
              </div>
            </div>

            {/* Security Guard Notice */}
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 justify-center font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80" />
              <span>Unauthorized breach attempts will be recorded and blocked</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 px-6 text-center text-xs text-slate-500 font-mono border-t border-slate-900 bg-slate-950/50 backdrop-blur-sm">
        POS Locker System • Cloud Database Connected • Authorized Admin Session Required
      </footer>
    </div>
  );
}
