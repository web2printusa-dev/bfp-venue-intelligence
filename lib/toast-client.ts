// Server-side only. Never import this module into a client component.
// Toast auth: https://doc.toasttab.com/doc/devguide/authentication.html
// Scope reference: https://doc.toasttab.com/doc/devguide/apiScopes.html
type Env = Record<string, string | undefined>;
type Fetcher = typeof fetch;
type Token = { accessToken: string; expiresAt: number; scopes: string[] };
export const paymentScopes = ['orders.orders:write', 'credit_cards.authorization:write'] as const;
const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ToastError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, status?: number) {
    // Never include upstream response bodies, credentials, tokens, or guest data.
    super(code); this.name = 'ToastError'; this.code = code; this.status = status;
  }
}

export function toastConfiguration(env: Env = process.env) {
  const baseUrl = env.TOAST_API_HOST || 'https://ws-api.toasttab.com';
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new ToastError('INVALID_TOAST_HOST'); }
  // Credentials must never be sent to a caller-supplied or non-Toast origin.
  if (url.origin !== 'https://ws-api.toasttab.com' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ToastError('INVALID_TOAST_HOST');
  }
  const clientId = env.TOAST_CLIENT_ID || '';
  // API_KEY is an alias only: successful Toast authentication confirms whether it is a client secret.
  const clientSecret = env.TOAST_CLIENT_SECRET || env.TOAST_API_KEY || '';
  const restaurantGuid = env.TOAST_RESTAURANT_GUID || '';
  const missing = [!clientId && 'TOAST_CLIENT_ID', !clientSecret && 'TOAST_CLIENT_SECRET', !restaurantGuid && 'TOAST_RESTAURANT_GUID'].filter(Boolean) as string[];
  if (restaurantGuid && !guidPattern.test(restaurantGuid)) throw new ToastError('INVALID_RESTAURANT_GUID');
  return { baseUrl: url.origin, clientId, clientSecret, restaurantGuid, missing };
}

// Only decode a token just returned by Toast over TLS, never a caller-provided token.
// These claims inform diagnostics; Toast still authorizes every upstream request.
function tokenScopes(accessToken: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
    const value = payload.scope ?? payload.scopes;
    const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\s,]+/) : [];
    return [...new Set(list.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0))] as string[];
  } catch { return []; }
}

export function createToastClient(env: Env = process.env, fetcher: Fetcher = fetch, now: () => number = Date.now) {
  const config = toastConfiguration(env);
  let cached: Token | undefined;
  let pending: Promise<Token> | undefined;

  async function authenticate(): Promise<Token> {
    if (!config.clientId || !config.clientSecret) throw new ToastError('TOAST_CREDENTIALS_MISSING');
    if (cached && cached.expiresAt > now() + 60_000) return cached;
    if (pending) return pending;
    pending = (async () => {
      let response: Response;
      try {
        response = await fetcher(`${config.baseUrl}/authentication/v1/authentication/login`, {
          method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' })
        });
      } catch { throw new ToastError('TOAST_UNREACHABLE'); }
      if (!response.ok) throw new ToastError(response.status === 401 || response.status === 403 ? 'TOAST_AUTHENTICATION_REJECTED' : 'TOAST_AUTHENTICATION_FAILED', response.status);
      let data;
      try { data = await response.json(); } catch { throw new ToastError('INVALID_TOAST_AUTH_RESPONSE'); }
      const token = data?.token;
      if (data?.status !== 'SUCCESS' || typeof token?.accessToken !== 'string' || !token.accessToken || !Number.isFinite(token.expiresIn) || token.expiresIn <= 0) {
        throw new ToastError('INVALID_TOAST_AUTH_RESPONSE');
      }
      cached = { accessToken: token.accessToken, expiresAt: now() + token.expiresIn * 1000, scopes: tokenScopes(token.accessToken) };
      return cached;
    })();
    try { return await pending; } finally { pending = undefined; }
  }

  async function read(path: string): Promise<unknown> {
    if (!config.restaurantGuid) throw new ToastError('TOAST_RESTAURANT_GUID_MISSING');
    // Fixed read endpoints only. This diagnostic client cannot authorize cards or post orders.
    if (!['/config/v2/tables', '/config/v2/diningOptions', '/config/v2/revenueCenters'].includes(path)) throw new ToastError('TOAST_ENDPOINT_NOT_ALLOWED');
    const token = await authenticate();
    let response: Response;
    try {
      response = await fetcher(`${config.baseUrl}${path}`, { method: 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
        headers: { Accept: 'application/json', Authorization: `Bearer ${token.accessToken}`, 'Toast-Restaurant-External-ID': config.restaurantGuid } });
    } catch { throw new ToastError('TOAST_UNREACHABLE'); }
    if (!response.ok) {
      if (response.status === 401) cached = undefined;
      throw new ToastError(response.status === 403 ? 'TOAST_LOCATION_OR_SCOPE_DENIED' : 'TOAST_READ_FAILED', response.status);
    }
    try { return await response.json(); } catch { throw new ToastError('INVALID_TOAST_RESPONSE'); }
  }

  async function inspectAccess() {
    const token = await authenticate();
    const missingPaymentScopes = paymentScopes.filter(scope => !token.scopes.includes(scope));
    let locationAccess: 'not_checked' | 'verified' | 'denied' = 'not_checked';
    let tableCount: number | null = null;
    if (config.restaurantGuid) {
      try {
        const tables = await read('/config/v2/tables');
        if (!Array.isArray(tables)) throw new ToastError('INVALID_TOAST_TABLE_RESPONSE');
        tableCount = tables.length; locationAccess = 'verified';
      } catch (error) {
        if (error instanceof ToastError && error.code === 'TOAST_LOCATION_OR_SCOPE_DENIED') locationAccess = 'denied';
        else throw error;
      }
    }
    return { authenticated: true, scopes: token.scopes, missingPaymentScopes, locationAccess, tableCount,
      paymentAuthorizationScope: token.scopes.includes('credit_cards.authorization:write'),
      orderCreationScope: token.scopes.includes('orders.orders:write'),
      // Scope presence alone does not establish a tested payment integration.
      checkoutEnabled: false,
      remainingSetup: ['Toast-issued payment encryption public key and key ID', 'Approved menu, table, dining-option and service-charge mappings', 'Durable table holds and idempotent payment/order reconciliation', 'Toast-approved sandbox payment and refund testing'] };
  }
  return { authenticate, read, inspectAccess };
}
