import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {createHash, pbkdf2Sync, timingSafeEqual} from 'node:crypto';

export function adminConfigured(){return Boolean(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD_HASH&&process.env.AUTH_SECRET);}
const revision=()=>createHash('sha256').update((process.env.ADMIN_EMAIL||'')+':'+(process.env.ADMIN_PASSWORD_HASH||'')).digest('hex');
const ownerRevision=()=>createHash('sha256').update('202-owner:'+process.env.ADMIN_OWNER_PASSWORD_HASH?.trim()).digest('hex');
function matchesPassword(password:string, hash:string){
  if(!/^[a-f0-9]{32}:[a-f0-9]{64}$/i.test(hash))return false;
  const [salt,keyHex]=hash.split(':');
  return timingSafeEqual(pbkdf2Sync(password,Buffer.from(salt,'hex'),600000,32,'sha256'),Buffer.from(keyHex,'hex'));
}
const attempts=new Map<string,{count:number;until:number}>();
export const {handlers,auth,signIn,signOut}=NextAuth({
  trustHost:true,
  secret:process.env.AUTH_SECRET,
  session:{strategy:'jwt',maxAge:8*60*60},
  pages:{signIn:'/admin',error:'/admin'},
  providers:[Credentials({
    credentials:{password:{label:'Password',type:'password'}},
    async authorize(credentials){
      if(!adminConfigured())return null;
      const email=process.env.ADMIN_EMAIL!.trim().toLowerCase();
      const password=typeof credentials.password==='string'?credentials.password:'';
      if(!password||password.length>256)return null;
      const now=Date.now(), bucket=attempts.get(email);
      if(bucket&&bucket.until>now&&bucket.count>=5){
        console.warn('[club-admin] sign-in rate limited');
        return null;
      }
      if(attempts.size>1000)attempts.clear();
      attempts.set(email,{count:bucket&&bucket.until>now?bucket.count+1:1,until:bucket&&bucket.until>now?bucket.until:now+15*60*1000});
      const mainMatches=matchesPassword(password,process.env.ADMIN_PASSWORD_HASH!.trim());
      const ownerHash=process.env.ADMIN_OWNER_PASSWORD_HASH?.trim();
      const ownerMatches=ownerHash?matchesPassword(password,ownerHash):false;
      if(!mainMatches&&!ownerMatches){
        console.warn('[club-admin] password mismatch');
        return null;
      }
      attempts.delete(email);
      return mainMatches?{id:'202-admin',name:'202 Lounge',email}:{id:'202-owner',name:'202 Lounge Owner'};

    }
  })],
  callbacks:{
    jwt({token,user}){if(user)token.credentialRevision=user.id==='202-owner'?ownerRevision():revision();return token;},
    session({session,token}){
      if(!adminConfigured()||(token.sub==='202-owner'?(!process.env.ADMIN_OWNER_PASSWORD_HASH||token.credentialRevision!==ownerRevision()):token.credentialRevision!==revision()))session.user=undefined as never;
      return session;
    }
  }
});
