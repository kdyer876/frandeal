/**
 * lib/billing.ts
 *
 * Stripe billing helpers. Same logic as stripe-billing/billing.js
 * but typed and adapted for Next.js API routes.
 */

import Stripe from 'stripe';
import { pool } from './db';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export const PLANS = {
  starter: {
    name:          'Starter',
    priceId:       process.env.STRIPE_STARTER_PRICE_ID!,
    priceCents:    2900,
    leadsPerMonth: 10,
  },
  pro: {
    name:          'Pro',
    priceId:       process.env.STRIPE_PRO_PRICE_ID!,
    priceCents:    7900,
    leadsPerMonth: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const TRIAL_DAYS = 7;

// ─── Checkout ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession(userId: string, email: string, plan: PlanKey) {
  const customer = await getOrCreateStripeCustomer(userId, email);

  return stripe.checkout.sessions.create({
    customer:             customer.id,
    payment_method_types: ['card'],
    mode:                 'subscription',
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { userId, plan },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${plan}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    metadata: { userId, plan },
    allow_promotion_codes: true,
  });
}

export async function createPortalSession(stripeCustomerId: string) {
  return stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
}

// ─── Customer ─────────────────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string, email: string) {
  const { rows } = await pool.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );

  if (rows[0]?.stripe_customer_id) {
    return stripe.customers.retrieve(rows[0].stripe_customer_id) as Promise<Stripe.Customer>;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await pool.query(
    'UPDATE users SET stripe_customer_id = $2 WHERE id = $1',
    [userId, customer.id]
  );

  return customer;
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {

    case 'customer.subscription.created': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      const plan   = sub.metadata?.plan ?? getPlanFromPriceId(sub.items.data[0]?.price?.id);
      if (!userId) break;

      await pool.query(`
        UPDATE users SET
          stripe_subscription_id = $2, plan = $3,
          plan_expires_at        = $4, trial_ends_at = $5,
          updated_at             = now()
        WHERE id = $1
      `, [
        userId, sub.id, plan,
        sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        sub.trial_end           ? new Date(sub.trial_end * 1000) : null,
      ]);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub     = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId  = sub.metadata?.userId;
      const plan    = sub.metadata?.plan ?? getPlanFromPriceId(sub.items.data[0]?.price?.id);
      if (!userId) break;

      await pool.query(`
        UPDATE users SET plan = $2, plan_expires_at = $3,
          trial_ends_at = NULL, updated_at = now()
        WHERE id = $1
      `, [userId, plan, new Date(sub.current_period_end * 1000)]);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub     = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId  = sub.metadata?.userId;
      if (!userId) break;
      await pool.query("UPDATE users SET plan = 'past_due', updated_at = now() WHERE id = $1", [userId]);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await pool.query(`
        UPDATE users SET plan = 'free', stripe_subscription_id = NULL,
          plan_expires_at = NULL, trial_ends_at = NULL, updated_at = now()
        WHERE id = $1
      `, [userId]);
      break;
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      const plan   = sub.metadata?.plan ?? getPlanFromPriceId(sub.items.data[0]?.price?.id);
      if (!userId) break;
      await pool.query(`
        UPDATE users SET plan = $2, plan_expires_at = $3, updated_at = now() WHERE id = $1
      `, [userId, plan, new Date(sub.current_period_end * 1000)]);
      break;
    }
  }
}

function getPlanFromPriceId(priceId?: string): PlanKey {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return 'starter';
}

// ─── Plan status ──────────────────────────────────────────────────────────────

export function deriveSubscriptionStatus(user: {
  plan?: string | null;
  plan_expires_at?: Date | string | null;
  trial_ends_at?: Date | string | null;
}) {
  if (!user.plan || user.plan === 'free') return 'free';
  if (user.plan === 'past_due')           return 'past_due';
  const now = new Date();
  if (user.trial_ends_at && new Date(user.trial_ends_at) > now) return 'trialing';
  if (user.plan_expires_at && new Date(user.plan_expires_at) < now) return 'expired';
  return 'active';
}
