import Home from './components/202-home';
import {upcomingOccurrences} from '../lib/202-lounge-public';

export const dynamic='force-dynamic';
export default function Page(){return <Home initialDates={upcomingOccurrences()}/>;}
