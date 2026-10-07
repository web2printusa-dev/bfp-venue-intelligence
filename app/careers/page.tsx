'use client';
import {useState} from 'react';
import './careers.css';

export default function Careers(){
 const [form,setForm]=useState({name:'',role:'VIP Host',email:'',phone:'',availability:'',experience:'',why:''});
 const [status,setStatus]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setStatus('SUBMITTING');const r=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(d.ok){setStatus('RECEIVED');setForm({name:'',role:'VIP Host',email:'',phone:'',availability:'',experience:'',why:''})}else setStatus(d.error||'Please try again.')}
 function set(k:string,v:string){setForm(f=>({...f,[k]:v}))}
 return <main className="careers">
  <header><a href="/" className="careerLogo">NOIR<span>°</span></a><a href="/">BACK TO NOIR ↗</a></header>
  <section className="careerHero"><small>JOIN THE TEAM / WASHINGTON, DC</small><h1>WORK<br/><i>AFTER DARK.</i></h1><p>We are building a team that knows hospitality, energy and how to take care of people. Apply once and our hiring team can review your experience, availability and fit in one place.</p></section>
  <section className="careerGrid">
   <aside><small>OPEN ROLES</small><h2>Find your role.</h2>{['VIP Host','Bartender','Server','Security / Door','Bottle Service','Barback','Event Staff'].map(r=><button key={r} className={form.role===r?'active':''} onClick={()=>set('role',r)}>{r}<span>APPLY →</span></button>)}</aside>
   <form onSubmit={submit}><small>APPLICATION</small><h2>{form.role}</h2>
    <div className="two"><label>FULL NAME<input value={form.name} onChange={e=>set('name',e.target.value)} required/></label><label>MOBILE<input value={form.phone} onChange={e=>set('phone',e.target.value)} required/></label></div>
    <label>EMAIL<input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required/></label>
    <label>AVAILABILITY<input value={form.availability} onChange={e=>set('availability',e.target.value)} placeholder="Example: Thursday–Saturday nights" required/></label>
    <label>EXPERIENCE<textarea value={form.experience} onChange={e=>set('experience',e.target.value)} placeholder="Tell us about your nightlife, hospitality, service or security experience." required/></label>
    <label>WHY NOIR?<textarea value={form.why} onChange={e=>set('why',e.target.value)} placeholder="Why are you a strong fit for this role?" required/></label>
    <button className="submit" disabled={status==='SUBMITTING'}>{status==='SUBMITTING'?'SENDING…':'SUBMIT APPLICATION →'}</button>
    {status==='RECEIVED'&&<div className="received"><b>APPLICATION RECEIVED.</b><span>Our hiring team can now review your application and contact you about next steps.</span></div>}
   </form>
  </section>
 </main>
}
