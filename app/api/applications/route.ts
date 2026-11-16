import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { saveClubSubmission } from '../../../lib/202-prosper';
export const runtime = 'nodejs';

// Applicant contact details are available only in the authenticated Prosper workspace.
export async function GET() {
  return NextResponse.json({error:'Use the club\'s authenticated Prosper account to review applications.'}, {status:401});
}
export async function POST(req: Request) {
  if (!process.env.PROSPER_API_KEY) return NextResponse.json({ok:false,error:'Applications are temporarily unavailable. Please contact 202 Lounge.'},{status:503});
  try {
    const body = await req.json();
    const fields = ['name','role','email','phone','availability','experience','why'] as const;
    const data = Object.fromEntries(fields.map(key => [key, typeof body[key] === 'string' ? body[key].trim().slice(0, key === 'experience' || key === 'why' ? 4000 : 300) : ''])) as Record<typeof fields[number],string>;
    if (fields.some(key => !data[key]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json({ok:false,error:'Please complete every field with valid contact details.'},{status:400});
    }
    const roles = ['VIP Host','Bartender','Server','Security / Door','Bottle Service','Barback','Event Staff'];
    if (!roles.includes(data.role)) return NextResponse.json({ok:false,error:'Choose a listed role.'},{status:400});
    const fingerprint = createHash('sha256').update(JSON.stringify({...data,email:data.email.toLowerCase()})).digest('hex').slice(0,24);
    const reference = 'application-' + fingerprint;
    const details = [
      '202 LOUNGE — EMPLOYMENT APPLICATION',
      'Application reference: ' + reference,
      'Received: ' + new Date().toISOString(),
      'Name: ' + data.name,
      'Role: ' + data.role,
      'Email: ' + data.email,
      'Phone: ' + data.phone,
      'Availability: ' + data.availability,
      'Experience: ' + data.experience,
      'Why 202 Lounge: ' + data.why,
    ].join('\n');
    await saveClubSubmission({kind:'application',reference,name:data.name,email:data.email,phone:data.phone,details});
    return NextResponse.json({ok:true,reference});
  } catch {
    return NextResponse.json({ok:false,error:'We could not save your application. Please try again or contact 202 Lounge.'},{status:502});
  }
}
