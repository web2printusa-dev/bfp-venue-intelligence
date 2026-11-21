import {redirect} from 'next/navigation';
import {auth,adminConfigured,signOut} from '../../lib/club-auth';

export const dynamic='force-dynamic';
export const metadata={title:'Reservations | 202 Lounge',robots:{index:false,follow:false}};

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

export default async function Dashboard({searchParams}:{searchParams:Promise<{after?:string}>}){
 if(!adminConfigured())redirect('/admin');
 const session=await auth();
 if(!session?.user)redirect('/admin');
 const {after}=await searchParams;
 const cursor=typeof after==='string'&&/^cs_[a-zA-Z0-9_]{1,200}$/.test(after)?after:undefined;
 let records:Awaited<ReturnType<typeof reservations>>|null=null;
 try {records=await reservations(cursor);} catch {}
 return <main style={{maxWidth:1000,margin:'auto',padding:'clamp(20px,5vw,56px)',color:'#f8f7ed',background:'#121310',minHeight:'100vh'}}>
  <header style={{display:'flex',gap:16,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
   <div><p style={{color:'#c4f432',letterSpacing:3}}>202 LOUNGE · ADMIN</p><h1>Table reservations</h1></div>
   <form action={async()=>{'use server';await signOut({redirectTo:'/admin'});}}><button style={{background:'#c4f432',color:'#111',padding:'12px 20px',borderRadius:8,border:0,fontWeight:700}}>Sign out</button></form>
  </header>
  <p>Submitted bookings appear once checkout opens. A paid deposit does not confirm table availability.</p>
  <p><a href="/dashboard" style={{color:'#c4f432'}}>Refresh / newest bookings</a></p>
  {!records?<p role="alert">Reservations could not be loaded from Stripe. Refresh to retry.</p>:
   records.testMode?<p role="alert">The site is connected to Stripe test mode. Live bookings are unavailable.</p>:
   records.rows.length===0?<p>No live 202 Lounge reservations on this page.</p>:null}
  <section aria-label="Reservation records" style={{display:'grid',gap:16}}>
   {records?.rows.map(row=>{
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
  {records?.next&&<p><a style={{color:'#c4f432'}} href={'/dashboard?after='+encodeURIComponent(records.next)}>Older checkout records →</a></p>}
 </main>;
}
