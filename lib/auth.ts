/**
 * lib/auth.ts
 *
 * JWT auth helpers for Next.js App Router API routes.
 *
 * Usage in a route handler:
 *   import { requireAuth, optionalAuth } from '@/lib/auth';
 *
 *   export async function GET(req: Request) {
 *     const user = await requireAuth(req);   // throws 401 if no token
 *     const user = await optionalAuth(req);  // returns null if no token
 *   }
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getUserById } from './db';

const JWT_SECRET  = process.env.JWT_SECRET ?? 'change-me';
const JWT_EXPIRES = 30 * 24 * 60 * 60; // 30 days

// ─── JWT (no external dep) ────────────────────────────────────────────────────

function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function signJWT(payload: Record<string, unknown>): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body   = b64url(Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES,
  })));
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split('.');
    const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64').toString()) as Record<string, unknown>;
    if ((payload.exp as number) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise<string>((res, rej) =>
    crypto.scrypt(password, salt, 64, (err, key) => err ? rej(err) : res(key.toString('hex')))
  );
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const derived = await new Promise<string>((res, rej) =>
    crypto.scrypt(password, salt, 64, (err, key) => err ? rej(err) : res(key.toString('hex')))
  );
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

// ─── Token extraction ─────────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const url   = new URL(req.url);
  return url.searchParams.get('token');
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  plan: string;
};

export async function requireAuth(req: Request): Promise<AuthUser> {
  const token   = extractToken(req);
  const payload = token ? verifyJWT(token) : null;

  if (!payload?.sub) {
    throw new AuthError('Authentication required', 401);
  }

  return {
    id:    payload.sub as string,
    email: payload.email as string,
    plan:  payload.plan as string,
  };
}

export async function optionalAuth(req: Request): Promise<AuthUser | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

// ─── Plan enforcement ─────────────────────────────────────────────────────────

const PLAN_HIERARCHY = ['free', 'past_due', 'starter', 'pro'];

export function requirePlan(user: AuthUser, minPlan: string) {
  const userLevel = PLAN_HIERARCHY.indexOf(user.plan ?? 'free');
  const reqLevel  = PLAN_HIERARCHY.indexOf(minPlan);

  if (userLevel < reqLevel) {
    throw new AuthError(
      JSON.stringify({
        error: `${minPlan} plan required`,
        code:  'PLAN_UPGRADE_REQUIRED',
        currentPlan: user.plan,
        requiredPlan: minPlan,
        upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      }),
      402
    );
  }
}

// ─── Admin role check ────────────────────────────────────────────────────────
// Role lives on the users table (not in the JWT) so role changes take effect
// immediately without re-signing tokens. Always a DB lookup — cheap.

import { pool } from './db';

export async function requireAdmin(req: Request): Promise<AuthUser & { role: string }> {
  const user = await requireAuth(req);
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [user.id]);
  const role = (rows[0]?.role as string | undefined) ?? 'buyer';
  if (role !== 'admin') {
    throw new AuthError('Admin access required', 403);
  }
  return { ...user, role };
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// ─── Route handler wrapper ────────────────────────────────────────────────────

type RouteHandler = (req: Request, ctx?: unknown) => Promise<Response>;

export function withAuth(handler: (req: Request, user: AuthUser, ctx?: unknown) => Promise<Response>): RouteHandler {
  return async (req, ctx) => {
    try {
      const user = await requireAuth(req);
      return handler(req, user, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  };
}
