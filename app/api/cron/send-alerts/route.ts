/**
 * GET /api/cron/send-alerts
 * Called by Vercel Cron every 30 minutes.
 * Finds new listing matches and emails users.
 */

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { runAlerts } = await import('@/scripts/alerts');
    const result        = await runAlerts({ dryRun: false });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    console.error('Alert cron failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
