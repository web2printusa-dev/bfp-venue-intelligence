export const roleQuestions = {
 'VIP Host':'How have you handled guest lists, reservations, or VIP requests on a busy night?',
 'Bartender':'Describe your high-volume bar experience and the types of drinks or service you handled.',
 'Server':'How do you manage several tables and keep orders accurate during a rush?',
 'Security / Door':'Describe your door, crowd management, or de-escalation experience.',
 'Bottle Service':'Describe your bottle service experience and how you handle guest requests.',
 'Barback':'How do you keep a busy bar stocked, clean, and ready for service?',
 'Event Staff':'What event duties have you handled, such as check-in, setup, or guest support?',
} as const;
export const hiringStatuses=['New','In Review','Interview','Hired','Closed'] as const;
export type HiringStatus=typeof hiringStatuses[number];
export const applicationRef=/^application-[a-f0-9]{24}$/;
