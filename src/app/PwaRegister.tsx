"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service worker active, scope:", reg.scope);
          // Check for service worker updates
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration notice:", err);
        });
    }
  }, []);

  return null;
}
