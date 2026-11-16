import {redirect} from 'next/navigation';
import {auth,adminConfigured} from '../../lib/club-auth';
import LoginForm from './login-form';
import './admin.css';
export const dynamic='force-dynamic';
export const metadata={title:'Admin | 202 Lounge',robots:{index:false,follow:false}};
export default async function Admin(){
 const ready=adminConfigured();const session=ready?await auth():null;if(session?.user)redirect('/dashboard');
 return <main className="clubAdmin"><section><a href="/"><img src="/202/logo.webp" alt="202 Lounge"/></a><p className="adminEyebrow">202 LOUNGE</p><h1>Admin.</h1><LoginForm ready={ready}/><a className="adminBack" href="/">← Back to website</a></section></main>;
}
