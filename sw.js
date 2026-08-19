/* =========================================================
   SAYEED CALCULATOR — SERVICE WORKER
   Version: 3.0
   Features:
   - Offline support
   - Smart caching
   - Automatic cache cleanup
   - Network-first for HTML/navigation
   - Cache-first for static assets
   - Safe fallback
   ========================================================= */

"use strict";

const CACHE_NAME = "sayeed-calculator-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg.png"
];

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error(
          "[Sayeed Calculator] Cache installation failed:",
          error
        );
      })
  );
});

/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error(
          "[Sayeed Calculator] Cache cleanup failed:",
          error
        );
      })
  );
});

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Ignore browser extensions and unsupported protocols
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  /* -------------------------------------------------------
     HTML / NAVIGATION
     Network First
     ------------------------------------------------------- */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  /* -------------------------------------------------------
     Static Assets
     Cache First
     ------------------------------------------------------- */

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Do not cache invalid responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === "opaque"
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // Safe fallback for failed requests
          return new Response(
            "Offline — resource unavailable.",
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        });
    })
  );
});

/* =========================================================
   MESSAGE HANDLER
   Allows app.js to control the service worker.
   ========================================================= */

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  /* Force service worker activation */
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  /* Clear all application caches */
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) =>
              caches.delete(cacheName)
            )
          );
        })
    );
  }
});
