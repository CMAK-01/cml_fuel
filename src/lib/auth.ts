import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "cml_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  department: string;
};

type SessionPayload = SessionUser & { exp: number };

function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", getJwtSecret()).update(value).digest("base64url");
}

export function createSessionToken(user: SessionUser): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

export function readSessionToken(token?: string): SessionUser | null {
  if (!token) return null;
  const [header, payload, signature, ...extra] = token.split(".");
  if (!header || !payload || !signature || extra.length > 0) return null;

  const expected = sign(`${header}.${payload}`);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.id || !parsed.email || !parsed.role || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    const { exp: _exp, ...user } = parsed;
    return user;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionUser | null {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return readSessionToken(token);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, Buffer.from(salt, "hex"), 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function requireRole(request: Request, roles: string[]): SessionUser {
  const user = getSessionFromRequest(request);
  if (!user || !roles.includes(user.role)) throw new Error("UNAUTHORIZED");
  return user;
}
