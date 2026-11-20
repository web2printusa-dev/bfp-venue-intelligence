import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReservationConfirmation({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        cache: 'no-store',
      });
      const session = response.ok ? await response.json() : null;
      paid = session?.payment_status === 'paid'
        && session?.amount_total === 10_000
        && session?.currency === 'usd'
        && session?.metadata?.booking_type === '202-table-deposit';
    } catch {
      paid = false;
    }
  }

  return <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '32px 20px', background: '#090909', color: '#f4f1e9' }}>
    <section style={{ width: 'min(100%, 620px)', border: '1px solid #b8a46e', borderRadius: 18, padding: 'clamp(28px, 6vw, 56px)', background: '#12120f' }}>
      <p style={{ color: '#c4f432', letterSpacing: '.16em', fontSize: 12, fontWeight: 700 }}>202 LOUNGE · RESERVATIONS</p>
      <h1 style={{ fontSize: 'clamp(32px, 6vw, 54px)', lineHeight: 1, margin: '18px 0' }}>{paid ? 'Deposit received.' : 'Payment not confirmed.'}</h1>
      <p style={{ color: '#d0cec5', fontSize: 18, lineHeight: 1.6 }}>
        {paid
          ? 'Your $100 deposit was paid. The club still needs to review your table request; your reservation is not confirmed yet.'
          : 'We could not verify this payment. Check your card or bank activity before trying checkout again.'}
      </p>
      <p style={{ marginTop: 30 }}><Link href="/#events" style={{ color: '#c4f432', fontWeight: 700, textDecoration: 'none' }}>Back to 202 Lounge events →</Link></p>
    </section>
  </main>;
}
