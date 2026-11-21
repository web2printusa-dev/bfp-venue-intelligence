'use server';

import {revalidatePath} from 'next/cache';
import {auth,adminConfigured} from '../../lib/club-auth';
import {updateClubApplication} from '../../lib/202-prosper';
import {hiringStatuses,type HiringStatus} from '../../lib/hiring';

export async function saveHiringUpdate(contactId:string,reference:string,_state:string,form:FormData){
 if(!adminConfigured()||!(await auth())?.user)return 'Sign in again to update this application.';
 const status=form.get('status') as HiringStatus;
 const note=form.get('note');
 if(!hiringStatuses.includes(status)||typeof note!=='string'||note.length>2000)return 'Choose a status and keep the note under 2,000 characters.';
 try {await updateClubApplication(contactId,reference,status,note.trim());}
 catch {return 'Could not save the update in Prosper. Please try again.';}
 revalidatePath('/dashboard');
 return 'Saved in Prosper.';
}
