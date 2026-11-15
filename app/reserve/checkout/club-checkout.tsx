'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import styles from './checkout.module.css';

type Booking = {clientSecret:string; expiresAt:number; reservation:{event:string;date:string;image:string;floor:string;table:number|null;guests:number;package:string;arrival:string;name:string;email:string}};
type Session = {canConfirm:boolean;total:{total:{amount:string}}};
type ConfirmResult = {type:string;error?:{message?:string}};
type Actions = {confirm:()=>Promise<ConfirmResult>};
type StripeElement = {mount:(target:string)=>void;destroy:()=>void};
type Checkout = {
  createPaymentElement:()=>StripeElement;
  on:(event:'change',handler:(session:Session)=>void)=>void;
  loadActions:()=>Promise<{type:string;actions?:Actions;error?:{message?:string}}>;
};
type StripeClient = {initCheckoutElementsSdk:(options:unknown)=>Checkout};
declare global {interface Window {Stripe?:(key:string)=>StripeClient}}

export default function ClubCheckout({publishableKey}:{publishableKey:string}) {
  const [booking,setBooking]=useState<Booking|null>(null);
  const [scriptReady,setScriptReady]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [canPay,setCanPay]=useState(false);
  const [paying,setPaying]=useState(false);
  const [amount,setAmount]=useState('$250.00');
  const actionsRef=useRef<Actions|null>(null);
  const submittingRef=useRef(false);
  useEffect(()=>{
    try {
      const raw=sessionStorage.getItem('202-checkout');
      const value=raw?JSON.parse(raw):null;
      if(!value?.clientSecret||!value.reservation||value.expiresAt*1000<=Date.now()) {
        throw new Error('Your checkout has expired. Please choose your event and table again.');
      }
      setBooking(value);
    }catch {
      setError('Start with your event and table to open secure checkout.');
      setLoading(false);
    }
  },[]);
  useEffect(()=>{
    if(!scriptReady||!booking)return;
    if(!publishableKey||!window.Stripe){setError('Secure payments are temporarily unavailable. Please call 202-520-9070.');setLoading(false);return;}
    let cancelled=false;
    let payment:StripeElement|undefined;
    try {
      const checkout=window.Stripe(publishableKey).initCheckoutElementsSdk({
        clientSecret:booking.clientSecret,
        elementsOptions:{appearance:{theme:'night',variables:{
          colorPrimary:'#c4f432',colorBackground:'#141613',colorText:'#f4f1e9',
          colorDanger:'#ff9e9e',fontFamily:'Arial, Helvetica, sans-serif',fontSizeBase:'16px',
          borderRadius:'10px',spacingUnit:'5px'
        },rules:{'.Input':{border:'1px solid #464a40'},'.Label':{fontWeight:'600'}}}}
      });
      checkout.on('change',session=>{
        if(cancelled)return;
        // Read the Stripe total for both the summary and the payment button.
        setAmount(session.total.total.amount);
        setCanPay(session.canConfirm);
      });
      payment=checkout.createPaymentElement();
      payment.mount('#club-payment-element');
      checkout.loadActions().then(result=>{
        if(cancelled)return;
        if(result.type==='success'&&result.actions){actionsRef.current=result.actions;setLoading(false);}
        else {setError(result.error?.message||'Unable to load secure checkout. Please return to your event and try again.');setLoading(false);}
      }).catch(()=>{if(!cancelled){setError('Unable to load secure checkout. Please try again.');setLoading(false);}});
    }catch {setError('Unable to load secure checkout. Please return to your event and try again.');setLoading(false);}
    return()=>{cancelled=true;actionsRef.current=null;payment?.destroy();};
  },[scriptReady,booking,publishableKey]);

  async function pay(){
    if(submittingRef.current||!actionsRef.current||!canPay)return;
    submittingRef.current=true;setPaying(true);setError('');
    try {
      const result=await actionsRef.current.confirm();
      if(result.type==='error')setError(result.error?.message||'Please check your payment details and try again.');
    }catch {setError('Payment could not be confirmed. Please check your details and try again.');}
    finally {submittingRef.current=false;setPaying(false);}
  }
  const r=booking?.reservation;
  const night=r?new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(r.date+'T12:00:00Z')):'';
  return <main className={styles.page}>
    <Script src="https://js.stripe.com/endive/stripe.js" strategy="afterInteractive" onReady={()=>setScriptReady(true)} onError={()=>{setError('Secure payment fields could not load. Check your connection and reload.');setLoading(false);}}/>
    <header className={styles.header}><Link href="/" aria-label="202 Lounge home"><img src="/202/logo.webp" alt="202 Lounge — The Experience"/></Link><Link href="/#events" className={styles.back}>← Back to events</Link></header>
    <div className={styles.layout}>
      <section className={styles.summary} aria-label="Reservation summary">
        <p className={styles.eyebrow}>YOUR NIGHT AT 202</p>
        <h1>MAKE IT<br/><em>YOUR NIGHT.</em></h1>
        {r&&<><div className={styles.event}><img src={r.image} alt={r.event+' flyer'}/><div><p>{night}</p><h2>{r.event}</h2><span>{r.arrival} arrival</span></div></div>
        <dl className={styles.details}>
          <div><dt>Your space</dt><dd>{r.floor}<br/><span>{r.table?'Preferred table '+r.table:'Concierge table selection'} · {r.guests} guests</span></dd></div>
          <div><dt>Your package</dt><dd>{r.package}</dd></div>
          <div><dt>Reserved by</dt><dd>{r.name}<br/><span>{r.email}</span></dd></div>
        </dl></>}
        <div className={styles.total}><span>DEPOSIT DUE TODAY</span><strong>{amount}</strong></div>
        <p className={styles.note}>Your deposit submits a table request. The club confirms availability and the remaining balance. Tax, gratuity and additional bottles may affect your final bill.</p>
      </section>
      <section className={styles.payment} aria-label="Secure payment">
        <div className={styles.paymentHead}><span className={styles.step}>FINAL STEP</span><span className={styles.secure}>SECURE CHECKOUT</span></div>
        <h2>LOCK IN<br/>YOUR PLANS.</h2>
        <p className={styles.intro}>Pay your deposit securely. Let the night begin.</p>
        {loading&&<p className={styles.loading} role="status">Loading secure payment options…</p>}
        <div id="club-payment-element" className={styles.element}/>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {booking&&<button className={styles.pay} type="button" disabled={loading||!canPay||paying} onClick={pay}>{paying?'PROCESSING…':'PAY '+amount+' DEPOSIT'}<span aria-hidden="true">↗</span></button>}
        <p className={styles.protected}>Payment details are encrypted and processed by Stripe.</p>
        <div className={styles.help}><span>Questions before you pay?</span><a href="sms:2025209070">Text 202-520-9070 ↗</a></div>
        {!booking&&<Link href="/#events" className={styles.return}>Choose your event →</Link>}
      </section>
    </div>
    <footer className={styles.footer}><span>202 LOUNGE · CHINATOWN, WASHINGTON DC</span><span>609 H St NW</span></footer>
  </main>;
}
