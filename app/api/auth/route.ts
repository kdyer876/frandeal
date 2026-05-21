/**
 * POST /api/auth/register   { email, name, password }
 * POST /api/auth/login      { email, password }
 * GET  /api/auth/me         (Bearer token required)
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signJWT, verifyJWT, hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const url    = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'login';
  const body   = await req.json();

  // ── Register ────────────────────────────────────────────────────────────────
  if (action === 'register') {
    const { email, name, password } = body;
    if (!email || !password) return err('Email and password required', 400);
    if (password.length < 8)  return err('Password must be at least 8 characters', 400);

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return err('Email already registered', 409);

    const hash   = await hashPassword(password);
    const { rows } = await pool.query(`
      INSERT INTO users (email, name, password_hash, plan)
      VALUES ($1, $2, $3, 'free')
      RETURNING id, email, name, plan, created_at
    `, [email.toLowerCase(), name ?? null, hash]);

    const user  = rows[0];
    const token = signJWT({ sub: user.id, email: user.email, plan: user.plan });
    return NextResponse.json({ token, user: strip(user) }, { status: 201 });
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  const { email, password } = body;
  if (!email || !password) return err('Email and password required', 400);

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user     = rows[0];

  if (!user?.password_hash) return err('Invalid email or password', 401);
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return err('Invalid email or password', 401);

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const token = signJWT({ sub: user.id, email: user.email, plan: user.plan });
  return NextResponse.json({ token, user: strip(user) });
}

export async function GET(req: Request) {
  const auth    = req.headers.get('authorization');
  const token   = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyJWT(token) : null;
  if (!payload?.sub) return err('Authentication required', 401);

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) return err('User not found', 404);
  return NextResponse.json({ user: strip(rows[0]) });
}

function strip(u: Record<string, unknown>) {
  const { password_hash, stripe_customer_id, ...safe } = u;
  return safe;
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
