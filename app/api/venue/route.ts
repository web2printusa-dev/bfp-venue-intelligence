import {NextResponse} from 'next/server';
import {dashboard,tables,bottles,demoReservations} from '@/lib/demo-store';
export async function GET(){return NextResponse.json(dashboard())}
export async function POST(req:Request){const body=await req.json();const action=body?.action;
 if(action==='availability'){const party=Number(body.partySize||2);const budget=Number(body.budget||999999);return NextResponse.json({tables:tables.filter(t=>t.status==='available'&&t.capacity>=party&&t.minimum<=budget)});}
 if(action==='reservation'){const table=tables.find(t=>t.id===body.tableId);if(!table||table.status!=='available')return NextResponse.json({error:'Table is not currently available in this demo.'},{status:409});const id=`R-${1050+demoReservations.length}`;const reservation={id,kind:'table' as const,event:String(body.event||'SAINT NOIR'),tableId:table.id,guestName:String(body.guestName||'VIP Guest'),phone:body.phone,email:body.email,partySize:Number(body.partySize||2),occasion:body.occasion,bottles:Array.isArray(body.bottles)?body.bottles:[],arrival:body.arrival,specialRequests:body.specialRequests,status:'hold' as const,createdAt:new Date().toISOString()};demoReservations.push(reservation);table.status='held';return NextResponse.json({reservation,nextActions:['Collect deposit/payment','Create or update CRM contact','Notify VIP host','Send confirmation and reminders']},{status:201});}
 if(action==='bottles')return NextResponse.json({bottles});
 return NextResponse.json({error:'Unknown action'},{status:400});}
