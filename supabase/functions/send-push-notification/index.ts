// Supabase Edge Function: send-push-notification
//
// Called by a database webhook when a new reading_entry or redemption is inserted.
// Sends Web Push notifications to all parents in the family.
//
// Required env vars (set via Supabase dashboard > Edge Functions > Secrets):
//   VAPID_PRIVATE_KEY  - VAPID private key (base64url-encoded)
//   VAPID_PUBLIC_KEY   - VAPID public key (base64url-encoded)
//   SUPABASE_URL       - auto-provided
//   SUPABASE_SERVICE_ROLE_KEY - auto-provided

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Web Push crypto helpers ---

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidKeys() {
  const privateKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY);
  const publicKeyBytes = base64urlToUint8Array(VAPID_PUBLIC_KEY);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  return { privateKey, publicKeyBytes };
}

async function createVapidAuthHeader(audience: string) {
  const { privateKey, publicKeyBytes } = await importVapidKeys();

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:noreply@famboard.app",
  };

  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(encoder.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsigned),
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes[0] === 0x30) {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    const rBytes = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigBytes.slice(sStart, sStart + sLen);
    // Pad/trim to 32 bytes each
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes.length < 32 ? new Uint8Array([...new Array(32 - rBytes.length).fill(0), ...rBytes]) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes.length < 32 ? new Uint8Array([...new Array(32 - sBytes.length).fill(0), ...sBytes]) : sBytes;
  } else {
    // Already raw
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${unsigned}.${uint8ArrayToBase64url(rawSig)}`;
  const publicKeyB64 = uint8ArrayToBase64url(publicKeyBytes);

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyB64}`,
  };
}

async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) {
  const clientPublicKey = base64urlToUint8Array(subscription.keys.p256dh);
  const clientAuth = base64urlToUint8Array(subscription.keys.auth);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey),
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256,
    ),
  );

  const encoder = new TextEncoder();

  // HKDF-based key derivation (RFC 8291)
  async function hkdf(
    salt: Uint8Array,
    ikm: Uint8Array,
    info: Uint8Array,
    length: number,
  ): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt));
    const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const infoWithCounter = new Uint8Array([...info, 1]);
    const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
    return okm.slice(0, length);
  }

  // Auth secret info
  const authInfo = new Uint8Array([
    ...encoder.encode("WebPush: info\0"),
    ...clientPublicKey,
    ...localPublicKeyRaw,
  ]);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Content encryption key
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = new Uint8Array([...encoder.encode(payload), 2]); // padding delimiter
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // Build aes128gcm content coding header
  const recordSize = encrypted.length;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize + 16 + 4 + 1 + localPublicKeyRaw.length, false);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: object,
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const { authorization } = await createVapidAuthHeader(audience);
    const body = await encryptPayload(subscription, JSON.stringify(payload));

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: authorization,
        TTL: "86400",
        Urgency: "normal",
      },
      body,
    });

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

// --- Main handler ---

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Database webhook payload: { type, table, record, ... }
    const record = body.record;
    if (!record || record.status !== "pending") {
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the kid's display name
    const { data: kidMember } = await supabase
      .from("family_members")
      .select("display_name, family_id")
      .eq("id", record.kid_id)
      .single();

    if (!kidMember) {
      return new Response("Kid not found", { status: 200 });
    }

    // Get all parent user_ids in this family
    const { data: parents } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", kidMember.family_id)
      .eq("role", "parent");

    if (!parents || parents.length === 0) {
      return new Response("No parents", { status: 200 });
    }

    const parentUserIds = parents.map((p: { user_id: string }) => p.user_id);

    // Get push subscriptions for these parents
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", parentUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No subscriptions", { status: 200 });
    }

    // Determine notification content
    const table = body.table;
    const isReading = table === "reading_entries";
    const title = "FamBoard";
    const notifBody = isReading
      ? `${kidMember.display_name} logged ${record.minutes} min of reading`
      : `${kidMember.display_name} wants ${record.minutes} min of screen time`;

    const payload = { title, body: notifBody, url: "/approvals" };

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((s: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }) =>
        sendPush(s.subscription, payload),
      ),
    );

    // Clean up failed subscriptions (410 Gone)
    const failed = results.filter((r) => r.status === "fulfilled" && !r.value).length;

    return new Response(
      JSON.stringify({
        sent: subscriptions.length,
        failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
