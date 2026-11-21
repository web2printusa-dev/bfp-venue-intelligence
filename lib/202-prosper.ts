import 'server-only';
import {applicationRef,hiringStatuses,type HiringStatus} from './hiring';

export const CLUB_LOCATION_ID = 'oIYe14RPMLuOrnMceJAC';
const WORKFLOWS = {
  reservation: 'b42d8c2c-784c-4b39-a034-b8aac477b1c9',
  application: '7aefd313-cb1a-4420-85c8-286d8e6b6111',
};
type Submission = {
  kind: keyof typeof WORKFLOWS; reference: string; name: string; email: string; phone: string; details: string; emailDetails?: string;
};

async function crm(path: string, method = 'GET', body?: unknown, version = '2021-07-28') {
  if (!process.env.PROSPER_API_KEY) throw new Error('Prosper connection is not configured');
  const response = await fetch('https://services.leadconnectorhq.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.PROSPER_API_KEY,
      Version: version, 'Content-Type': 'application/json',
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
    ...(input.kind === 'reservation' && input.emailDetails ? {
      customFields: [{ key: '202_reservation_details', fieldValue: input.emailDetails }],
    } : {}),
    source: input.kind === 'reservation' ? '202 Website — Paid Table Deposit' : '202 Website — Employment Application',
  });
  const contactId = result.contact?.id;
  if (!contactId) throw new Error('Prosper did not return a contact ID');
  const encoded = encodeURIComponent(contactId);
  const marker = '[202 submission: ' + input.reference + ']';
  const existing = await crm('/contacts/' + encoded + '/notes', 'GET', undefined, 'v3');
  const notes: {body?: string; bodyText?: string}[] = existing.notes || [];
  const recorded = notes.some(note => (note.bodyText || note.body)?.trim().startsWith(marker));
  if (!recorded) {
    await crm('/contacts/' + encoded + '/notes', 'POST', {
      body: marker + '\n' + input.details,
    }, 'v3');
  }
  const completeMarker = '[202 workflow queued: ' + input.reference + ']';
  if (!notes.some(note => (note.bodyText || note.body)?.trim().startsWith(completeMarker))) {
    // Enroll directly for every new submission, including returning guests whose tag already exists.
    await crm('/contacts/' + encoded + '/workflow/' + WORKFLOWS[input.kind], 'POST', {}, 'v3');
    await crm('/contacts/' + encoded + '/notes', 'POST', {body: completeMarker}, 'v3');
  }
  return { contactId };
}

export async function listClubApplications(page: number) {
  const pageLimit = 20;
  const result: {contacts: {id: string; locationId?: string}[]} = await crm('/contacts/search', 'POST', {locationId: CLUB_LOCATION_ID, page, pageLimit}, '2023-02-21');
  if (!Array.isArray(result.contacts)) throw new Error('Unexpected Prosper response');
  const notes = await Promise.allSettled(result.contacts.map(async (contact: {id: string; locationId?: string}) => {
    if (!contact.id || (contact.locationId && contact.locationId !== CLUB_LOCATION_ID)) return [];
    const notes = await getContactNotes(contact.id);
    return notes.flatMap(note => {
      const body = (note.bodyText || note.body || '').trim();
      const reference = /^\[202 submission: (application-[a-f0-9]{24})\]/.exec(body)?.[1];
      if (!reference) return [];
      const history = notes.flatMap(entry=>{
        const raw=(entry.bodyText || entry.body || '').trim();
        const prefix='[202 hiring update: '+reference+'] ';
        if(!raw.startsWith(prefix))return [];
        const [when,status]=raw.slice(prefix.length).split(/\r?\n/,1)[0].split(' | ');
        if(!hiringStatuses.includes(status as HiringStatus)||!Number.isFinite(Date.parse(when)))return [];
        return [{id:entry.id,when,status:status as HiringStatus,note:raw.split(/\r?\n/).slice(1).join('\n')}];
      }).sort((a,b)=>b.when.localeCompare(a.when)||b.id.localeCompare(a.id));
      return [{id: contact.id + '-' + note.id, contactId:contact.id, reference, body, history, status:history[0]?.status??'New'}];
    });
  }));
  return {rows: notes.flatMap(note => note.status === 'fulfilled' ? note.value : []),
    partial: notes.some(note => note.status === 'rejected'), next: page < 500 && result.contacts.length === pageLimit};
}


type ContactNote={id:string;body?:string;bodyText?:string};
async function getContactNotes(contactId:string):Promise<ContactNote[]> {
  const data=await crm('/contacts/'+encodeURIComponent(contactId)+'/notes','GET',undefined,'v3');
  if(!Array.isArray(data.notes))throw new Error('Unexpected Prosper notes response');
  return data.notes;
}

export async function updateClubApplication(contactId:string,reference:string,status:HiringStatus,note:string){
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(contactId)||!applicationRef.test(reference)||!hiringStatuses.includes(status))throw new Error('Invalid application update');
  const contact=await crm('/contacts/'+encodeURIComponent(contactId),'GET',undefined,'v3');
  if(contact.contact?.locationId!==CLUB_LOCATION_ID)throw new Error('Application not found');
  const notes=await getContactNotes(contactId);
  if(!notes.some(entry=>(entry.bodyText||entry.body||'').trim().startsWith('[202 submission: '+reference+']')))throw new Error('Application not found');
  await crm('/contacts/'+encodeURIComponent(contactId)+'/notes','POST',{
    body:'[202 hiring update: '+reference+'] '+new Date().toISOString()+' | '+status+(note?'\n'+note:''),
  },'v3');
}
