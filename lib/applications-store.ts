export type ApplicationStatus='NEW'|'REVIEW'|'INTERVIEW'|'PASS';

export type Application={
 id:string;
 name:string;
 role:string;
 email:string;
 phone:string;
 availability:string;
 experience:string;
 why:string;
 status:ApplicationStatus;
 createdAt:string;
};

export const applications:Application[]=[
 {id:'APP-201',name:'Nia Brooks',role:'VIP Host',email:'nia@example.com',phone:'202-555-0112',availability:'Thursday–Saturday nights',experience:'3 years nightlife hospitality with bottle service and guest relations.',why:'Strong with high-touch guests, reservations and fast-paced service.',status:'REVIEW',createdAt:'2026-10-06T18:20:00-04:00'},
 {id:'APP-202',name:'Marcus Reed',role:'Security / Door',email:'marcus@example.com',phone:'202-555-0128',availability:'Friday–Sunday nights',experience:'4 years event security and access control.',why:'Calm under pressure and experienced with guest entry and crowd management.',status:'NEW',createdAt:'2026-10-06T19:05:00-04:00'},
 {id:'APP-203',name:'Tiana Wells',role:'Bartender',email:'tiana@example.com',phone:'202-555-0144',availability:'Open availability',experience:'5 years high-volume bartending and upscale lounge service.',why:'Fast service, strong product knowledge and repeat guest relationships.',status:'INTERVIEW',createdAt:'2026-10-05T15:45:00-04:00'}
];

export function listApplications(){return applications}

export function addApplication(input:Omit<Application,'id'|'status'|'createdAt'>){
 const application:Application={
  ...input,
  id:'APP-'+(200+applications.length+1),
  status:'NEW',
  createdAt:new Date().toISOString()
 };
 applications.unshift(application);
 return application;
}
