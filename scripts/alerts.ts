// scripts/alerts.ts
// Stub — real alert-sending logic to be wired up once Resend API key is configured.

export async function runAlerts({ dryRun = false }: { dryRun?: boolean } = {}) {
  console.log(`[alerts] runAlerts called (dryRun=${dryRun}) — stub, no-op`);
  return { sent: 0, skipped: 0 };
}

export async function runTrialReminders({ dryRun = false }: { dryRun?: boolean } = {}) {
  console.log(`[alerts] runTrialReminders called (dryRun=${dryRun}) — stub, no-op`);
  return { sent: 0, skipped: 0 };
}

export async function sendTrialReminders({ dryRun = false }: { dryRun?: boolean } = {}) {
  console.log(`[alerts] sendTrialReminders called (dryRun=${dryRun}) — stub, no-op`);
  return 0;
}
