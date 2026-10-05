export type ReservationStatus='available'|'held'|'reserved';
export type DemoReservation={id:string;kind:'table'|'ticket';event:string;tableId?:string;guestName:string;phone?:string;email?:string;partySize:number;occasion?:string;bottles?:string[];arrival?:string;specialRequests?:string;status:'lead'|'hold'|'confirmed';createdAt:string};

export const venue={name:'NOIR DC',timezone:'America/New_York',currency:'USD'};
export const tables=[
{id:'A1',name:'DJ Gallery',capacity:8,minimum:2500,status:'available' as ReservationStatus,zone:'DJ',vibe:'closest to the DJ, high energy, prime room visibility'},
{id:'A2',name:'DJ Gallery',capacity:8,minimum:2500,status:'held' as ReservationStatus,zone:'DJ',vibe:'closest to the DJ, high energy, prime room visibility'},
{id:'B1',name:'Noir Booth',capacity:10,minimum:1800,status:'available' as ReservationStatus,zone:'VIP',vibe:'elevated VIP view of the main floor'},
{id:'B2',name:'Noir Booth',capacity:10,minimum:1800,status:'available' as ReservationStatus,zone:'VIP',vibe:'elevated VIP view of the main floor'},
{id:'C1',name:'Salon',capacity:6,minimum:1200,status:'reserved' as ReservationStatus,zone:'Lounge',vibe:'intimate lounge seating near the bar'},
{id:'C2',name:'Salon',capacity:6,minimum:1200,status:'available' as ReservationStatus,zone:'Lounge',vibe:'intimate lounge seating near the bar'}];
export const bottles=[
{category:'Tequila',items:[{name:'Don Julio 1942',price:850},{name:'Don Julio Blanco',price:475},{name:'Casamigos Reposado',price:525}]},
{category:'Champagne',items:[{name:'Moët & Chandon',price:425},{name:'Veuve Clicquot',price:475},{name:'Ace of Spades',price:1200}]},
{category:'Cognac',items:[{name:'Hennessy VS',price:475},{name:'Hennessy VSOP',price:650}]},
{category:'Vodka',items:[{name:'Cîroc',price:475},{name:'Grey Goose',price:475}]}];
export const demoReservations:DemoReservation[]=[
{id:'R-1048',kind:'table',event:'SAINT NOIR',tableId:'C1',guestName:'A. Carter',partySize:6,occasion:'Birthday',bottles:['Don Julio 1942'],arrival:'11:00 PM',status:'confirmed',createdAt:'2026-10-03T20:15:00-04:00'},
{id:'R-1049',kind:'table',event:'SAINT NOIR',tableId:'A2',guestName:'M. Johnson',partySize:8,occasion:'Night Out',status:'hold',createdAt:'2026-10-04T18:10:00-04:00'}];
export function dashboard(){const confirmed=demoReservations.filter(r=>r.status==='confirmed').length;const holds=demoReservations.filter(r=>r.status==='hold').length;return{venue,stats:{reservations:confirmed,holds,availableTables:tables.filter(t=>t.status==='available').length,projectedTableRevenue:demoReservations.reduce((sum,r)=>sum+(tables.find(t=>t.id===r.tableId)?.minimum||0),0)},tables,reservations:demoReservations,bottles};}
