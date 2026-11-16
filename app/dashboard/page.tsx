import {redirect} from 'next/navigation';
import {auth,adminConfigured,signOut} from '../../lib/club-auth';
import DashboardClient from './dashboard-client';
export const dynamic='force-dynamic';
export const metadata={title:'Admin | 202 Lounge',robots:{index:false,follow:false}};
export default async function Dashboard(){
 if(!adminConfigured())redirect('/admin');
 const session=await auth();if(!session?.user)redirect('/admin');
 return <><form action={async()=>{'use server';await signOut({redirectTo:'/admin'});}} style={{position:'fixed',bottom:16,right:16,zIndex:100}}><button style={{background:'#c4f432',color:'#111',padding:'12px 20px',borderRadius:8,border:0,fontWeight:700}}>Sign out</button></form><DashboardClient/></>;
}
