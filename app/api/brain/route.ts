import { NextResponse } from 'next/server';
import { dashboard } from '../../../lib/demo-store';
import { venueConfig } from '../../../lib/venue-config';

function demoAnswer(q:string){
 const d=dashboard();
 const s=q.toLowerCase();
 if(s.includes('ad')){const best=venueConfig.ads[0];const weak=venueConfig.ads.find(a=>a.status==='REVIEW');return `Ads snapshot: ${best.name} is the strongest current demo campaign with ${best.leads} tracked results and ${best.tableInquiries} table inquiries on $${best.spend} spend. ${weak?weak.name+' needs attention because cost per result is higher and trend is negative. BFP should refresh creative and rebalance spend.':''}`;}
 if(s.includes('promoter')){const p=[...venueConfig.promoters].sort((a,b)=>b.revenue-a.revenue)[0];return `${p.name} is the top promoter in the demo with $${p.revenue.toLocaleString()} attributed revenue, ${p.tables} tables and ${p.tickets} tickets. I would keep them activated while re-engaging the lower performers for Saturday.`;}
 if(s.includes('social')||s.includes('post'))return `This week's social plan is loaded with ${venueConfig.social.length} scheduled/draft items. The brain can prepare captions, timing recommendations and event-specific content, while the publishing action is executed through the connected social layer.`;
 if(s.includes('text')||s.includes('sms')||s.includes('email'))return `I can prepare the audience and message, then trigger an approved CRM action without exposing the underlying CRM. For this demo, I'd recommend targeting unconfirmed table leads, recent VIPs and birthday guests separately so each message is relevant.`;
 if(s.includes('event')){const e=venueConfig.events[1];return `${e.name} is the strongest current demo event with ${e.ticketsSold} tickets sold, $${e.ticketRevenue.toLocaleString()} in ticket revenue and ${e.tableInquiries} table inquiries. The next move is to coordinate ads, social and promoters around the remaining table inventory.`;}
 if(s.includes('attention')||s.includes('fix'))return `Three things need attention: protect the strongest ad, refresh the campaign currently marked REVIEW, and use CRM outreach to convert unconfirmed table interest before spending more. Promoter performance is also strong enough to justify a Saturday push.`;
 if(s.includes('open')||s.includes('available'))return `Tonight has ${d.stats.availableTables} available tables: ${d.tables.filter(t=>t.status==='available').map(t=>`${t.name} ${t.id} ($${t.minimum.toLocaleString()} min)`).join(', ')}.`;
 if(s.includes('birthday')){const rows=d.reservations.filter(r=>r.occasion?.toLowerCase().includes('birthday'));return rows.length?`${rows.length} birthday reservation is on the books: ${rows.map(r=>`${r.guestName}, party of ${r.partySize}, ${r.tableId}`).join('; ')}.`:'No birthday reservations are currently on the books.'}
 if(s.includes('bottle'))return `Reserved bottle notes: ${d.reservations.filter(r=>r.bottles?.length).map(r=>`${r.guestName}: ${r.bottles?.join(', ')}`).join('; ')||'none yet'}. The demo bottle menu has ${d.bottles.flatMap(b=>b.items).length} configured selections.`;
 if(s.includes('revenue')||s.includes('money')||s.includes('sales'))return `The demo currently represents $${d.stats.projectedTableRevenue.toLocaleString()} in table minimums plus $26.7K in weekend ticket revenue. The owner-facing brain can summarize results without exposing ad targeting, workflow logic or the CRM platform.`;
 if(s.includes('hold'))return `${d.stats.holds} table is currently on hold: ${d.reservations.filter(r=>r.status==='hold').map(r=>`${r.tableId} for ${r.guestName}`).join(', ')}.`;
 return `Command center snapshot: ${d.stats.reservations} confirmed reservation, ${d.stats.holds} active hold, ${d.stats.availableTables} tables available, 668 weekend tickets sold and 65 tracked ad results. Ask about guests, marketing, social, promoters, events or revenue.`;
}

export async function POST(req:Request){
 const {message}=await req.json();
 const q=String(message||'').trim();
 if(!q)return NextResponse.json({reply:'Ask me what is happening across the venue, guests, marketing or revenue.'});
 const data={...dashboard(),marketing:{ads:venueConfig.ads,social:venueConfig.social,promoters:venueConfig.promoters,events:venueConfig.events}};
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({reply:demoAnswer(q),mode:'demo'});
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({
   model:process.env.OPENAI_MODEL||'gpt-5-mini',
   instructions:`You are the internal AI brain for a premium nightclub owner command center. The client never needs to know the underlying CRM vendor. Answer from the supplied venue snapshot only. Be concise, operational and commercially useful. You may recommend approved actions such as sending a text/email, preparing a social post, notifying promoters, reviewing an event, or asking BFP to optimize ads. Do not expose hidden targeting strategy, workflow architecture, CRM vendor details or implementation internals. For ads, show performance, what needs attention, and what BFP should fix; do not reveal audience targeting or campaign-building mechanics. Never claim an external action was actually executed unless the system confirms it. Venue snapshot: ${JSON.stringify(data)}`,
   input:q
  })});
  if(!r.ok)throw new Error();
  const j=await r.json();
  return NextResponse.json({reply:j.output_text||demoAnswer(q),mode:'ai'});
 }catch{return NextResponse.json({reply:demoAnswer(q),mode:'demo'});}
}
