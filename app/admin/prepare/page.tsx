'use client';
import {useState} from 'react';
import '../admin.css';
export default function PrepareAdmin(){
 const [prepared,setPrepared]=useState<{email:string;hash:string;secret:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return <main className="clubAdmin"><section><img src="/202/logo.webp" alt="202 Lounge"/><p className="adminEyebrow">PRIVATE ACCESS SETUP</p><h1>Admin setup.</h1>
 <p style={{fontSize:14,lineHeight:1.6}}>Choose the club login. Your password is hashed in this browser and is never sent from this form. Access stays locked until the prepared settings are installed.</p>
 {!prepared?<form onSubmit={async e=>{
 e.preventDefault();if(busy)return;setError('');const form=e.currentTarget,data=new FormData(form);
 const email=String(data.get('email')||'').trim().toLowerCase(),password=String(data.get('password')||''),confirm=String(data.get('confirm')||'');
 if(password!==confirm){setError('Passwords do not match.');return;}if(password.length<16){setError('Use at least 16 characters.');return;}
 setBusy(true);try{
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},key,256);
 const secret=hex(crypto.getRandomValues(new Uint8Array(32)));form.reset();
 setPrepared({email,hash:hex(salt)+':'+hex(new Uint8Array(derived)),secret});
 }catch{setError('Unable to prepare credentials. Please try again.');}finally{setBusy(false);}
 }}>
 <label>Club email<input type="email" name="email" autoComplete="username" required defaultValue="202loungemedia@gmail.com"/></label>
 <label>New password<input type="password" name="password" autoComplete="new-password" minLength={16} maxLength={256} required/></label>
 <label>Confirm password<input type="password" name="confirm" autoComplete="new-password" minLength={16} maxLength={256} required/></label>
 {error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'PREPARING…':'PREPARE ADMIN CREDENTIALS →'}</button>
 </form>:<div><p role="status">Credentials prepared. Leave this page open so the secure settings can be installed.</p>
 <label>ADMIN_EMAIL<input readOnly id="prepared-email" value={prepared.email}/></label>
 <label>ADMIN_PASSWORD_HASH<input readOnly id="prepared-hash" type="password" value={prepared.hash}/></label>
 <label>AUTH_SECRET<input readOnly id="prepared-secret" type="password" value={prepared.secret}/></label>
 </div>}<a className="adminBack" href="/admin">Back to Admin</a></section></main>;
}
