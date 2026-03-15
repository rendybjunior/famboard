import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY;

  // Check current subscription on mount
  useEffect(() => {
    if (!supported || !userId) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, [supported, userId]);

  // Service worker is now registered by vite-plugin-pwa via App.tsx

  const subscribe = useCallback(async () => {
    if (!supported || !userId) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subJson.endpoint!,
          subscription: subJson,
        },
        { onConflict: "user_id,endpoint" },
      );

      setIsSubscribed(true);
    } catch {
      // subscription failed
    } finally {
      setLoading(false);
    }
  }, [supported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !userId) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
    } catch {
      // unsubscribe failed
    } finally {
      setLoading(false);
    }
  }, [supported, userId]);

  return { supported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
