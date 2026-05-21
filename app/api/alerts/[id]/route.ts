import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    const { isActive } = await req.json();

    const { rows } = await pool.query(`
      UPDATE search_alerts
      SET is_active = $2, updated_at = now()
      WHERE id = $1 AND user_id = $3
      RETURNING *
    `, [params.id, isActive, user.id]);

    if (!rows[0]) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    return NextResponse.json({ alert: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    await pool.query(
      'DELETE FROM search_alerts WHERE id = $1 AND user_id = $2',
      [params.id, user.id]
    );
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
