// Run with secrets supplied through the deployment secret manager or environment.
// Prints only redacted diagnostics; never prints API keys or bearer tokens.
import { createToastClient, ToastError } from '../lib/toast-client.ts';
try {
  console.log(JSON.stringify(await createToastClient().inspectAccess(), null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error instanceof ToastError ? error.code : 'TOAST_CHECK_FAILED', ...(error instanceof ToastError && error.status ? { upstreamStatus: error.status } : {}) }));
  process.exitCode = 1;
}
