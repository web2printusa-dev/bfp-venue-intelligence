'use client';

import { useState } from 'react';

const events = [
  { day: '09', month: 'OCT', artist: 'MIDNIGHT / AFTER DARK', note: 'OPEN FORMAT · THURSDAY', image: 'https://images.unsplash.com/photo-1571266028243-d220c9c3b2d2?auto=format&fit=crop&w=1200&q=85' },
  { day: '10', month: 'OCT', artist: 'SAINT NOIR', note: 'HIP-HOP · FRIDAY', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85' },
  { day: '11', month: 'OCT', artist: 'THE SATURDAY RITUAL', note: 'R&B · HIP-HOP · SATURDAY', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85' },
];
const tables = [
  { name: 'DJ Gallery', guests: 8, minimum: '$2,500', detail: 'Direct sightline to the booth. High-energy placement at the center of the room.' },
  { name: 'Noir Booth', guests: 10, minimum: '$1,800', detail: 'Elevated VIP booth with a full view of the main floor.' },
  { name: 'Salon', guests: 6, minimum: '$1,200', detail: 'Intimate lounge seating with fast access to the bar.' },
];

type Msg = { role: 'ai' | 'user'; text: string };

export default function Home() {
  const [selected, setSelected] = useState<(typeof tables)[0] | null>(null);
  const [concierge, setConcierge] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role:'ai', text:'Welcome to NOIR. Tell me what kind of night you’re planning and I’ll help with the right table, guest count, budget and bottles.' }]);

  async function send(text?: string) {
    const value = (text || input).trim(); if (!value || busy) return;
    setMessages(m=>[...m,{role:'user',text:value}]); setInput(''); setBusy(true);
    try { const r=await fetch('/api/concierge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value})}); const d=await r.json(); setMessages(m=>[...m,{role:'ai',text:d.reply}]); }
    catch { setMessages(m=>[...m,{role:'ai',text:'I can still help. How many guests are you planning for?'}]); }
    finally { setBusy(false); }
  }

  return <main>
    <section className="hero"><div className="heroImage"/><div className="grain"/><header><a className="mark" href="#">N<span>O</span>IR</a><nav><a href="#events">Events</a><a href="#experience">The room</a><a href="#reserve">Tables</a><button onClick={()=>setConcierge(true)}>VIP Concierge</button></nav></header><div className="heroCopy"><p className="eyebrow">WASHINGTON, DC · AFTER DARK</p><h1>THE NIGHT<br/><i>IS YOURS.</i></h1><div className="heroBottom"><p>A new expression of nightlife.<br/>Music, movement, and the right table.</p><a href="#events">See what&apos;s next <b>↘</b></a></div></div></section>
    <section className="intro" id="experience"><p className="sectionNo">01 / THE EXPERIENCE</p><h2>DON&apos;T JUST<br/>GO <em>OUT.</em><br/><span>ARRIVE.</span></h2><div className="introAside"><p>Built around the room, not around a screen. Discover the night, find your place, and let your private concierge handle the details.</p><button onClick={()=>setConcierge(true)}>Plan my night ↗</button></div></section>
    <section className="events" id="events"><div className="sectionHead"><p>02 / UPCOMING</p><h2>THIS WEEK<br/><i>AT NOIR</i></h2><span>OCTOBER 2026</span></div><div className="eventGrid">{events.map((event,i)=><article className={i===1?'event featured':'event'} key={event.artist}><div className="eventPhoto" style={{backgroundImage:`linear-gradient(180deg,transparent 35%,rgba(0,0,0,.82)),url(${event.image})`}}/><div className="date"><strong>{event.day}</strong><span>{event.month}</span></div><div className="eventInfo"><p>{event.note}</p><h3>{event.artist}</h3><div><button>Tickets</button><button onClick={()=>setSelected(tables[i%tables.length])}>Tables</button></div></div></article>)}</div></section>
    <section className="reserve" id="reserve"><div className="reserveVisual"><div className="floorLabel">THE ROOM / LIVE VIEW · WASHINGTON, DC</div><div className="floor"><span className="stage">DJ</span>{['A1','A2','B1','B2','C1','C2'].map((t,i)=><button key={t} className={i===2?'hot':''} onClick={()=>setSelected(tables[i%3])}>{t}</button>)}</div></div><div className="reserveCopy"><p>03 / YOUR TABLE</p><h2>YOUR NIGHT.<br/><i>YOUR VIEW.</i></h2><p className="body">Choose where you want to be—or tell the concierge what kind of night you&apos;re planning and let it find the right table for you.</p><button className="primary" onClick={()=>setSelected(tables[0])}>Explore tables</button><button className="textBtn" onClick={()=>setConcierge(true)}>Ask VIP Concierge →</button></div></section>
    <footer><div className="mark">N<span>O</span>IR</div><p>Washington, DC · A BFP Venue Intelligence demonstration.</p><div><a href="#events">Events</a><a href="#reserve">Reservations</a><a href="#">Private Events</a></div></footer>
    {selected&&<div className="overlay" onClick={()=>setSelected(null)}><div className="booking" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><p className="eyebrow">TABLE EXPERIENCE</p><h2>{selected.name}</h2><p>{selected.detail}</p><div className="facts"><span><small>UP TO</small>{selected.guests} guests</span><span><small>MINIMUM</small>{selected.minimum}</span></div><div className="bookingActions"><button className="primary" onClick={()=>{setSelected(null);setConcierge(true);send(`I want to reserve the ${selected.name} for up to ${selected.guests} guests.`)}}>Continue reservation</button><button onClick={()=>{setSelected(null);setConcierge(true);send(`Help me decide if the ${selected.name} is right for my night.`)}}>Ask VIP Concierge</button></div></div></div>}
    {concierge&&<div className="concierge"><div className="conciergeTop"><div><small>NOIR DC / PRIVATE HOST</small><strong>VIP Concierge</strong></div><button onClick={()=>setConcierge(false)}>×</button></div><div className="chat chatLive">{messages.map((m,i)=><p key={i} className={m.role==='ai'?'ai':'userMsg'}>{m.text}</p>)}{busy&&<p className="typing">Concierge is thinking…</p>}<div className="suggestions"><button onClick={()=>send('Birthday for 10 guests')}>Birthday · 10 guests</button><button onClick={()=>send('I want to be near the DJ')}>Near the DJ</button><button onClick={()=>send('Keep the table under $2,500')}>Under $2,500</button></div></div><form className="composer" onSubmit={e=>{e.preventDefault();send()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tell me about your night…"/><button type="submit">↑</button></form></div>}
  </main>;
}