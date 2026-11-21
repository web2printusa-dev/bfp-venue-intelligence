import {redirect} from 'next/navigation';
import {auth,adminConfigured,signOut} from '../../lib/club-auth';

import {listClubApplications} from '../../lib/202-prosper';
import {upcomingOccurrences} from '../../lib/202-lounge-public';

export const dynamic='force-dynamic';
export const metadata={title:'Operations | 202 Lounge',robots:{index:false,follow:false}};

type Booking={id:string;created:number;livemode:boolean;status:string;payment_status:string;amount_total:number|null;currency:string|null;metadata:Record<string,string>|null};
// Group only fully identified paid bookings; keep every checkout visible in history.
function bookingKey(row:Booking) {
 const m=row.metadata;
 if (!m || row.payment_status!=='paid') return null;
 const parts=[m.guest_email,m.event_id,m.event_date,m.floor,m.table,m.arrival_time,m.guest_count]
  .map(value=>value?.trim().toLowerCase());
 if (!parts.every(Boolean) || /^(any|none|n\/?a|any available.*|no preference)$/.test(parts[4]!)) return null;
 return JSON.stringify(parts);
}
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

export default async function Dashboard({searchParams}:{searchParams:Promise<{after?:string; view?:string; page?:string; q?:string; date?:string; status?:string}>}){
 if(!adminConfigured())redirect('/admin');
 const session=await auth();
 if(!session?.user)redirect('/admin');
 const {after,view,page,q,date,status:filter}=await searchParams;
 const active=view==='applications'||view==='events'||view==='reservations'?view:'tonight';
 const navigation=[['tonight','Tonight'],['reservations','Bookings'],['applications','Hiring'],['events','Events']] as const;
 const upcoming=upcomingOccurrences();
 const applicationPage=typeof page==='string'&&/^[1-9][0-9]{0,2}$/.test(page)?Math.min(500,Number(page)):1;
 let applications:Awaited<ReturnType<typeof listClubApplications>>|null=null;
 if(active==='applications')try {applications=await listClubApplications(applicationPage);} catch {}
 const cursor=typeof after==='string'&&/^cs_[a-zA-Z0-9_]{1,200}$/.test(after)?after:undefined;
 let records:Awaited<ReturnType<typeof reservations>>|null=null;
 if(active==='reservations'||active==='tonight')try {records=await reservations(cursor);} catch {}
 const event=upcoming[0];
 const query=typeof q==='string'?q.trim().slice(0,100):'';
 const selectedDate=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'';
 const statusFilter=typeof filter==='string'&&['paid','unpaid','expired','all'].includes(filter)?filter:'paid';
 const paid=(r:Booking)=>r.payment_status==='paid';
 const expired=(r:Booking)=>!paid(r)&&r.status==='expired';
 const rows=records?.rows??[];
 const paidGroups=new Map<string,Booking[]>();
 for(const row of rows) if(paid(row)){
  const key=bookingKey(row)??row.id;
  const group=paidGroups.get(key)??[];
  if(!group.includes(row))group.push(row);
  paidGroups.set(key,group);
 }
 const primary=new Map<string,Booking[]>();
 const repeats=new Set<string>();
 for(const group of paidGroups.values()){
  group.sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
  primary.set(group[0].id,group.slice(1));
  for(const row of group.slice(1))repeats.add(row.id);
 }
 const arrivals=event?rows.filter(r=>primary.has(r.id)&&r.metadata?.event_date===event.date&&r.metadata?.event_id===event.event.id).sort((a,b)=>arrivalOrder(a)-arrivalOrder(b)):[];
 const visible=active==='tonight'?arrivals:rows.filter(r=>{
  const m=r.metadata??{};
  const digits=query.replace(/\D/g,'');
  return (!selectedDate||m.event_date===selectedDate)&&
   (!query||(m.guest_name??'').toLowerCase().includes(query.toLowerCase())||(digits.length>=3&&(m.guest_phone??'').replace(/\D/g,'').includes(digits)))&&
   (statusFilter==='all'||(statusFilter==='active'&&!expired(r))||(statusFilter==='paid'&&primary.has(r.id))||(statusFilter==='unpaid'&&!paid(r)&&!expired(r))||(statusFilter==='expired'&&expired(r)));
 });
 const nextParams=new URLSearchParams({view:'reservations',q:query,date:selectedDate,status:statusFilter});
 if(records?.next)nextParams.set('after',records.next);
 return <main className="clubAdmin">
  <style>{adminStyles}</style>
  <aside className="clubSidebar">
   <a href="/dashboard" className="clubBrand"><img src="/202/logo.webp" alt="" width="44" height="44"/><span><strong>202 Lounge</strong><small>Owner workspace</small></span></a>
   <nav aria-label="Club operations"><small>WORKSPACE</small>{navigation.map(([id,label],index)=>
    <a key={id} href={id==='tonight'?'/dashboard':'/dashboard?view='+id} aria-current={active===id?'page':undefined}><span className="clubIcon" aria-hidden>{['▦','▤','♙','◫'][index]}</span>{label}</a>)}</nav>
   <div className="clubSidebarFoot"><a href="/">View public site ↗</a><form action={async()=>{'use server';await signOut({redirectTo:'/admin'});}}><button type="submit">Sign out</button></form></div>
  </aside>
  <section className="clubWorkspace">
   <div className="clubTopbar"><span>202 Lounge / {active==='tonight'?'Tonight':active==='applications'?'Staff applications':navigation.find(([id])=>id===active)?.[1]}</span><span>Washington, DC</span></div>
   <div className="clubContent">
   <header className="clubHeading"><div><small>OPERATIONS</small><h1>{active==='tonight'?'Tonight':active==='applications'?'Staff applications':navigation.find(([id])=>id===active)?.[1]}</h1></div>{active==='reservations'&&<a className="clubButton" href="/dashboard?view=reservations">Refresh records</a>}</header>
   {active==='tonight'&&<section className="clubPanel clubNext">
    <small>NEXT ON THE PUBLIC SCHEDULE</small>
    <h2>{event?.event.artist??'No upcoming events'}</h2>
    {event&&<p>{event.label} · {event.event.time}</p>}
    {records&&!records.testMode&&event&&<strong>{arrivals.length} paid {arrivals.length===1?'booking':'bookings'} with a paid deposit in recent checkouts</strong>}
   </section>}
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
   <h2>Next at 202 Lounge</h2>
   <p>Pick a night to see its table bookings.</p>
   <div className="clubEventList">{upcoming.slice(0,5).map(item=><EventRow key={item.key} item={item}/>)}</div>
   {!upcoming.length&&<p>No upcoming events are listed.</p>}
   {upcoming.length>5&&<details className="clubMoreEvents"><summary>Show later dates ({upcoming.length-5})</summary><div className="clubEventList">{upcoming.slice(5).map(item=><EventRow key={item.key} item={item}/>)}</div></details>}
  </section>}
  {(active==='reservations'||active==='tonight')&&<><h2>{active==='tonight'?'Upcoming arrivals':'Table bookings'}</h2>
  {active==='reservations'&&<form className="clubFilters" action="/dashboard">
   <input type="hidden" name="view" value="reservations"/>
   <label>Guest name or phone<input name="q" type="search" defaultValue={query} placeholder="Search bookings"/></label>
   <label>Event date<input name="date" type="date" defaultValue={selectedDate}/></label>
   <label>Deposit status<select name="status" defaultValue={statusFilter}><option value="paid">Paid bookings</option><option value="active">Active checkout records</option><option value="unpaid">Unpaid or pending</option><option value="expired">Expired</option><option value="all">All statuses</option></select></label>
   <button type="submit">Apply filters</button>
  </form>}
  {active==='reservations'&&records&&!records.testMode&&statusFilter==='paid'&&<p>
   <strong>{visible.length} paid {visible.length===1?'booking':'bookings'} shown.</strong>{' '}
   Matching paid checkouts are grouped for review. Select All statuses to see each payment separately.
  </p>}
  <p>A paid deposit does not confirm a table assignment.</p>
  {active==='tonight'&&<p><a href="/dashboard?view=reservations">View all reservations →</a></p>}
  {!records?<p role="alert">Reservations could not be loaded from Stripe. Refresh to retry.</p>:
   records.testMode?<p role="alert">The site is connected to Stripe test mode. Live bookings are unavailable.</p>:
   visible.length===0?<p>{active==='tonight'?'No paid arrivals for this event in recent checkouts.':'No matching bookings on this page.'}</p>:null}
  <section aria-label="Reservation records" style={{display:'grid',gap:16}}>
   {visible.map(row=>{
    const info=row.metadata!;
    const paid=row.payment_status==='paid';
    const matching=primary.get(row.id)??[];
    const status=repeats.has(row.id)?'Possible repeat payment':paid?'Deposit paid':row.status==='expired'?'Checkout expired':row.status==='complete'?'Payment pending':'Awaiting deposit';
    const amount=row.amount_total!==null&&row.currency==='usd'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(row.amount_total/100):null;
    return <details key={row.id} className="clubRecord">
     <summary><span><strong>{info.guest_name||'Guest'}</strong><small>{info.event_name||'Table reservation'} · {info.event_date||'Date unavailable'}</small><small>{info.arrival_time||'Arrival not set'} · {info.guest_count||'—'} guests</small><small>{info.floor||'Floor not set'} · {/^\d+$/.test(info.table||'')?'Table '+info.table:info.table||'No table selected'}</small></span><span className={paid?'clubBadge paid':'clubBadge'}>{status}{amount?' · '+amount:''}</span></summary>
     <p>Submitted {time.format(new Date(row.created*1000))} ET</p>
     <dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12}}>
      {fields.map(([label,key])=><div key={key}><dt style={{color:'#b7baab',fontSize:13}}>{label}</dt><dd style={{margin:0}}>{info[key]?(key==='extras'?extras(info[key]):info[key]):'—'}</dd></div>)}
     </dl>
     <small>Stripe reference: {row.id}</small>
     {paid&&<p>Prosper: {info.prosper_synced==='true'?'Workflow queued':'Workflow delivery not recorded'}</p>}
     {matching.length>0&&<div><p role="status">{matching.length} additional paid {matching.length===1?'checkout matches':'checkouts match'} this booking. Review the payments in Stripe before issuing a refund.</p>
      {matching.map(other=><p key={other.id}>{time.format(new Date(other.created*1000))} ET · <small>{other.id}</small></p>)}</div>}
    </details>;
   })}
  </section>
  {active==='reservations'&&records?.next&&<p><a style={{color:'#c4f432'}} href={'/dashboard?'+nextParams.toString()}>Older checkout records →</a></p>}
  </>}
   </div>
   </div>
  </section>
 </main>;
}

function arrivalOrder(row:Booking){
 const match=/^(\d{2}):(\d{2})$/.exec(row.metadata?.arrival_time??'');
 if(!match)return Infinity;
 const hours=Number(match[1]);
 return (hours<6?hours+24:hours)*60+Number(match[2]);
}

function EventRow({item}:{item:ReturnType<typeof upcomingOccurrences>[number]}){
 return <a className="clubEventRow" href={'/dashboard?view=reservations&date='+item.date}>
  <span><small>{item.label}</small><strong>{item.event.artist}</strong><span>{item.event.time}</span></span>
  <span className="clubEventAction">Bookings →</span>
 </a>;
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
 .clubEventList{display:grid;gap:8px}.clubEventRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 12px;border:1px solid var(--line);border-radius:9px;background:#141613}.clubEventRow>span:first-child{display:grid;gap:2px;color:#f5f6f2}.clubEventRow small,.clubEventRow>span:first-child>span{color:var(--muted);font-size:12px}.clubEventAction{flex-shrink:0;font-size:13px;font-weight:700}.clubMoreEvents{margin-top:16px}.clubMoreEvents summary{cursor:pointer;color:var(--lime);padding:10px 0;font-weight:700}
.clubNext>small{color:var(--lime);font-weight:700;letter-spacing:.08em}.clubNext h2{margin-top:8px}
.clubFilters{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin:14px 0}.clubFilters label{display:grid;gap:4px;font-size:12px;color:var(--muted)}.clubFilters input,.clubFilters select,.clubFilters button{font:inherit;font-size:16px;min-height:44px;padding:8px 10px;color:#fff;background:#101210;border:1px solid var(--line);border-radius:8px}.clubFilters button{color:#111;background:var(--lime);font-weight:700;cursor:pointer}
@media(max-width:720px){.clubAdmin{grid-template-columns:1fr;display:block}.clubSidebar{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:row;justify-content:space-between;align-items:center}.clubSidebar nav{position:fixed;bottom:0;left:0;right:0;z-index:50;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:5px 4px calc(5px + env(safe-area-inset-bottom));background:#151714;border-top:1px solid var(--line)}.clubSidebar nav>small{display:none}.clubSidebar nav a{display:grid;justify-items:center;gap:3px;font-size:12px;padding:7px 2px;min-height:47px}.clubBrand img{width:32px;height:32px}.clubBrand small,.clubSidebarFoot>a{display:none}.clubSidebarFoot{padding:0}.clubTopbar{display:none}.clubContent{padding-bottom:calc(90px + env(safe-area-inset-bottom))}.clubFilters label{flex:1 1 135px;min-width:0}.clubFilters input,.clubFilters select{width:100%;min-width:0}.clubFilters button{width:100%}.clubRecord summary{align-items:start}.clubBadge{max-width:43%;text-align:center}}
`;
