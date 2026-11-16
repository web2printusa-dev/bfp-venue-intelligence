# 202 Lounge deposit checkout setup

The reservation flow charges a fixed $250 deposit through Stripe Checkout. The remaining balance, if any, is confirmed by 202 Lounge and paid directly to the club.

Set these Vercel Production environment variables before enabling live reservations:

- `STRIPE_SECRET_KEY`: existing Stripe secret key for the club's account.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the webhook endpoint below.
- `RESEND_API_KEY`: Resend API key used to email paid reservations.
- `RESERVATION_FROM_EMAIL`: verified sender address in Resend.
- `TWILIO_ACCOUNT_SID`: Twilio account SID.
- `TWILIO_AUTH_TOKEN`: Twilio auth token.
- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`: sender identity in Twilio.

The club notification recipients default to `202loungemedia@gmail.com` and `+12025209070`. Optional overrides are `CLUB_RESERVATION_EMAIL` and `CLUB_RESERVATION_PHONE`.

Create a Stripe webhook endpoint at `https://202loungedc.com/api/202/webhook` (or the current production domain until DNS is connected), subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its `whsec_` signing secret to `STRIPE_WEBHOOK_SECRET`.

A paid session sends a reservation email and SMS to the club. Each delivery is recorded in the Stripe Checkout Session metadata so Stripe retries can resume a partial notification without repeating the earlier successful delivery.
