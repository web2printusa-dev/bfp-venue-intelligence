// 202 Lounge content from the flyers supplied on October 21, 2026.
// Club-specific content: the demo's policies and prices are not changed.
export type ClubEvent = { id:string; artist:string; day:string; dayIndex:number; month:string; image:string; note:string; admission:string; time:string; rsvp:string|null; fixedDate?:string; details:string[] };
export const events:ClubEvent[] = [
 {id:'tuesday',artist:'$2 TUESDAYS',day:'TUE',dayIndex:2,month:'WEEKLY',image:'/202/tuesdays-main.webp',note:'GAME NIGHT · R&B · TACOS & TEQUILA',admission:'RSVP through Eventbrite; admission terms are confirmed by the organizer',time:'Doors 6 PM–2 AM · happy hour 6–11 PM',rsvp:'https://2tuesdays202.eventbrite.com',details:['Game night and R&B happy hour: Jenga, Monopoly, Connect 4 and checkers.','Happy hour 6–11 PM: $2 Luna shots, $2 tacos and $35 hookah.','Doors open 6 PM–2 AM.','Main flyer advertises $250 all-in premium bottles; confirm eligible bottles and inclusions with the host.','Separate birthday offer: $250 for a premium bottle, champagne and birthday flyer; birthday flyer shows 9 PM–3 AM.']},
 {id:'wcw',artist:'WOMEN CRUSH WEDNESDAYS',day:'WED',dayIndex:3,month:'WEEKLY',image:'/202/wcw.webp',note:'FREE DINNER 8–11 PM WITH DRINK PURCHASE',admission:'Everyone free with RSVP',time:'Dinner: 8–11 PM',rsvp:'https://womencrushwed202.eventbrite.com',details:['Free dinner from 8–11 PM with purchase of a drink.','Everyone free with RSVP.','Text CRUSH to 545454 for RSVP.']},
 {id:'thursday',artist:'KARAOKE THURSDAYS',day:'THU',dayIndex:4,month:'WEEKLY',image:'/202/karaoke-thursdays.webp',note:'KARAOKE · WINGS & SHOT SPECIALS',admission:'RSVP through Eventbrite; admission terms are confirmed by the organizer',time:'Contact the host for Thursday hours',rsvp:'https://karaokethursdays202.eventbrite.com',details:['20 wings + 4 shots and fries: $50.','50 wings + 10 shots and fries: $100.','10 wings + 4 shots of Luna: $35.','Call 202-520-9070 for table RSVP.','The flyer does not state opening hours or an admission price.']},
 {id:'friday',artist:'VIRAL MOTION FRIDAYS',day:'FRI',dayIndex:5,month:'WEEKLY',image:'/202/motion-fridays.webp',note:'FREE BEFORE MIDNIGHT WITH RSVP',admission:'Everyone free before midnight with RSVP',time:'Doors open 8 PM',rsvp:'https://motionfriday.eventbrite.com',details:['Doors open at 8 PM.','Everyone free before midnight with RSVP.','Dress code enforced.']},
 {id:'saturday',artist:'202 SATURDAYS',day:'SAT',dayIndex:6,month:'WEEKLY',image:'/202/saturdays-main.webp',note:'SATURDAY NIGHT AT 202 · DOORS 8 PM',admission:'Admission included for 4, 6 or 8 with the published package',time:'Doors open 8 PM',rsvp:null,details:['Weekly Saturday flyer: doors open at 8 PM.','Table packages: $400 / $750 / $1,000.','Package admission covers 4 / 6 / 8 guests respectively.','For standalone admission, contact the host.']},
 {id:'trektober',artist:'TREKTOBER · 202 SATURDAYS',day:'SAT',dayIndex:6,month:'OCT 24',fixedDate:'2026-10-24',image:'/202/trektober-oct24.webp',note:'SPECIAL EVENT · OCTOBER 24',admission:'Contact the host for event admission',time:'Doors open 8 PM · 21+ with proper ID',rsvp:null,details:['Saturday, October 24, 2026.','Doors open at 8 PM.','21+ · Proper ID required.','The flyer does not list an admission price. Table packages and availability are confirmed by the host for this special event.']},
];
export type Occurrence={key:string;date:string;label:string;event:ClubEvent};
export function upcomingOccurrences(now=new Date()):Occurrence[]{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(type:string)=>parts.find(p=>p.type===type)!.value;
 const first=new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00Z`);
 const result:Occurrence[]=[];
 for(let i=0;i<35;i++){
  const date=new Date(first);date.setUTCDate(first.getUTCDate()+i);const iso=date.toISOString().slice(0,10);
  const special=events.find(e=>e.fixedDate===iso);
  const event=special||events.find(e=>!e.fixedDate&&e.dayIndex===date.getUTCDay());
  if(event)result.push({key:`${event.id}-${iso}`,date:iso,event,label:date.toLocaleDateString('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'})});
 }
 return result;
}
export type ClubPackage={id:string;name:string;price:number|null;bottles:number|null;guests:number|null;description:string};
export const weekendPackages:ClubPackage[]=[
 {id:'weekend-1',name:'1 premium bottle',price:400,bottles:1,guests:4,description:'Admission for 4 · Friday & Saturday package'},
 {id:'weekend-2',name:'2 premium bottles',price:750,bottles:2,guests:6,description:'Admission for 6 · Friday & Saturday package'},
 {id:'weekend-3',name:'3 premium bottles',price:1000,bottles:3,guests:8,description:'Admission for 8 · Friday & Saturday package'},
];
export const auraPackages:ClubPackage[]=[
 {id:'aura-1',name:'Aura · 1 premium bottle',price:300,bottles:1,guests:4,description:'Second floor · admission for 4'},
 {id:'aura-2',name:'Aura · 2 premium bottles',price:550,bottles:2,guests:6,description:'Second floor · admission for 6'},
 {id:'aura-3',name:'Aura · 3 premium bottles',price:900,bottles:3,guests:8,description:'Second floor · admission for 8'},
];
export const birthdayPackage:ClubPackage={id:'tuesday-birthday',name:'Tuesday birthday package',price:250,bottles:1,guests:null,description:'Premium bottle + champagne + birthday flyer · guest allowance confirmed by host'};
export const customPackage:ClubPackage={id:'custom',name:'Custom table request',price:null,bottles:null,guests:null,description:'Ask the host for the package and admission for your date'};
export function packagesFor(event:ClubEvent,floor:number):ClubPackage[]{
 if(event.id==='tuesday')return [birthdayPackage,customPackage];
 if(['friday','saturday','trektober'].includes(event.id))return [...(floor===2?auraPackages:weekendPackages),customPackage];
 return [customPackage];
}
export const bottles=[
 {name:'Clase Azul',category:'Tequila',price:700},{name:'Casamigos Blanco',category:'Tequila',price:300},{name:'Don Julio Blanco',category:'Tequila',price:300},{name:'Patrón Silver',category:'Tequila',price:300},{name:'Casamigos Reposado',category:'Tequila',price:350},{name:'Don Julio Reposado',category:'Tequila',price:350},{name:'Don Julio 1942',category:'Tequila',price:800},
 {name:'Bulleit',category:'Whiskey',price:300},{name:'Crown Royal',category:'Whiskey',price:300},{name:'Jameson',category:'Whiskey',price:275},{name:'Jack Daniels',category:'Whiskey',price:275},
 {name:"D’Ussé",category:'Cognac',price:350},{name:'Hennessy VS',category:'Cognac',price:300},{name:'Hennessy VSOP Privilège',category:'Cognac',price:450},
 {name:"Tito’s",category:'Vodka',price:300},{name:'Ketel One',category:'Vodka',price:300},{name:'Grey Goose',category:'Vodka',price:275},{name:'Captain Morgan',category:'Rum',price:275},
 {name:'Ace of Spades',category:'Champagne',price:900},{name:'Belaire',category:'Champagne',price:150},{name:'Dom Pérignon',category:'Champagne',price:500},{name:'Moët Rosé',category:'Champagne',price:275},
];
export type ClubTable={id:string;number:number;floor:number;x:number;y:number;width:number;height:number};
const make=(floor:number,n:number,x:number,y:number,width=9,height=7):ClubTable=>({id:`F${floor}-${n}`,number:n,floor,x,y,width,height});
export const tables:ClubTable[]=[
 make(1,1,5,70),make(1,2,5,61),make(1,3,20,50,12,7),make(1,4,5,43),make(1,5,5,33),make(1,6,5,22),make(1,7,20,18,12,7),make(1,8,95,26),make(1,9,95,37),make(1,10,95,55),make(1,11,95,65),
 make(2,1,10,78,13,13),make(2,2,10,63,13,13),make(2,3,29,51,23,7),make(2,4,14,39,19,6),make(2,5,8,25),make(2,6,8,16),make(2,7,29,16,14,7),make(2,8,48,16,14,7),make(2,9,68,16,14,7),make(2,10,88,25,7,13),
];
export const contact={phone:'202-520-9070',sms:'2025209070',secondary:'301-455-9579'};
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
