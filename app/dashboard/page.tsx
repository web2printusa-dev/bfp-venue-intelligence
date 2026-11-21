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
 return <main className="clubAdmin">
  <style>{adminStyles}</style>
  <aside className="clubSidebar">
   <a href="/dashboard" className="clubBrand"><img src="/202/logo.webp" alt="" width="44" height="44"/><span><strong>202 Lounge</strong><small>Owner workspace</small></span></a>
   <nav aria-label="Club operations"><small>WORKSPACE</small>{navigation.map(([id,label],index)=>
    <a key={id} href={id==='tonight'?'/dashboard':'/dashboard?view='+id} aria-current={active===id?'page':undefined}><span className="clubIcon" aria-hidden>{['▦','▤','♙','◫'][index]}</span>{id==='tonight'?'Overview':id==='applications'?'Staff applications':label}</a>)}</nav>
   <div className="clubSidebarFoot"><a href="/">View public site ↗</a><form action={async()=>{'use server';await signOut({redirectTo:'/admin'});}}><button type="submit">Sign out</button></form></div>
  </aside>
  <section className="clubWorkspace">
   <div className="clubTopbar"><span>202 Lounge / {active==='tonight'?'Overview':active==='applications'?'Staff applications':navigation.find(([id])=>id===active)?.[1]}</span><span>Washington, DC</span></div>
   <div className="clubContent">
   <header className="clubHeading"><div><small>OPERATIONS</small><h1>{active==='tonight'?'Club overview':active==='applications'?'Staff applications':navigation.find(([id])=>id===active)?.[1]}</h1></div>{active==='reservations'&&<a className="clubButton" href="/dashboard?view=reservations">Refresh records</a>}</header>
   {active==='tonight'&&<>
    <div className="clubMetrics">
     <article><small>RECENT CHECKOUTS</small><strong>{records&&!records.testMode?records.rows.length:'—'}</strong><span>Latest Stripe results</span></article>
     <article><small>PAID DEPOSITS</small><strong>{records&&!records.testMode?records.rows.filter(r=>r.payment_status==='paid').length:'—'}</strong><span>Among recent checkouts</span></article>
     <article><small>UPCOMING EVENTS</small><strong>{upcoming.length}</strong><span>Public schedule</span></article>
    </div>
    <div className="clubOverview">
     <section className="clubPanel"><h2>Upcoming events</h2>{upcoming.slice(0,4).map(({key,label,event})=><p key={key}>{label} · {event.artist}</p>)}<a href="/dashboard?view=events">View schedule →</a></section>
     <section className="clubPanel"><h2>Staff applications</h2><a href="/dashboard?view=applications">Review applications →</a></section>
    </div>
   </>}
   <div className="clubPanel clubRecords">
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
  {active==='tonight'&&<p><a href="/dashboard?view=reservations">View all reservations →</a></p>}
  {!records?<p role="alert">Reservations could not be loaded from Stripe. Refresh to retry.</p>:
   records.testMode?<p role="alert">The site is connected to Stripe test mode. Live bookings are unavailable.</p>:
   records.rows.length===0?<p>No live 202 Lounge reservations on this page.</p>:null}
  <section aria-label="Reservation records" style={{display:'grid',gap:16}}>
   {records?.rows.slice(0,active==='tonight'?5:undefined).map(row=>{
    const info=row.metadata!;
    const paid=row.payment_status==='paid';
    const status=paid?'Deposit paid':row.status==='expired'?'Checkout expired':row.status==='complete'?'Payment pending':'Awaiting deposit';
    const amount=row.amount_total!==null&&row.currency==='usd'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(row.amount_total/100):null;
    return <details key={row.id} className="clubRecord">
     <summary><span><strong>{info.guest_name||'Guest'}</strong><small>{info.event_name||'Table reservation'} · {info.event_date||'Date unavailable'}</small></span><span className={paid?'clubBadge paid':'clubBadge'}>{status}{amount?' · '+amount:''}</span></summary>
     <p>Submitted {time.format(new Date(row.created*1000))} ET</p>
     <dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12}}>
      {fields.map(([label,key])=><div key={key}><dt style={{color:'#b7baab',fontSize:13}}>{label}</dt><dd style={{margin:0}}>{info[key]?(key==='extras'?extras(info[key]):info[key]):'—'}</dd></div>)}
     </dl>
     <small>Stripe reference: {row.id}</small>
    </details>;
   })}
  </section>
  {active==='reservations'&&records?.next&&<p><a style={{color:'#c4f432'}} href={'/dashboard?view=reservations&after='+encodeURIComponent(records.next)}>Older checkout records →</a></p>}
  </>}
   </div>
   </div>
  </section>
 </main>;
}

const adminStyles=`
.clubAdmin{--line:#2d302a;--surface:#191b18;--muted:#a8aea2;--lime:#c4f432;display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100dvh;background:#101210;color:#f5f6f2;font:15px/1.5 system-ui,sans-serif}
.clubAdmin *{box-sizing:border-box}.clubAdmin a{color:var(--lime);text-decoration:none}.clubAdmin a:hover{text-decoration:underline}
.clubSidebar{height:100dvh;position:sticky;top:0;display:flex;flex-direction:column;gap:32px;padding:22px 14px;background:#151714;border-right:1px solid var(--line)}
.clubBrand{display:flex;align-items:center;gap:10px;padding:0 8px;color:#f5f6f2!important}.clubBrand img{object-fit:contain}.clubBrand strong,.clubBrand small{display:block}
.clubSidebar small,.clubHeading small,.clubMetrics small,.clubRecord small{color:var(--muted)}
.clubSidebar nav{display:grid;gap:5px}.clubSidebar nav>small{padding:0 12px;font-size:11px;letter-spacing:.12em}
.clubSidebar nav a{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:8px;color:#d6dbd1;white-space:nowrap}
.clubSidebar nav a:hover,.clubSidebar nav a[aria-current]{background:#262d20;color:var(--lime);text-decoration:none}
.clubIcon{font-size:18px;line-height:1}.clubSidebarFoot{margin-top:auto;display:flex;flex-direction:column;align-items:flex-start;gap:13px;padding:12px}
.clubSidebarFoot button,.clubButton{border:1px solid var(--line);background:var(--surface);color:#f5f6f2;border-radius:7px;padding:8px 12px;cursor:pointer;font:inherit}
.clubWorkspace{min-width:0}.clubTopbar{display:flex;justify-content:space-between;gap:12px;padding:14px clamp(16px,4vw,48px);border-bottom:1px solid var(--line);color:var(--muted);font-size:13px}
.clubContent{max-width:1440px;margin:auto;padding:clamp(18px,4vw,48px);display:grid;gap:20px}
.clubHeading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}.clubHeading h1{margin:4px 0 0;font-size:clamp(27px,4vw,42px);line-height:1.1;letter-spacing:-.04em}
.clubHeading small,.clubMetrics small{letter-spacing:.09em;font-weight:700;font-size:11px}.clubMetrics,.clubOverview{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}.clubOverview{grid-template-columns:repeat(2,minmax(0,1fr))}
.clubPanel,.clubMetrics article{border:1px solid var(--line);background:var(--surface);border-radius:11px;padding:19px;min-width:0}.clubPanel h2{font-size:19px;margin:0 0 8px}.clubPanel p{color:var(--muted);margin:8px 0 13px}
.clubMetrics strong,.clubMetrics span{display:block}.clubMetrics strong{font-size:32px;margin:4px 0}.clubMetrics span{color:var(--muted);font-size:12px}
.clubRecord{border-top:1px solid var(--line);padding:12px 0;overflow-wrap:anywhere}.clubRecord summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px}.clubRecord summary strong,.clubRecord summary small{display:block}.clubRecord summary strong:before{content:'›';color:var(--lime);margin-right:7px}.clubRecord[open] summary strong:before{content:'⌄'}
.clubBadge{border-radius:100px;padding:4px 9px;background:#332d24;color:#efcc84;font-size:12px;font-weight:700}.clubBadge.paid{color:#d9f99f;background:#293721}
@media(max-width:720px){.clubAdmin{grid-template-columns:1fr}.clubSidebar{position:sticky;z-index:5;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:9px 12px;gap:6px;display:grid;grid-template-columns:1fr auto}.clubSidebar nav{grid-row:2;grid-column:1/-1;display:flex;overflow:auto}.clubSidebar nav>small{display:none}.clubSidebar nav a{font-size:13px;padding:8px}.clubBrand img{width:32px;height:32px}.clubBrand small,.clubSidebarFoot>a{display:none}.clubSidebarFoot{padding:0}.clubTopbar{display:none}.clubOverview{grid-template-columns:1fr}.clubMetrics{gap:7px}.clubMetrics article{padding:10px}.clubMetrics strong{font-size:24px}}
`;
