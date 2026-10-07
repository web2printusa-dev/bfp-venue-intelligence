import { NextResponse } from 'next/server';
import { dashboard } from '../../../lib/demo-store';
import { venueConfig } from '../../../lib/venue-config';

function answerFromSnapshot(q:string){
 const d=dashboard();
 const s=q.toLowerCase();
 if(s.includes('ad')){const best=venueConfig.ads[0];const weak=venueConfig.ads.find(a=>a.status==='REVIEW');return `Your ads are producing business, but one is dragging the average down. ${best.name} is the strongest right now: ${best.spend} spent produced ${best.leads} results, including ${best.tableInquiries} table inquiries and ${best.ticketSales} ticket sales. ${weak?`${weak.name} is costing more for each result and is getting weaker. BFP should replace the tired creative and move more money toward what is already working.`:''}`;}
 if(s.includes('promoter')){const p=[...venueConfig.promoters].sort((a,b)=>b.revenue-a.revenue)[0];return `${p.name} is making you the most money right now: ${p.revenue.toLocaleString()} tied to their guests, with ${p.tables} tables and ${p.tickets} ticket sales. Keep feeding that promoter inventory, and push the weaker promoters harder on Saturday instead of treating everyone the same.`;}
 if(s.includes('social')||s.includes('post'))return `This week's social calendar has ${venueConfig.social.length} scheduled or draft items. The strongest next move is to pair event-specific content with the nights that still have table inventory to move.`;
 if(s.includes('text')||s.includes('sms')||s.includes('email')||s.includes('fill saturday'))return `I would split outreach into three groups: high-value guests without a current weekend reservation, upcoming birthdays, and unconfirmed table leads. That keeps the message relevant instead of blasting everyone with the same offer.`;
 if(s.includes('event')){const e=venueConfig.events[1];return `${e.name} is currently strongest with ${e.ticketsSold} tickets sold, $${e.ticketRevenue.toLocaleString()} in ticket revenue and ${e.tableInquiries} table inquiries. The next move is to coordinate ads, social and promoters around remaining table inventory.`;}
 if(s.includes('attention')||s.includes('fix')||s.includes('cost me money'))return `Three things can cost you money tonight: open tables that are still unsold, a weaker ad that is spending without producing enough business, and people who showed interest in tables but have not committed. Fix those before spending more. Your strongest promoter can also help move the remaining Saturday inventory.`;
 if(s.includes('open')||s.includes('available'))return `Tonight has ${d.stats.availableTables} available tables: ${d.tables.filter(t=>t.status==='available').map(t=>`${t.name} ${t.id} ($${t.minimum.toLocaleString()} min)`).join(', ')}.`;
 if(s.includes('birthday')){const rows=d.reservations.filter(r=>r.occasion?.toLowerCase().includes('birthday'));return rows.length?`${rows.length} birthday reservation is on the books: ${rows.map(r=>`${r.guestName}, party of ${r.partySize}, ${r.tableId}`).join('; ')}.`:'No birthday reservations are currently on the books.'}
 if(s.includes('bottle'))return `Reserved bottle notes: ${d.reservations.filter(r=>r.bottles?.length).map(r=>`${r.guestName}: ${r.bottles?.join(', ')}`).join('; ')||'none yet'}. The bottle menu has ${d.bottles.flatMap(b=>b.items).length} configured selections.`;
 if(s.includes('revenue')||s.includes('money')||s.includes('sales'))return `Right now the club has ${d.stats.projectedTableRevenue.toLocaleString()} in table minimums represented and $26.7K in weekend ticket revenue. The fastest money left on the table is the unsold table inventory. After that, re-contact past VIP guests before spending more on ads.`;
 if(s.includes('hold'))return `${d.stats.holds} table is currently on hold: ${d.reservations.filter(r=>r.status==='hold').map(r=>`${r.tableId} for ${r.guestName}`).join(', ')}.`;
 return `Command center snapshot: ${d.stats.reservations} confirmed reservation, ${d.stats.holds} active hold, ${d.stats.availableTables} tables available, 668 weekend tickets sold and 65 tracked ad results. Ask about guests, marketing, social, promoters, events or revenue.`;
}

function responseExtras(text:string){
 const s=text.toLowerCase();
 if(s.includes('ad'))return {insights:[{label:'BEST CAMPAIGN',value:'SAINT NOIR — VIDEO 01',note:'Lowest cost per tracked result'},{label:'NEEDS ATTENTION',value:'MIDNIGHT — RETARGETING',note:'Cost per result is elevated'},{label:'NEXT MOVE',value:'Refresh creative',note:'Protect winners, replace fatigue'}],actions:[{id:'revenue_push',label:'CREATE RECOVERY PLAN'}]};
 if(s.includes('text')||s.includes('sms')||s.includes('fill saturday'))return {insights:[{label:'VIP REACTIVATION',value:'42 guests',note:'No current weekend reservation'},{label:'BIRTHDAY WINDOW',value:'18 guests',note:'Upcoming birthdays'},{label:'OPEN TABLES',value:'4 tables',note:'Inventory available to sell'}],actions:[{id:'send_vip_sms',label:'SEND VIP REACTIVATION'},{id:'email_birthdays',label:'EMAIL BIRTHDAY GUESTS'}]};
 if(s.includes('promoter'))return {insights:[{label:'TOP PROMOTER',value:'J. Prince',note:'$9,200 attributed revenue'},{label:'TABLES',value:'4',note:'Highest table contribution'},{label:'NEXT MOVE',value:'Activate all teams',note:'Push remaining Saturday inventory'}],actions:[{id:'notify_promoters',label:'NOTIFY PROMOTERS'}]};
 if(s.includes('attention')||s.includes('revenue'))return {insights:[{label:'OPEN TABLE MINIMUMS',value:'$7,300',note:'Available inventory opportunity'},{label:'AD ISSUE',value:'1 campaign',note:'Creative refresh recommended'},{label:'VIP OPPORTUNITY',value:'42 guests',note:'Reactivation audience ready'}],actions:[{id:'revenue_push',label:'BUILD REVENUE PUSH'},{id:'send_vip_sms',label:'REACTIVATE VIPS'}]};
 return {insights:[{label:'AVAILABLE TABLES',value:'4',note:'Ready to sell'},{label:'WEEKEND TICKETS',value:'668',note:'Across current events'},{label:'TRACKED AD RESULTS',value:'65',note:'Current marketing activity'}],actions:[]};
}

export async function POST(req:Request){
 const {message}=await req.json();
 const q=String(message||'').trim();
 if(!q)return NextResponse.json({reply:'Ask me what is happening across the venue, guests, marketing or revenue.',...responseExtras('')});
 const data={...dashboard(),marketing:{ads:venueConfig.ads,social:venueConfig.social,promoters:venueConfig.promoters,events:venueConfig.events}};
 const extras=responseExtras(q);
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({reply:answerFromSnapshot(q),...extras});
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({
   model:process.env.OPENAI_MODEL||'gpt-5-mini',
   instructions:`You are the AI brain for a nightclub owner. Speak like a sharp general manager, not a marketer or software engineer. Use plain English and focus on what an owner cares about: money, tables, ticket sales, guest behavior, promoter performance, marketing results, staffing/host follow-up, and what needs attention. Translate marketing numbers into business meaning. Say things like 'this ad is making you money', 'this one is wasting money', 'you have four tables left to sell', or 'these guests should be contacted now'. Avoid jargon such as CPL, ROAS, funnels, retargeting, audience segmentation, workflows, CRM, APIs, or campaign architecture unless the owner explicitly asks. Do not expose targeting details, vendor details, or implementation internals. Answer from the supplied venue snapshot only. End with a clear recommended next move when useful. Never claim an external action was executed unless the system confirms it. Venue snapshot: ${JSON.stringify(data)}`,
   input:q
  })});
  if(!r.ok)throw new Error();
  const j=await r.json();
  return NextResponse.json({reply:j.output_text||answerFromSnapshot(q),...extras});
 }catch{
  return NextResponse.json({reply:answerFromSnapshot(q),...extras});
 }
}
