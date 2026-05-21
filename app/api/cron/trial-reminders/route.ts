/**
 * GET /api/cron/trial-reminders
 * Called by Vercel Cron daily at 9am.
 * Emails users whose trial ends in ~3 days.
 */

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sendTrialReminders } = await import('@/scripts/alerts');
    const count = await sendTrialReminders({ dryRun: false });
    return NextResponse.json({ ok: true, emailsSent: count });
  } catch (err: unknown) {
    console.error('Trial reminder cron failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
