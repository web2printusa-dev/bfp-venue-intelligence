import {NextResponse} from 'next/server';

const ACTIONS:Record<string,{title:string,result:string,detail:string,metric?:{label:string;value:string}}>={
 send_vip_sms:{title:'VIP REACTIVATION SENT',result:'42 VIP contacts processed',detail:'High-value guests without a current weekend reservation were selected and a Saturday availability message was prepared through the messaging layer.',metric:{label:'CONTACTS',value:'42'}},
 email_birthdays:{title:'BIRTHDAY CAMPAIGN SENT',result:'18 birthday guests processed',detail:'Upcoming birthday guests were selected and routed into the birthday table-service follow-up sequence.',metric:{label:'GUESTS',value:'18'}},
 notify_promoters:{title:'PROMOTERS NOTIFIED',result:'3 promoter teams processed',detail:'Saturday inventory and ticket priorities were packaged into the promoter update workflow.',metric:{label:'PROMOTERS',value:'3'}},
 queue_social:{title:'SOCIAL POST QUEUED',result:'Content added to publishing queue',detail:'The selected event post was placed into the social publishing workflow with its event attribution intact.'},
 caption:{title:'CAPTION CREATED',result:'Event caption ready for review',detail:'The brain generated event-focused social copy designed to drive ticket and table intent.'},
 revenue_push:{title:'REVENUE PLAY CREATED',result:'Saturday recovery plan assembled',detail:'Open tables, VIP reactivation, promoter activation and the weaker campaign were combined into one prioritized action plan.'},
 host_followup:{title:'HOST FOLLOW-UP CREATED',result:'Unconfirmed table lead routed',detail:'The reservation was prepared for host follow-up with guest context, table status and next action.'}
};

export async function POST(req:Request){
 const body=await req.json();
 const id=String(body?.action||'');
 const item=ACTIONS[id];
 if(!item)return NextResponse.json({ok:false,error:'Unknown action'},{status:400});
 return NextResponse.json({ok:true,...item,executedAt:new Date().toISOString()});
}
