import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({integrations:[
{name:'GoHighLevel',key:'ghl',status:process.env.GHL_API_KEY?'configured':'demo',capabilities:['contacts','opportunities','workflows','SMS/email confirmations','VIP host notifications']},
{name:'Stripe',key:'stripe',status:process.env.STRIPE_SECRET_KEY?'configured':'demo',capabilities:['ticket checkout','table deposits','payment links']},
{name:'Venue Reservation Platform',key:'reservations',status:process.env.VENUE_RESERVATION_API_URL?'configured':'adapter-ready',capabilities:['live table inventory','holds','reservations','floor plan sync']},
{name:'POS / Register',key:'pos',status:process.env.POS_API_URL?'configured':'adapter-ready',capabilities:['bar sales','tabs','bottle sales','revenue intelligence']},
{name:'Toast',key:'toast',status:process.env.TOAST_CLIENT_ID&&(process.env.TOAST_CLIENT_SECRET||process.env.TOAST_API_KEY)?'credentials-present-unverified':'credentials-missing',capabilities:['server-side authentication','API scope verification','table configuration reads'],checkoutEnabled:false},
{name:'OpenAI',key:'openai',status:process.env.OPENAI_API_KEY?'configured':'demo-fallback',capabilities:['VIP concierge','venue Q&A','recommendations','management summaries']}
]})}
