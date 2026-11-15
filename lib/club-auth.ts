import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {createHash, scryptSync, timingSafeEqual} from 'node:crypto';

export function adminConfigured(){return Boolean(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD_HASH&&process.env.AUTH_SECRET);}
const revision=()=>createHash('sha256').update((process.env.ADMIN_EMAIL||'')+':'+(process.env.ADMIN_PASSWORD_HASH||'')).digest('hex');
const attempts=new Map<string,{count:number;until:number}>();
export const {handlers,auth,signIn,signOut}=NextAuth({
  trustHost:true,
  secret:process.env.AUTH_SECRET,
  session:{strategy:'jwt',maxAge:8*60*60},
  pages:{signIn:'/admin',error:'/admin'},
  providers:[Credentials({
    credentials:{email:{label:'Email',type:'email'},password:{label:'Password',type:'password'}},
    async authorize(credentials){
      if(!adminConfigured())return null;
      const email=typeof credentials.email==='string'?credentials.email.trim().toLowerCase():'';
      const password=typeof credentials.password==='string'?credentials.password:'';
      if(password.length>256||email.length>254)return null;
      const now=Date.now(), bucket=attempts.get(email);
      if(bucket&&bucket.until>now&&bucket.count>=5)return null;
      if(attempts.size>1000)attempts.clear();
      attempts.set(email,{count:bucket&&bucket.until>now?bucket.count+1:1,until:bucket&&bucket.until>now?bucket.until:now+15*60*1000});
      const [salt,keyHex]=process.env.ADMIN_PASSWORD_HASH!.split(':');
      if(!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(keyHex||''))return null;
      const candidate=scryptSync(password,salt,64);
      const matches=timingSafeEqual(candidate,Buffer.from(keyHex,'hex'));
      if(!matches||email!==process.env.ADMIN_EMAIL!.trim().toLowerCase())return null;
      attempts.delete(email);
      return {id:'202-admin',name:'202 Lounge',email};
    }
  })],
  callbacks:{
    jwt({token,user}){if(user)token.credentialRevision=revision();return token;},
    session({session,token}){
      if(token.credentialRevision!==revision()||!adminConfigured())session.user=undefined as never;
      return session;
    }
  }
});
