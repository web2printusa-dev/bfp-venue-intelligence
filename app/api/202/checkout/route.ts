import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { saveReservationBirthdate } from '../../../../lib/202-prosper';
import { arrivalOptions, bottles, packagesFor, tables, upcomingOccurrences, maxReservationGuests } from '../../../../lib/202-lounge-public';

export const runtime = 'nodejs';

const DEPOSIT_CENTS = 10_000;
const clean = (value: unknown, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  // Manual verification mode: reservation details remain in Stripe metadata.
  // Automatic CRM fulfillment starts only after a signed webhook is configured.
  if (!secret || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Online deposit checkout is being prepared. Please try again shortly.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const eventId = clean(body.eventId, 40);
    const eventDate = clean(body.eventDate, 10);
    const occurrence = upcomingOccurrences().find(item => item.event.id === eventId && item.date === eventDate);
    if (!occurrence) return NextResponse.json({ error: 'Choose an upcoming event night before checkout.' }, { status: 400 });

    const floor = Number(body.floor);
    if (![1, 2].includes(floor)) return NextResponse.json({ error: 'Choose a floor before checkout.' }, { status: 400 });
    const tableNumber = body.tableNumber == null ? null : Number(body.tableNumber);
    if (tableNumber !== null && !tables.some(table => table.floor === floor && table.number === tableNumber)) {
      return NextResponse.json({ error: 'That table selection is not available.' }, { status: 400 });
    }

    const guests = Number(body.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > maxReservationGuests) {
      return NextResponse.json({ error: 'Reservations are limited to 8 guests.' }, { status: 400 });
    }
    const name = clean(body.name, 100);
    const email = clean(body.email, 254).toLowerCase();
    const phone = clean(body.phone, 30);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7) {
      return NextResponse.json({ error: 'Enter a valid name, email, and mobile number.' }, { status: 400 });
    }

    const birthdate = typeof body.birthdate === 'string' ? body.birthdate : '';
    const parsedBirthdate = new Date(birthdate + 'T00:00:00Z');
    const today = new Date().toLocaleDateString('en-CA', {timeZone:'America/New_York'});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || birthdate < '0001-01-01' || birthdate > today ||
        !Number.isFinite(parsedBirthdate.getTime()) || parsedBirthdate.toISOString().slice(0, 10) !== birthdate) {
      return NextResponse.json({ error: 'Enter a valid birthdate for the reservation holder.' }, { status: 400 });
    }

    const packageId = clean(body.packageId, 80);
    const selectedPackage = packagesFor(occurrence.event, floor).find(item => item.id === packageId);
    if (!selectedPackage) return NextResponse.json({ error: 'Choose a package for this night and floor.' }, { status: 400 });

    const arrival = clean(body.arrival, 5);
    const allowedArrivals = arrivalOptions(occurrence.event);
    if (allowedArrivals.length && !allowedArrivals.some(item => item.value === arrival)) {
      return NextResponse.json({ error: 'Choose an arrival time offered for this event.' }, { status: 400 });
    }

    const rawExtras = body.extras && typeof body.extras === 'object' ? body.extras as Record<string, unknown> : {};
    const extras = Object.entries(rawExtras).flatMap(([bottleName, quantity]) => {
      const bottle = bottles.find(item => item.name === bottleName);
      const count = Number(quantity);
      return bottle && Number.isInteger(count) && count > 0 && count <= 10 ? [{ name: bottle.name, quantity: count }] : [];
    });
    const metadata: Record<string, string> = {
      booking_type: '202-table-deposit',
      fulfillment_mode: process.env.STRIPE_WEBHOOK_SECRET && process.env.PROSPER_API_KEY ? 'automatic' : 'manual',
      event_id: occurrence.event.id,
      event_name: occurrence.event.artist.slice(0, 100),
      event_date: occurrence.date,
      floor: floor === 2 ? 'Second Floor · Aura Room' : 'First Floor',
      table: tableNumber === null ? 'Host selection requested' : String(tableNumber),
      guest_count: String(guests),
      occasion: clean(body.occasion, 40),
      package: selectedPackage.name.slice(0, 100),
      package_details: selectedPackage.description.slice(0, 180),
      extras: JSON.stringify(extras).slice(0, 450),
      arrival_time: arrival || 'To be confirmed',
      guest_name: name,
      guest_email: email,
      guest_phone: phone,
      special_requests: clean(body.notes, 300),
    };

    const reference = '202-' + createHash('sha256').update(JSON.stringify([eventId,eventDate,email,floor,tableNumber])).digest('hex');
    const stripeHeaders = { Authorization: `Bearer ${secret}`, 'Stripe-Version': '2026-03-25.dahlia' };
    // Look for prior checkouts even after Stripe's idempotency cache expires.
    const lookup = new URLSearchParams({limit:'100','created[gte]':String(Math.floor(Date.parse(eventDate+'T00:00:00Z')/1000)-36*86400)});
    let foundOpen = false;
    for (let page=0;;page++) {
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions?'+lookup,{headers:stripeHeaders,cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok || page>=10) return NextResponse.json({error:'We could not check for a previous deposit. Please contact 202 Lounge before paying.'},{status:503});
      const prior = await response.json();
      for(const previous of prior.data) {
        const m = previous.metadata;
        if(previous.client_reference_id!==reference && !(m?.booking_type==='202-table-deposit' && m.event_id===eventId && m.event_date===eventDate && m.guest_email?.trim().toLowerCase()===email && m.floor===metadata.floor && m.table===metadata.table)) continue;
        if(previous.payment_status==='paid'||previous.status==='complete') return NextResponse.json({error:'A deposit already exists or is processing for this booking. Contact 202 Lounge if you need to make a change.'},{status:409});
        if(previous.status==='open')foundOpen=true;
      }
      if(!prior.has_more)break;
      lookup.set('starting_after',prior.data.at(-1).id);
    }
    if(foundOpen) return NextResponse.json({error:'Checkout is already open for this booking. Return to the original checkout or contact 202 Lounge before paying.'},{status:409});
    try {
      await saveReservationBirthdate({name, email, phone, birthdate});
    } catch {
      return NextResponse.json({error:'We could not save your reservation details. Please try again shortly.'},{status:503});
    }
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('ui_mode', 'elements');
    form.set('customer_email', email);
    form.set('client_reference_id', reference);
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(DEPOSIT_CENTS));
    form.set('line_items[0][price_data][product_data][name]', '202 Lounge Reservation Deposit');
    form.set('line_items[0][price_data][product_data][description]', `$100 deposit for ${occurrence.event.artist} on ${occurrence.date}. Any remaining balance is confirmed by the club and paid directly to 202 Lounge.`);
    const siteOrigin = 'https://www.202lounge.com';
    form.set('return_url', `${siteOrigin}/reserve/confirmation?session_id={CHECKOUT_SESSION_ID}`);
    Object.entries(metadata).forEach(([key, value]) => {
      form.set(`metadata[${key}]`, value);
      form.set(`payment_intent_data[metadata][${key}]`, value);
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { ...stripeHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': reference },
      body: form,
      cache: 'no-store',
    });
    const session = await stripeResponse.json();
    if (stripeResponse.status===409 || session.error?.type==='idempotency_error') return NextResponse.json({error:'This booking already has a checkout attempt. Contact 202 Lounge before paying again.'},{status:409});
    if (!stripeResponse.ok || !session.client_secret || session.status!=='open' || session.payment_status==='paid' || session.expires_at<=Date.now()/1000) {
      console.error('Stripe Checkout session creation failed:', {type:session.error?.type,code:session.error?.code,param:session.error?.param,message:session.error?.message,status:stripeResponse.status});
      return NextResponse.json({ error: 'Secure checkout could not be started. Please try again.' }, { status: 502 });
    }
    console.info('Stripe checkout session created', {
      sessionMode: session.livemode ? 'live' : 'test',
      publishableKeyMode: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'live' : 'test',
    });
    return NextResponse.json({
      clientSecret: session.client_secret, expiresAt: session.expires_at,
      reservation: {event: occurrence.event.artist, date: occurrence.date, image: occurrence.event.image,
        floor: metadata.floor, table: tableNumber || null, guests, package: selectedPackage.name,
        arrival: allowedArrivals.find(item => item.value === arrival)?.label || arrival, name, email}
    }, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    console.error('Reservation checkout request failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'We could not start checkout. Please check your reservation details and try again.' }, { status: 400 });
  }
}
