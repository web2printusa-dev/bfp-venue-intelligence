'use client';
import {useState} from 'react';
import {signIn} from 'next-auth/react';
export default function LoginForm({ready}:{ready:boolean}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();if(busy||!ready)return;const data=new FormData(e.currentTarget);setBusy(true);setError('');try{const result=await signIn('credentials',{email:data.get('email'),password:data.get('password'),redirect:false});if(result?.error)setError('Unable to sign in. Check your details or try again later.');else window.location.assign('/dashboard');}catch{setError('Sign-in is temporarily unavailable.');}finally{setBusy(false);}}}>
 <label>Email<input type="email" name="email" autoComplete="username" required maxLength={254}/></label>
 <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={256}/></label>
 {error&&<p role="alert">{error}</p>}
 {!ready&&<p>Admin access is awaiting credential setup. The dashboard is locked.</p>}
 <button disabled={!ready||busy} type="submit">{busy?'SIGNING IN…':'SIGN IN →'}</button>
 </form>;
}
