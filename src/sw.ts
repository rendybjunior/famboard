/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// Take control immediately on install/activate
self.skipWaiting();
clientsClaim();

// Precache all Vite build assets (injected by vite-plugin-pwa)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// --- Push Notifications (carried over from public/sw.js) ---

self.addEventListener("push", (event) => {
  let data = { title: "FamBoard", body: "You have a new notification", url: "" };
  try {
    data = event.data?.json();
  } catch {
    // fallback to default
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url || "/approvals" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
