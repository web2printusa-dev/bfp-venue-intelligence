'use client';

import {useActionState,useState} from 'react';
import {hiringStatuses} from '../../lib/hiring';
import {saveHiringUpdate} from './hiring-action';

export default function HiringUpdate({contactId,reference,status}:{contactId:string;reference:string;status:string}){
 const [note,setNote]=useState('');
 const [message,submit,pending]=useActionState(async(previous:string,form:FormData)=>{
  const result=await saveHiringUpdate(contactId,reference,previous,form);
  if(result==='Saved in Prosper.')setNote('');
  return result;
 },'');
 return <form action={submit} className="clubFilters">
  <label>Status<select name="status" defaultValue={status}>{hiringStatuses.map(value=><option key={value}>{value}</option>)}</select></label>
  <label>Private staff note<input name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={2000}/></label>
  <button disabled={pending}>{pending?'Saving…':'Save update'}</button>
  <span role="status">{message}</span>
 </form>;
}
