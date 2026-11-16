'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import styles from './checkout.module.css';

type Booking = {clientSecret:string; expiresAt:number; reservation:{event:string;date:string;image:string;floor:string;table:number|null;guests:number;package:string;arrival:string;name:string;email:string}};
type Session = {canConfirm:boolean;total:{total:{amount:string}}};
type ConfirmResult = {type:string;error?:{message?:string;code?:string}};
type ExpressConfirmEvent = {paymentFailed:(payload?:{reason?:'fail';message?:string})=>void;[key:string]:unknown};
type ExpressReadyEvent = {availablePaymentMethods?:{applePay?:boolean;googlePay?:boolean}};
type Actions = {confirm:(options?:{expressCheckoutConfirmEvent?:ExpressConfirmEvent})=>Promise<ConfirmResult>};
type StripeElement = {mount:(target:string)=>void;destroy:()=>void};
type ExpressCheckoutElement = StripeElement & {on(event:'ready',handler:(event:ExpressReadyEvent)=>void):void;on(event:'confirm',handler:(event:ExpressConfirmEvent)=>void):void};
type Checkout = {
  createPaymentElement:()=>StripeElement;
  createExpressCheckoutElement?:(options:unknown)=>ExpressCheckoutElement;
  on:(event:'change',handler:(session:Session)=>void)=>void;
  loadActions?:()=>Promise<{type:string;actions?:Actions;error?:{message?:string;code?:string}}>;
  confirm?:()=>Promise<ConfirmResult>;
};
type StripeClient = {initCheckoutElementsSdk?:(options:unknown)=>Checkout;initCheckout?:(options:unknown)=>Checkout};
declare global {interface Window {Stripe?:(key:string)=>StripeClient}}

export default function ClubCheckout({publishableKey}:{publishableKey:string}) {
  const [booking,setBooking]=useState<Booking|null>(null);
  const [scriptReady,setScriptReady]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [canPay,setCanPay]=useState(false);
  const [walletsAvailable,setWalletsAvailable]=useState(false);
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
    if(!publishableKey||!window.Stripe){setError('Secure payments are temporarily unavailable. Please return to your reservation and try again.');setLoading(false);return;}
    let cancelled=false;
    let payment:StripeElement|undefined;
    let express:ExpressCheckoutElement|undefined;
    try {
      const stripe=window.Stripe(publishableKey);
      const initialize=stripe.initCheckoutElementsSdk||stripe.initCheckout;
      if(!initialize)throw new Error('Checkout SDK unavailable');
      const checkout=initialize.call(stripe,{
        clientSecret:booking.clientSecret,
        elementsOptions:{appearance:{theme:'night',variables:{
          colorPrimary:'#c4f432',colorBackground:'#141613',colorText:'#f4f1e9',
          colorDanger:'#ff9e9e',fontFamily:'Arial, Helvetica, sans-serif',fontSizeBase:'16px',
          borderRadius:'10px',spacingUnit:'5px'
        }}}
      });
      console.info('Stripe checkout initialized', {publishableKeyMode:publishableKey.startsWith('pk_live_')?'live':publishableKey.startsWith('pk_test_')?'test':'unknown'});
      checkout.on('change',session=>{
        if(cancelled)return;
        // Read the Stripe total for both the summary and the payment button.
        setAmount(session.total.total.amount);
        setCanPay(session.canConfirm);
      });
      if(checkout.createExpressCheckoutElement){
        express=checkout.createExpressCheckoutElement({
          paymentMethods:{applePay:'always',googlePay:'always',link:'never',amazonPay:'never',paypal:'never',klarna:'never'},
          buttonHeight:52,
          buttonTheme:{applePay:'white',googlePay:'white'},
          buttonType:{applePay:'check-out',googlePay:'pay'},
          layout:{maxColumns:2,maxRows:1,overflow:'never'}
        });
        express.on('ready',event=>{
          if(cancelled)return;
          const available=(event as ExpressReadyEvent).availablePaymentMethods;
          setWalletsAvailable(Boolean(available?.applePay||available?.googlePay));
        });
        express.on('confirm',async event=>{
          if(submittingRef.current||!actionsRef.current)return;
          submittingRef.current=true;setPaying(true);setError('');
          try{
            const result=await actionsRef.current.confirm({expressCheckoutConfirmEvent:event as ExpressConfirmEvent});
            if(result.type==='error'){
              (event as ExpressConfirmEvent).paymentFailed({reason:'fail',message:result.error?.message});
              setError(result.error?.message||'Wallet payment could not be confirmed. Please try again.');
            }
          }catch{
            (event as ExpressConfirmEvent).paymentFailed({reason:'fail'});
            setError('Wallet payment could not be confirmed. Please try again.');
          }finally{submittingRef.current=false;setPaying(false);}
        });
        express.mount('#club-express-checkout');
      }
      payment=checkout.createPaymentElement();
      payment.mount('#club-payment-element');
      if(!checkout.loadActions){
        if(!checkout.confirm)throw new Error('Checkout actions unavailable');
        actionsRef.current={confirm:()=>checkout.confirm!()};setLoading(false);
      }else checkout.loadActions().then(result=>{
        if(cancelled)return;
        if(result.type==='success'&&result.actions){actionsRef.current=result.actions;setLoading(false);}
        else {
          console.error('Stripe Checkout loadActions failed', {type:result.type,code:result.error?.code,message:result.error?.message});
          setError(result.error?.message||'Unable to load secure checkout. Please return to your event and try again.');
          setLoading(false);
        }
      }).catch(error=>{if(!cancelled){console.error('Stripe Checkout loadActions rejected', error instanceof Error?error.message:'unknown');setError('Unable to load secure checkout. Please try again.');setLoading(false);}});
    }catch(error) {console.error('Stripe Checkout initialization failed',error instanceof Error?error.message:'unknown');setError('Unable to load secure checkout. Please return to your event and try again.');setLoading(false);}
    return()=>{cancelled=true;actionsRef.current=null;express?.destroy();payment?.destroy();};
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
    <Script src="https://js.stripe.com/dahlia/stripe.js" strategy="afterInteractive" onReady={()=>setScriptReady(true)} onError={()=>{setError('Secure payment fields could not load. Check your connection and reload.');setLoading(false);}}/>
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
        <div id="club-express-checkout" className={styles.expressElement}/>
        {walletsAvailable&&<p className={styles.walletLabel}>OR CHOOSE ANOTHER WAY TO PAY</p>}
        <div id="club-payment-element" className={styles.element}/>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {booking&&<button className={styles.pay} type="button" disabled={loading||!canPay||paying} onClick={pay}>{paying?'PROCESSING…':'PAY '+amount+' DEPOSIT'}<span aria-hidden="true">↗</span></button>}
        <p className={styles.protected}>Payment details are encrypted and processed by Stripe.</p>

        {!booking&&<Link href="/#events" className={styles.return}>Choose your event →</Link>}
      </section>
    </div>
    <footer className={styles.footer}><span>202 LOUNGE · CHINATOWN, WASHINGTON DC</span><span>609 H St NW</span></footer>
  </main>;
}
