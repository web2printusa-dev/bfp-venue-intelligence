import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { saveClubSubmission } from '../../../../lib/202-prosper';

export const runtime = 'nodejs';

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map(part => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return signatures.some(value => {
    try {
      const a = Buffer.from(value, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  });
}

async function setDeliveryFlag(sessionId: string, key: string) {
  const secret = process.env.STRIPE_SECRET_KEY!;
  const form = new URLSearchParams({ [`metadata[${key}]`]: 'true' });
  const result = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  });
  if (!result.ok) throw new Error(`Could not record ${key} delivery`);
}

async function readCurrentSession(sessionId: string) {
  const result = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    cache: 'no-store',
  });
  if (!result.ok) throw new Error('Could not verify Stripe session');
  return result.json();
}

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!stripeSecret || !webhookSecret || !signature) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 400 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, signature, webhookSecret)) return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });

  let event: any;
  try { event = JSON.parse(payload); }
  catch { return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 }); }

  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return NextResponse.json({ received: true });
  }
  const incoming = event.data?.object;
  if (!incoming?.id) return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  try {
    const session = await readCurrentSession(incoming.id);
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true, pending: true });
    if (session.metadata?.booking_type !== '202-table-deposit' || session.amount_total !== 10000 || session.currency !== 'usd') {
      return NextResponse.json({ received: true, unrelated: true });
    }
    if (!session.metadata?.prosper_synced) {
      const m = session.metadata;
      const details = [
        '202 LOUNGE — $100 DEPOSIT PAID',
        'Reservation reference: ' + session.id,
        'Event: ' + m.event_name + ' · ' + m.event_date,
        'Floor: ' + m.floor + ' · Preferred table: ' + m.table,
        'Guests: ' + m.guest_count + ' · Occasion: ' + m.occasion,
        'Package: ' + m.package + ' — ' + m.package_details,
        'Extra bottles: ' + m.extras,
        'Arrival: ' + m.arrival_time,
        'Guest: ' + m.guest_name + ' · ' + m.guest_phone + ' · ' + m.guest_email,
        'Requests: ' + (m.special_requests || 'None'),
        'Stripe payment: ' + session.payment_intent,
        'Confirm table availability and any balance directly with the guest.',
      ].join('\n');
      await saveClubSubmission({ kind: 'reservation', reference: session.id,
        name: m.guest_name, email: m.guest_email, phone: m.guest_phone, details });
      await setDeliveryFlag(session.id, 'prosper_synced');
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paid reservation notifications failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Paid reservation notifications need retry' }, { status: 500 });
  }
}
