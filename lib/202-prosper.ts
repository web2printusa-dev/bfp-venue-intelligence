import 'server-only';

export const CLUB_LOCATION_ID = 'oIYe14RPMLuOrnMceJAC';
const WORKFLOWS = {
  reservation: 'e44fbccc-96c3-4ec2-80f3-f66534bd7245',
  application: '2b404760-0331-443c-9069-b77e37f699e7',
};
type Submission = {
  kind: keyof typeof WORKFLOWS; reference: string; name: string; email: string; phone: string; details: string;
};

async function crm(path: string, method = 'GET', body?: unknown) {
  if (!process.env.PROSPER_API_KEY) throw new Error('Prosper connection is not configured');
  const response = await fetch('https://services.leadconnectorhq.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.PROSPER_API_KEY,
      Version: '2021-07-28', 'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const stage = path === '/contacts/upsert' ? 'contact' : path.includes('/workflow/') ? 'workflow' : 'notes';
    console.error('202 Prosper failure', {stage, status: response.status});
    throw new Error('Prosper request failed (' + response.status + ')');
  }
  return response.json();
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return phone;
}

// The note is saved before workflow enrollment so staff can review the full submission.
export async function saveClubSubmission(input: Submission) {
  const parts = input.name.trim().split(/\s+/);
  const result = await crm('/contacts/upsert', 'POST', {
    locationId: CLUB_LOCATION_ID,
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
    email: input.email.toLowerCase(),
    phone: normalizePhone(input.phone),
    source: input.kind === 'reservation' ? '202 Website — Paid Table Deposit' : '202 Website — Employment Application',
  });
  const contactId = result.contact?.id;
  if (!contactId) throw new Error('Prosper did not return a contact ID');
  const encoded = encodeURIComponent(contactId);
  const marker = '[202 submission: ' + input.reference + ']';
  const existing = await crm('/contacts/' + encoded + '/notes');
  const notes: {body?: string}[] = existing.notes || [];
  const recorded = notes.some(note => note.body?.includes(marker));
  if (!recorded) {
    await crm('/contacts/' + encoded + '/notes', 'POST', {
      body: marker + '\n' + input.details,
    });
  }
  const completeMarker = '[202 workflow queued: ' + input.reference + ']';
  if (!notes.some(note => note.body?.includes(completeMarker))) {
    // Enroll directly for every new submission, including returning guests whose tag already exists.
    await crm('/contacts/' + encoded + '/workflow/' + WORKFLOWS[input.kind], 'POST', {});
    await crm('/contacts/' + encoded + '/notes', 'POST', {body: completeMarker});
  }
  return { contactId };
}
