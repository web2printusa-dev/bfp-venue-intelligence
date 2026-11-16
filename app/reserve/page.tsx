import Home from '../components/202-home';
import {upcomingOccurrences,events} from '../../lib/202-lounge-public';

export const dynamic='force-dynamic';
export const metadata={title:'Tables & Bottle Service | 202 Lounge'};
export default async function ReservePage({searchParams}:{searchParams:Promise<{night?:string|string[]}>}){
 const query=await searchParams;
 const night=typeof query.night==='string'&&events.some(e=>e.id===query.night)?query.night:undefined;
 return <Home key={night||'choose-event'} initialDates={upcomingOccurrences()} bookingOnly initialNightId={night}/>;
}
