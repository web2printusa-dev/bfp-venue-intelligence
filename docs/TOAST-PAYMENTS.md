# 202 Lounge: Toast payment integration

## Current implementation

The 202 site lives in `web2printusa-dev/bfp-venue-intelligence`, on the
`202-lounge-preview` branch. The current reservation checkout prepares an SMS;
it does not reserve inventory, create a POS order, or collect payment.

`lib/toast-client.ts` now implements Toast machine-client authentication, token
refresh and scope inspection, plus restaurant-scoped configuration reads. It
accepts the supplied production hostname. The diagnostic command makes no card
authorizations, purchases, or order writes. It never prints secrets or tokens.

## Credentials and verification

Configure the server-only variables in `.env.example` through Vercel's secret
settings. `TOAST_CLIENT_ID` is the provided ID. `TOAST_CLIENT_SECRET` is required
by Toast authentication. If the value provided by the owner is labeled "API key",
it may be supplied as `TOAST_API_KEY`; successful authentication must establish
whether it is in fact the secret. Do not rotate existing credentials to test this.

`TOAST_RESTAURANT_GUID` must be the location's UUID from Toast API access or the
activation email. The numeric Restaurant ID shown in Toast Web is not this UUID.

Run with Node 24:

```sh
node scripts/check-toast-access.mjs
node --test tests/toast-client.test.mjs
```

The first command reads production configuration only. Missing credentials fail
closed. Its output identifies granted scopes and confirms location read access.
Scopes absent from the report are not assumed to be granted.

## Required payment access

Standard API access is read-only. Toast must approve a custom or partner payment
integration with `orders.orders:write` and `credit_cards.authorization:write`.
Configuration reads require `config:read`; menu reads require the appropriate
approved menus scope. `orders.payments:write` is additionally required if the
integration adds payments to existing checks. Request only the scope needed for
the agreed workflow.

Toast integration support must supply a payment-encryption public key and key ID.
Do not substitute the API key/client secret for the payment-encryption key.

## Checkout work that remains blocked

Before enabling a payment button:

1. Authenticate the actual supplied key and inspect its scopes and location access.
2. Obtain approved payment access, a sandbox environment and Toast payment key.
3. Map approved packages/bottles to Toast menu-item and group GUIDs, and map the
   site floor/table IDs to Toast table GUIDs, dining options and revenue centers.
4. Confirm the payable table minimum, eligible included bottles, taxes, gratuity,
   reservation duration and refund policy. Current package totals are estimates.
5. Add durable atomic table holds, expiration and an idempotent order/payment
   ledger. Toast table configuration lists physical tables; it is not live
   reservation availability, and posting an order is not a Toast Tables booking.
6. Build a server-validated cart and use Toast's `/orders/v2/prices` calculation.
   Authorize encrypted card data with the approved credit-cards API and apply the
   authorization to a new Toast order within five minutes. A submitted order or
   an authorization is not proof of captured payment. Confirm capture/failure,
   reconcile timeouts before any retry and cover refunds/released holds.
7. Run Toast-approved sandbox scenarios including duplicate submissions,
   simultaneous table selection, decline, timeout, cancellation, tax and refund.

Online charges remain disabled. No public payment endpoint is exposed until
inventory, authorization and reconciliation are implemented and tested together.

## Account inspection

The signed-in 202 Lounge Toast Web session exposes an upsell/demo page for
Waitlist & Reservations. Integrations does not expose Manage Credentials to
this login. This does not establish what permissions the separately provided
machine credentials have; the authentication check above is the next test.

## Official references

- https://doc.toasttab.com/doc/devguide/authentication.html
- https://doc.toasttab.com/doc/devguide/apiScopes.html
- https://doc.toasttab.com/doc/devguide/apiIntegrationTypes.html
- https://doc.toasttab.com/doc/devguide/authorizingCcPayments.html
- https://doc.toasttab.com/doc/cookbook/apiIntegrationChecklistReservation.html
