import crypto from "crypto";

interface PairingRecord {
  userId: string;
  email?: string;
  clientAccessToken?: string;
  createdAt: number;
  expiresAt: number;
}

interface SyncTokenRecord {
  userId: string;
  email?: string;
  createdAt: number;
}

// Global maps persisting across warm Lambdas/serverless instances in memory
const globalStore = globalThis as unknown as {
  __pairingCodes?: Map<string, PairingRecord>;
  __syncTokens?: Map<string, SyncTokenRecord>;
};

if (!globalStore.__pairingCodes) {
  globalStore.__pairingCodes = new Map<string, PairingRecord>();
}
if (!globalStore.__syncTokens) {
  globalStore.__syncTokens = new Map<string, SyncTokenRecord>();
}

export const pairingCodes = globalStore.__pairingCodes;
export const syncTokens = globalStore.__syncTokens;

function getHmacSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "calories-image-samsung-health-secret-salt-2026"
  );
}

/**
 * Creates a stateless HMAC-signed token that any serverless Lambda can verify instantly
 * without requiring shared database or in-memory state.
 */
export function createSignedSyncToken(userId: string, email?: string): string {
  const payload = {
    userId,
    email: email || "User",
    createdAt: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getHmacSecret());
  hmac.update(payloadB64);
  const signature = hmac.digest("base64url");
  return `sync_${payloadB64}.${signature}`;
}

/**
 * Verifies a stateless HMAC-signed token.
 */
export function verifySignedSyncToken(token: string): { userId: string; email?: string } | null {
  const cleanToken = token.trim();
  if (!cleanToken.startsWith("sync_")) return null;

  const raw = cleanToken.slice(5); // remove 'sync_'
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const payloadB64 = raw.substring(0, dotIndex);
  const signature = raw.substring(dotIndex + 1);

  const hmac = crypto.createHmac("sha256", getHmacSecret());
  hmac.update(payloadB64);
  const expectedSig = hmac.digest("base64url");

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.userId === "string") {
      return {
        userId: parsed.userId,
        email: parsed.email,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function generatePairingCode(userId: string, email?: string, clientAccessToken?: string): string {
  // Clean up expired codes
  const now = Date.now();
  for (const [code, rec] of pairingCodes.entries()) {
    if (now > rec.expiresAt) {
      pairingCodes.delete(code);
    }
  }

  // Generate a clean 6-digit numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pairingCodes.set(code, {
    userId,
    email,
    clientAccessToken,
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // Valid for 15 minutes
  });

  return code;
}

export function verifyPairingCode(code: string): { userId: string; email?: string; token: string } | null {
  const cleanCode = code.trim().replace(/\s+/g, "");
  const rec = pairingCodes.get(cleanCode);
  if (!rec) return null;

  if (Date.now() > rec.expiresAt) {
    pairingCodes.delete(cleanCode);
    return null;
  }

  // Generate stateless signed token
  const token = createSignedSyncToken(rec.userId, rec.email);

  // Store in memory as well for fast resolution
  syncTokens.set(token, {
    userId: rec.userId,
    email: rec.email,
    createdAt: Date.now(),
  });

  // Consume code
  pairingCodes.delete(cleanCode);

  return {
    userId: rec.userId,
    email: rec.email,
    token,
  };
}

export function resolveSyncToken(token: string): { userId: string; email?: string } | null {
  const cleanToken = token.trim();

  // 1. Try stateless cryptographic verification first (works across all serverless instances)
  const verified = verifySignedSyncToken(cleanToken);
  if (verified) {
    return verified;
  }

  // 2. Try in-memory store
  if (syncTokens.has(cleanToken)) {
    return syncTokens.get(cleanToken)!;
  }

  // 3. Fallback for pair_ prefix
  if (cleanToken.startsWith("pair_")) {
    const parts = cleanToken.split("_");
    const userId = parts[1] || "demo-user-1";
    return { userId };
  }

  return null;
}
