/**
 * POST /api/billing/webhook
 *
 * Stripe sends subscription lifecycle events here.
 * Must read the raw body BEFORE any JSON parsing — Next.js handles
 * this correctly when you call req.text() or req.arrayBuffer().
 */

import { NextResponse } from 'next/server';
import { stripe, handleWebhookEvent } from '@/lib/billing';

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook handler error:', (err as Error).message);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
}
