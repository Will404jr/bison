import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const key = scryptSync(pin, salt, KEY_LEN).toString("hex");
  return `${salt}:${key}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = scryptSync(pin, salt, KEY_LEN);
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

export const hashPassword = hashPin;
export const verifyPassword = verifyPin;

const SESSION_COOKIE = "teller_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

export interface TellerSession {
  userId?: string;
  tellerId?: string;
  tillNumber?: number;
  categoryId?: string;
}

export function signSession(payload: TellerSession): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data, "utf-8").toString("base64url");
  const hmac = createHmac("sha256", SESSION_SECRET);
  hmac.update(encoded);
  const sig = hmac.digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySession(token: string): TellerSession | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const hmac = createHmac("sha256", SESSION_SECRET);
    hmac.update(encoded);
    const expected = hmac.digest("base64url");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig, "utf-8"), Buffer.from(expected, "utf-8"))) {
      return null;
    }
    const data = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(data) as TellerSession;
  } catch {
    return null;
  }
}

export function isTellerReady(session: TellerSession): session is TellerSession & { tellerId: string; tillNumber: number } {
  return !!session.tellerId && session.tillNumber != null;
}

export async function getTellerSession(): Promise<TellerSession | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
