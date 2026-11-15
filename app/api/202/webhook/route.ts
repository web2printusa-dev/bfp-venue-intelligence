import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

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

async function sendClubEmail(session: any, eventId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESERVATION_FROM_EMAIL;
  const to = process.env.CLUB_RESERVATION_EMAIL || '202loungemedia@gmail.com';
  if (!apiKey || !from) throw new Error('Reservation email is not configured');
  const m = session.metadata || {};
  const lines = [
    'A $250 reservation deposit was paid for 202 Lounge.',
    '',
    `Event: ${m.event_name || '—'}`,
    `Date: ${m.event_date || '—'}`,
    `Floor: ${m.floor || '—'}`,
    `Preferred table: ${m.table || '—'}`,
    `Guests: ${m.guest_count || '—'}`,
    `Occasion: ${m.occasion || '—'}`,
    `Package: ${m.package || '—'} — ${m.package_details || ''}`,
    `Bottle add-ons: ${m.extras || 'None'}`,
    `Arrival: ${m.arrival_time || '—'}`,
    `Guest: ${m.guest_name || '—'}`,
    `Guest mobile: ${m.guest_phone || '—'}`,
    `Guest email: ${m.guest_email || '—'}`,
    `Special requests: ${m.special_requests || 'None'}`,
    '',
    `Stripe payment: ${session.payment_intent || session.id}`,
    'Confirm availability and any remaining balance directly with the guest.',
  ];
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${eventId}-club-email` },
    body: JSON.stringify({ from, to, subject: `Paid 202 table reservation · ${m.event_date || ''} · ${m.guest_name || ''}`, text: lines.join('\n') }),
    cache: 'no-store',
  });
  if (!result.ok) throw new Error(`Reservation email failed (${result.status})`);
}

async function sendClubText(session: any) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || (!from && !messagingServiceSid)) throw new Error('Reservation SMS is not configured');
  const m = session.metadata || {};
  const body = [
    '$250 deposit PAID — 202 Lounge reservation',
    `${m.event_name || 'Event'} · ${m.event_date || ''}`,
    `${m.floor || ''} · Table ${m.table || 'host selection'} · ${m.guest_count || '?'} guests`,
    `Package: ${m.package || '—'}`,
    `Arrival: ${m.arrival_time || 'TBC'}`,
    `Guest: ${m.guest_name || '—'} · ${m.guest_phone || '—'}`,
    `Email: ${m.guest_email || '—'}`,
    m.special_requests ? `Notes: ${m.special_requests}` : '',
  ].filter(Boolean).join('\n').slice(0, 1500);
  const form = new URLSearchParams({ To: process.env.CLUB_RESERVATION_PHONE || '+12025209070', Body: body });
  if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid);
  else form.set('From', from!);
  const authorization = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  });
  if (!result.ok) throw new Error(`Reservation SMS failed (${result.status})`);
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
    if (!session.metadata?.club_email_sent) {
      await sendClubEmail(session, event.id);
      await setDeliveryFlag(session.id, 'club_email_sent');
    }
    if (!session.metadata?.club_sms_sent) {
      await sendClubText(session);
      await setDeliveryFlag(session.id, 'club_sms_sent');
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paid reservation notifications failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Paid reservation notifications need retry' }, { status: 500 });
  }
}
