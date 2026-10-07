export const venueConfig = {
  brand: {
    name: 'NOIR',
    legalName: 'NOIR DC',
    city: 'Washington, DC',
    tagline: 'THE NIGHT IS YOURS.',
    accent: '#d5ff2f'
  },
  operations: {
    timezone: 'America/New_York',
    currency: 'USD',
    publicSite: '/',
    crmLabel: 'CRM CONNECTED',
    adsLabel: 'ADS CONNECTED',
    socialLabel: 'SOCIAL CONNECTED',
    paymentsLabel: 'PAYMENTS READY'
  },
  events: [
    {id:'evt-1009',date:'OCT 09',name:'MIDNIGHT / AFTER DARK',music:'OPEN FORMAT',ticketsSold:184,ticketRevenue:7360,tableInquiries:11},
    {id:'evt-1010',date:'OCT 10',name:'SAINT NOIR',music:'HIP-HOP',ticketsSold:263,ticketRevenue:10520,tableInquiries:19},
    {id:'evt-1011',date:'OCT 11',name:'THE SATURDAY RITUAL',music:'R&B · HIP-HOP',ticketsSold:221,ticketRevenue:8840,tableInquiries:16}
  ],
  ads: [
    {name:'SAINT NOIR — VIDEO 01',status:'ACTIVE',spend:487,leads:36,tableInquiries:11,ticketSales:24,costPerResult:13.53,trend:'+18%'},
    {name:'SATURDAY RITUAL — STORY',status:'ACTIVE',spend:318,leads:21,tableInquiries:7,ticketSales:15,costPerResult:15.14,trend:'+9%'},
    {name:'MIDNIGHT — RETARGETING',status:'REVIEW',spend:194,leads:8,tableInquiries:2,ticketSales:5,costPerResult:24.25,trend:'-12%'}
  ],
  social: [
    {day:'WED',time:'6:30 PM',channel:'INSTAGRAM',type:'REEL',event:'SAINT NOIR',status:'SCHEDULED'},
    {day:'THU',time:'12:00 PM',channel:'INSTAGRAM + FACEBOOK',type:'STORY',event:'MIDNIGHT / AFTER DARK',status:'SCHEDULED'},
    {day:'FRI',time:'3:00 PM',channel:'INSTAGRAM',type:'POST',event:'THE SATURDAY RITUAL',status:'DRAFT'}
  ],
  promoters: [
    {name:'J. Prince',code:'JPDC',guests:84,tickets:31,tables:4,revenue:9200},
    {name:'K. Luxe',code:'KLUXE',guests:63,tickets:26,tables:3,revenue:7100},
    {name:'M. Banks',code:'MBANKS',guests:47,tickets:19,tables:2,revenue:4800}
  ]
} as const;

export type VenueConfig = typeof venueConfig;
