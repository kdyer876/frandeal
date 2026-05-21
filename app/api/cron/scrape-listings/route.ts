/**
 * GET /api/cron/scrape-listings
 * Called by Vercel Cron at 3am daily.
 * Runs BizBuySell + FranchiseGator scrapers.
 */

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron (or a trusted internal caller)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { scrapeAll: scrapeBBS }   = await import('@/scripts/bizbuysell');
    const { scrapeAll: scrapeFG }    = await import('@/scripts/franchisegator');
    const { markStaleListings }      = await import('@/scripts/bizbuysell');

    const [bbsResult, fgResult] = await Promise.allSettled([
      scrapeBBS({ dryRun: false }),
      scrapeFG({  dryRun: false }),
    ]);

    await markStaleListings();

    return NextResponse.json({
      ok:  true,
      bbs: bbsResult.status === 'fulfilled' ? bbsResult.value : { error: (bbsResult as PromiseRejectedResult).reason?.message },
      fg:  fgResult.status  === 'fulfilled' ? fgResult.value  : { error: (fgResult  as PromiseRejectedResult).reason?.message },
    });
  } catch (err: unknown) {
    console.error('Listing scrape cron failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
