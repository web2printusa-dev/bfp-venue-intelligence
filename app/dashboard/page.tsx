import {redirect} from 'next/navigation';
import {auth,adminConfigured,signOut} from '../../lib/club-auth';

import {listClubApplications} from '../../lib/202-prosper';
import {upcomingOccurrences} from '../../lib/202-lounge-public';

export const dynamic='force-dynamic';
export const metadata={title:'Operations | 202 Lounge',robots:{index:false,follow:false}};

type Booking={id:string;created:number;livemode:boolean;status:string;payment_status:string;amount_total:number|null;currency:string|null;metadata:Record<string,string>|null};
type SessionPage={data:Booking[];has_more:boolean};

async function reservations(cursor?:string) {
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key) throw new Error('Stripe is not configured.');
 const query=new URLSearchParams({limit:'100'});
 if(cursor)query.set('starting_after',cursor);
 const response=await fetch('https://api.stripe.com/v1/checkout/sessions?'+query,{
  headers:{Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error('Stripe reservations could not be loaded.');
 const result:SessionPage=await response.json();
 return {
  rows:result.data.filter(row=>row.livemode && row.metadata?.booking_type==='202-table-deposit'),
  next:result.has_more ? result.data.at(-1)?.id : undefined,
  testMode:key.startsWith('sk_test_')||key.startsWith('rk_test_')
 };
}

const fields=[
 ['Event date','event_date'],['Guest email','guest_email'],['Guest phone','guest_phone'],['Floor','floor'],
 ['Preferred table','table'],['Guest count','guest_count'],['Arrival','arrival_time'],['Occasion','occasion'],
 ['Package','package'],['Package details','package_details'],['Extra bottles','extras'],['Special requests','special_requests'],
] as const;
const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'});
function extras(value:string){
 try {
  const parsed=JSON.parse(value);
  if(Array.isArray(parsed))return parsed.map(x=>String(x.quantity)+' × '+String(x.name)).join(', ')||'None';
 } catch {}
 return value;
}

export default async function Dashboard({searchParams}:{searchParams:Promise<{after?:string; view?:string; page?:string}>}){
 if(!adminConfigured())redirect('/admin');
 const session=await auth();
 if(!session?.user)redirect('/admin');
 const {after,view,page}=await searchParams;
 const active=view==='applications'||view==='events'||view==='reservations'?view:'tonight';
 const navigation=[['tonight','Tonight'],['reservations','Reservations'],['applications','Hiring'],['events','Events']] as const;
 const upcoming=active==='tonight'||active==='events'?upcomingOccurrences():[];
 const applicationPage=typeof page==='string'&&/^[1-9][0-9]{0,2}$/.test(page)?Math.min(500,Number(page)):1;
 let applications:Awaited<ReturnType<typeof listClubApplications>>|null=null;
 if(active==='applications')try {applications=await listClubApplications(applicationPage);} catch {}
 const cursor=typeof after==='string'&&/^cs_[a-zA-Z0-9_]{1,200}$/.test(after)?after:undefined;
 let records:Awaited<ReturnType<typeof reservations>>|null=null;
 if(active==='reservations'||active==='tonight')try {records=await reservations(cursor);} catch {}
 return <main className="dash">
  <aside className="rail">
   <a href="/" className="dashLogo" aria-label="202 Lounge website">202<span>°</span></a>
   <nav className="railNav" aria-label="Command center"><b>COMMAND CENTER</b>{navigation.map(([id,label])=>
    <a key={id} href={id==='tonight'?'/dashboard':'/dashboard?view='+id} aria-current={active===id?'page':undefined} style={{display:'block',padding:'12px',borderRadius:6,color:active===id?'#c4f432':'inherit',background:active===id?'#232819':undefined}}>{label}</a>)}</nav>
   <nav className="mobileNav" aria-label="Command center" style={{overflowX:'auto'}}>{navigation.map(([id,label])=>
    <a key={id} href={id==='tonight'?'/dashboard':'/dashboard?view='+id} aria-current={active===id?'page':undefined} style={{display:'inline-block',padding:'9px',color:active===id?'#c4f432':'inherit'}}>{label}</a>)}</nav>
  </aside>
  <section className="dashMain">
   <header><div><small>WASHINGTON, DC / OWNER COMMAND CENTER</small><h1>{active==='tonight'?'GOOD EVENING.':navigation.find(([id])=>id===active)?.[1].toUpperCase()+'.'}</h1></div>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}><a href="/">VIEW LIVE SITE ↗</a><form action={async()=>{'use server';await signOut({redirectTo:'/admin'});}}><button type="submit">Sign out</button></form></div>
   </header>
   {active==='tonight'&&<>
    <div className="metrics">
     <article><small>RECENT CHECKOUTS</small><strong>{records&&!records.testMode?records.rows.length:'—'}</strong><span>Latest Stripe results</span></article>
     <article><small>PAID DEPOSITS</small><strong>{records&&!records.testMode?records.rows.filter(r=>r.payment_status==='paid').length:'—'}</strong><span>Among recent checkouts</span></article>
     <article><small>UPCOMING EVENTS</small><strong>{upcoming.length}</strong><span>Public schedule</span></article>
    </div>
    <div className="opsGrid">
     <section className="panel"><h2>Upcoming events</h2>{upcoming.slice(0,4).map(({key,label,event})=><p key={key}>{label} · {event.artist}</p>)}<a href="/dashboard?view=events">View schedule →</a></section>
     <section className="panel"><h2>Staff applications</h2><a href="/dashboard?view=applications">Review applications →</a></section>
    </div>
   </>}
   <div className="panel fullPanel">
  {active==='applications'&&<section aria-label="Staff applications">
   <h2>Staff applications</h2>
   {!applications||applications.partial?<p role="alert">{applications?'Some application records could not be loaded.':'Could not load applications from Prosper.'} <a href={'/dashboard?view=applications&page='+applicationPage}>Retry</a> · <a href="https://app.bornforprosperity.com/">Open Prosper</a></p>:null}
   {applications&&!applications.partial&&!applications.rows.length&&<p>No staff applications in this group of contacts.</p>}
   {applications?.rows.map(row=>{
    const lines=row.body.trim().split(/\r?\n/);
    const headline=lines.find(line=>line.startsWith('Name: '))?.slice(6)||'Staff application';
    const role=lines.find(line=>line.startsWith('Role: '))?.slice(6);
    return <details key={row.id} style={{border:'1px solid #3b402e',borderRadius:12,padding:18,marginBottom:12}}>
     <summary style={{cursor:'pointer',fontWeight:700}}>{headline}{role?' · '+role:''}</summary>
     <div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:14}}>{lines.slice(2).join('\n')}</div>
    </details>;
   })}
   {applicationPage>1&&<p><a href={'/dashboard?view=applications&page='+(applicationPage-1)}>← Previous group</a></p>}
   {applications?.next&&<p><a href={'/dashboard?view=applications&page='+(applicationPage+1)}>Next group →</a></p>}
  </section>}
  {active==='events'&&<section aria-label="Upcoming events">
   <h2>Upcoming events</h2>
   <p>Schedule shown on the public site.</p>
   <ul style={{display:'grid',gap:10,paddingLeft:20}}>{upcoming.map(({event,date,label})=><li key={event.id+'-'+date}><strong>{event.artist}</strong> · {label} · {event.time}</li>)}</ul>
  </section>}
  {(active==='reservations'||active==='tonight')&&<><h2>Table reservations</h2>
  <p>Submitted bookings appear once checkout opens. A paid deposit does not confirm table availability.</p>
  <p><a href="/dashboard?view=reservations" style={{color:'#c4f432'}}>Refresh / newest bookings</a></p>
  {!records?<p role="alert">Reservations could not be loaded from Stripe. Refresh to retry.</p>:
   records.testMode?<p role="alert">The site is connected to Stripe test mode. Live bookings are unavailable.</p>:
   records.rows.length===0?<p>No live 202 Lounge reservations on this page.</p>:null}
  <section aria-label="Reservation records" style={{display:'grid',gap:16}}>
   {records?.rows.slice(0,active==='tonight'?5:undefined).map(row=>{
    const info=row.metadata!;
    const paid=row.payment_status==='paid';
    const status=paid?'Deposit paid':row.status==='expired'?'Checkout expired':row.status==='complete'?'Payment pending':'Awaiting deposit';
    const amount=row.amount_total!==null&&row.currency==='usd'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(row.amount_total/100):null;
    return <article key={row.id} style={{border:'1px solid #3b402e',borderRadius:12,padding:18,overflowWrap:'anywhere'}}>
     <p style={{color:paid?'#c4f432':'#efcc84',fontWeight:700}}>{status}{amount?' · '+amount:''}</p>
     <h2>{info.guest_name||'Guest'} · {info.event_name||'Table reservation'}</h2>
     <p>Submitted {time.format(new Date(row.created*1000))} ET</p>
     <dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12}}>
      {fields.map(([label,key])=><div key={key}><dt style={{color:'#b7baab',fontSize:13}}>{label}</dt><dd style={{margin:0}}>{info[key]?(key==='extras'?extras(info[key]):info[key]):'—'}</dd></div>)}
     </dl>
     <small>Stripe reference: {row.id}</small>
    </article>;
   })}
  </section>
  {active==='reservations'&&records?.next&&<p><a style={{color:'#c4f432'}} href={'/dashboard?view=reservations&after='+encodeURIComponent(records.next)}>Older checkout records →</a></p>}
  </>}
   </div>
  </section>
 </main>;
}
