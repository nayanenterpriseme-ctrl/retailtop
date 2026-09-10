const CACHE_NAME = "pos-vault-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[SW] Precache warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never touch third-party requests (e.g. Firebase Auth / Firestore)
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js Server Components / RSC client navigation queries or APIs
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/api/")) {
    return;
  }

  // 1. Static immutable Next.js chunks, fonts, and images: Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|svg|jpg|jpeg|webp|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 2. Navigation / Page loads: Network-First with safe offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Attempt to match the exact page requested
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;

          // If offline and request is for home or not found, try cached root
          if (url.pathname === "/" || url.pathname === "/login") {
            const root = await caches.match("/");
            if (root) return root;
          }

          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline - POS Vault</title><meta name='viewport' content='width=device-width, initial-scale=1'></head><body style='background:#020617;color:#e2e8f0;font-family:monospace;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center;padding:20px;'><div style='max-width:400px;border:1px solid #06b6d4;border-radius:12px;padding:24px;'><h2>POS VAULT OFFLINE</h2><p style='color:#94a3b8;font-size:13px;'>Network connection lost. Please reconnect to access the cloud terminal.</p><button onclick='window.location.reload()' style='margin-top:12px;padding:8px 16px;background:#06b6d4;border:none;border-radius:8px;cursor:pointer;font-weight:bold;'>Retry Connection</button></div></body></html>",
            {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        })
    );
    return;
  }

  // 3. All other requests: Network-first
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        if (networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME);
  }
});
