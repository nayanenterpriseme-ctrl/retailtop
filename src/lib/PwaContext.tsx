"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Download, Monitor, Smartphone, X, Info } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
  openInstallGuide: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => false,
  openInstallGuide: () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 1. Check if already running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    mediaQuery.addEventListener("change", handleModeChange);

    // 2. Capture Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log("[PWA] Chrome beforeinstallprompt event captured.");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("[PWA] App was successfully installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", handleModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("[PWA] Install prompt outcome:", outcome);
        if (outcome === "accepted") {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          return true;
        }
        return false;
      } catch (err) {
        console.warn("[PWA] Prompt error:", err);
      }
    }
    // If native prompt is not available yet, open guide modal
    setShowGuide(true);
    return false;
  };

  const openInstallGuide = () => {
    setShowGuide(true);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: isInstallable || !isInstalled,
        isInstalled,
        promptInstall,
        openInstallGuide,
      }}
    >
      {children}

      {/* Manual Install Help Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Install POS Vault Locker</h3>
                <p className="text-xs text-slate-400 font-mono">Chrome PWA Desktop & Mobile Guide</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Desktop Chrome Instructions */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-semibold text-cyan-400 text-sm">
                  <Monitor className="w-4 h-4" />
                  <span>On Desktop Google Chrome</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                  <li>
                    Look at the <strong>right side of your Chrome address bar</strong> (URL bar).
                  </li>
                  <li>
                    Click the <strong>Install icon</strong> (a small monitor with down arrow or plus icon).
                  </li>
                  <li>
                    <strong>Alternative:</strong> Click Chrome&apos;s <strong>three dots menu (⋮)</strong> in top-right &rarr; <strong>&quot;Install POS Vault Locker...&quot;</strong> (or <strong>&quot;Save and Share&quot; &rarr; &quot;Install POS Vault Locker&quot;</strong>).
                  </li>
                </ol>
              </div>

              {/* Mobile Chrome Instructions */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-400 text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>On Mobile Chrome / Tablet</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                  <li>Tap the <strong>three dots menu (⋮)</strong> at top-right of Chrome.</li>
                  <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Confirm by tapping <strong>&quot;Install&quot;</strong>.</li>
                </ol>
              </div>

              {/* HTTPS / Localhost Requirement Notice */}
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex items-start gap-2 text-[11px] text-cyan-200">
                <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                <div>
                  <strong>Security Note:</strong> Chrome requires <strong>HTTPS</strong> or <strong>localhost</strong> (e.g. <code>http://localhost:3000</code>). If opening via raw IP (e.g. <code>192.168.x.x</code>), Chrome blocks the address bar install icon.
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}

export const usePwa = () => useContext(PwaContext);
