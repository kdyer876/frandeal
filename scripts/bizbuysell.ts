// scripts/bizbuysell.ts
// Stub — real scraper to be implemented once a licensed data feed is set up.
// BizBuySell ToS prohibits scraping; production ingestion should use their API or a broker feed.

export async function scrapeAll({ dryRun = false }: { dryRun?: boolean } = {}) {
  console.log(`[bizbuysell] scrapeAll called (dryRun=${dryRun}) — stub, no-op`);
  return { inserted: 0, updated: 0, skipped: 0 };
}

export async function markStaleListings() {
  console.log('[bizbuysell] markStaleListings called — stub, no-op');
  return { marked: 0 };
}
