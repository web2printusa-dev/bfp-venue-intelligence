import {NextResponse} from 'next/server';
import {addApplication,listApplications} from '../../../lib/applications-store';

export async function GET(){
 return NextResponse.json({applications:listApplications()});
}

export async function POST(req:Request){
 const body=await req.json();
 const required=['name','role','email','phone','availability','experience','why'];
 for(const key of required){
  if(!String(body?.[key]||'').trim())return NextResponse.json({ok:false,error:'Please complete every field.'},{status:400});
 }
 const application=addApplication({
  name:String(body.name).trim(),
  role:String(body.role).trim(),
  email:String(body.email).trim(),
  phone:String(body.phone).trim(),
  availability:String(body.availability).trim(),
  experience:String(body.experience).trim(),
  why:String(body.why).trim()
 });
 return NextResponse.json({ok:true,application});
}
