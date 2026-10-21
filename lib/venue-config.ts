export const venueConfig = {
  brand: {
    name: '202',
    legalName: '202 Lounge',
    city: 'Washington, DC',
    tagline: 'CHINATOWN AFTER DARK.',
    accent: '#d5ff2f'
  },
  subscription: {
    plan: 'COMPLETE',
    features: {
      reservations:true,
      bottleService:true,
      guestMessaging:true,
      aiBrain:true,
      events:true,
      promoters:true,
      marketing:true,
      social:true,
      revenue:true,
      hiring:true,
      pos:false
    }
  },
  operations: {
    timezone: 'America/New_York',
    currency: 'USD',
    publicSite: '/',
    crmLabel: 'GUEST DATA CONNECTED',
    adsLabel: 'ADS CONNECTED',
    socialLabel: 'SOCIAL CONNECTED',
    paymentsLabel: 'PAYMENTS READY'
  },
  events: [
    {id:'evt-tue',date:'TUE',name:'$2 TUESDAYS',music:'6 PM – 2 AM',ticketsSold:148,ticketRevenue:4260,tableInquiries:13},
    {id:'evt-wcw',date:'WED',name:'WCW WEDNESDAYS',music:'FREE DINNER · HAPPY HOUR',ticketsSold:176,ticketRevenue:5380,tableInquiries:17},
    {id:'evt-sat',date:'SAT',name:'202 SATURDAYS',music:'10 PM – 3 AM',ticketsSold:284,ticketRevenue:11420,tableInquiries:24}
  ],
  ads: [
    {name:'202 SATURDAYS — VIDEO',status:'ACTIVE',spend:487,leads:36,tableInquiries:11,ticketSales:24,costPerResult:13.53,trend:'+18%'},
    {name:'WCW — STORY',status:'ACTIVE',spend:318,leads:21,tableInquiries:7,ticketSales:15,costPerResult:15.14,trend:'+9%'},
    {name:'$2 TUESDAYS — VIDEO',status:'REVIEW',spend:194,leads:8,tableInquiries:2,ticketSales:5,costPerResult:24.25,trend:'-12%'}
  ],
  social: [
    {day:'MON',time:'6:30 PM',channel:'INSTAGRAM + FACEBOOK',type:'REEL',event:'$2 TUESDAYS',status:'SCHEDULED'},
    {day:'TUE',time:'5:00 PM',channel:'INSTAGRAM',type:'STORY',event:'WCW WEDNESDAYS',status:'SCHEDULED'},
    {day:'FRI',time:'3:00 PM',channel:'INSTAGRAM + FACEBOOK',type:'POST',event:'202 SATURDAYS',status:'DRAFT'}
  ],
  promoters: [
    {name:'J. Prince',code:'JPDC',guests:84,tickets:31,tables:4,revenue:9200},
    {name:'K. Luxe',code:'KLUXE',guests:63,tickets:26,tables:3,revenue:7100},
    {name:'M. Banks',code:'MBANKS',guests:47,tickets:19,tables:2,revenue:4800}
  ]
} as const;

export type VenueConfig = typeof venueConfig;
