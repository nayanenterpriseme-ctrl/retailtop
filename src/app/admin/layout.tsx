"use client";
import React, { useState } from "react";
import { useAuth, AUTHORIZED_ADMIN_EMAIL } from "@/lib/AuthContext";
import { usePwa } from "@/lib/PwaContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingCart, 
  Package, 
  Receipt, 
  LogOut, 
  Lock, 
  ShieldCheck, 
  Unlock, 
  User, 
  Store,
  Menu,
  X,
  CalendarDays,
  RotateCcw,
  Download
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isLockerLocked, lockLocker, unlockLocker } = useAuth();
  const { promptInstall, isInstalled } = usePwa();
  const pathname = usePathname();
  const [unlockPass, setUnlockPass] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-sm tracking-wider text-slate-400">VERIFYING ADMIN SECURITY CLEARANCE...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not the authorized admin email, don't show admin contents
  if (!user || user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  // If locker is temporarily locked by admin
  if (isLockerLocked) {
    const handleUnlockSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const ok = unlockLocker(unlockPass);
      if (!ok) {
        setUnlockError("Invalid passkey. Locker remains sealed.");
      } else {
        setUnlockPass("");
        setUnlockError("");
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Terminal Locked</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Admin session active for <span className="text-cyan-400 font-semibold">{user.email}</span>
          </p>

          {unlockError && (
            <div className="mt-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              {unlockError}
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Enter master passkey"
              value={unlockPass}
              onChange={(e) => setUnlockPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Resume POS Session
            </button>
          </form>

          <button
            onClick={() => logout()}
            className="mt-4 text-xs text-slate-500 hover:text-red-400 font-mono transition"
          >
            End Session & Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "POS Terminal", href: "/admin", icon: ShoppingCart },
    { name: "Inventory Management", href: "/admin/inventory", icon: Package },
    { name: "Product Date Filter", href: "/admin/products", icon: CalendarDays },
    { name: "Customer Master", href: "/admin/customers", icon: User },
    { name: "Sales & Receipts", href: "/admin/sales", icon: Receipt },
    { name: "Sales Returns", href: "/admin/returns", icon: RotateCcw },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900/90 border-r border-slate-800 flex-col justify-between backdrop-blur-md">
        <div>
          {/* Logo Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-md shadow-cyan-500/10">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Store className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">POS Locker</h1>
                <p className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  ADMIN SECURED
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-slate-500 px-3 py-1.5">Navigation</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User & Locker Control Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 truncate">Stacklyn Admin</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Admin Privileges</span>
            </div>
          </div>

          <button
            onClick={promptInstall}
            className="w-full mb-2.5 px-2.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer"
            title="Install POS Application"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalled ? "App Installed" : "Install App"}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={lockLocker}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 transition"
              title="Lock Terminal"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Lock
            </button>
            <button
              onClick={() => logout()}
              className="px-2.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-mono flex items-center justify-center gap-1.5 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 px-6 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-sm font-semibold text-slate-200">
              {navItems.find((n) => n.href === pathname)?.name || "POS Dashboard"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={promptInstall}
              className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Install POS Application"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isInstalled ? "Installed" : "Install App"}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin: {AUTHORIZED_ADMIN_EMAIL}</span>
            </div>
            <button
              onClick={lockLocker}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Quick Lock Terminal"
            >
              <Lock className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    pathname === item.href ? "bg-cyan-500/10 text-cyan-400" : "text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => logout()}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
