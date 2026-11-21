# 202 Lounge paid table reservations

The current Stripe deposit is $100 USD. The protected Bookings dashboard reads
live Stripe checkout records. Its default view groups paid checkouts with
matching guest, event date, floor, table, arrival time, and party size. All
statuses shows the underlying checkouts. Grouping does not refund payments.

## Production integration

- `STRIPE_SECRET_KEY`: live API key for the 202 Lounge Stripe account.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the destination on that account.
- `PROSPER_API_KEY`: token for the 202 Lounge DC location with permission
  to upsert contacts, read and write notes, and enroll contacts in workflows.

Point Stripe to the canonical production host at `/api/202/webhook`.
Subscribe to `checkout.session.completed` and
`checkout.session.async_payment_succeeded`. Verify event deliveries in Stripe
Workbench and confirm the endpoint returns 2xx without a redirect.

For a paid live $100 table deposit, the webhook saves the booking details as
a contact note and enrolls the guest in **202 Lounge | Paid Website Booking
Alert**. This workflow emails the club inbox with the reservation details directly in the message. Re-entry is enabled so returning guests are eligible.
The dashboard marks successful workflow enrollment as **Workflow queued**;
verify actual email delivery in Prosper Execution Logs and the club inbox.

Do not replay multiple old payments for the same booking merely to reconcile
counts. Reconcile the payment and intended date first; sending a workflow
alert is separate from reviewing or refunding a charge.
