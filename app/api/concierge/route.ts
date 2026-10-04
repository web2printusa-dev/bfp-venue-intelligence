import { NextResponse } from 'next/server';

const TABLES = [
  { name: 'DJ Gallery', guests: 8, minimum: 2500, vibe: 'closest to the DJ and highest energy' },
  { name: 'Noir Booth', guests: 10, minimum: 1800, vibe: 'elevated VIP view of the main floor' },
  { name: 'Salon', guests: 6, minimum: 1200, vibe: 'intimate lounge seating near the bar' },
];

function localReply(message: string) {
  const m = message.toLowerCase();
  const guestMatch = m.match(/(\d+)\s*(people|guests|of us)/);
  const guests = guestMatch ? Number(guestMatch[1]) : null;
  const budgetMatch = m.match(/\$?([1-9]\d{2,4})/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const birthday = m.includes('birthday');
  const dj = m.includes('dj') || m.includes('booth') || m.includes('close');
  const matches = TABLES.filter(t => (!guests || t.guests >= guests) && (!budget || t.minimum <= budget));
  if (matches.length) {
    const best = dj ? matches.find(t => t.name === 'DJ Gallery') || matches[0] : matches[0];
    return `${birthday ? 'Happy birthday — ' : ''}${best.name} looks like the best fit. It accommodates up to ${best.guests} guests with a $${best.minimum.toLocaleString()} minimum and is ${best.vibe}. What date are you planning for, and would you like to add bottles now?`;
  }
  if (!guests) return 'Absolutely. How many guests will be in your party?';
  return 'I can help find the closest fit. What is your target table budget, and do you prefer to be near the DJ, on the main floor, or somewhere more private?';
}

export async function POST(request: Request) {
  const body = await request.json();
  const message = String(body?.message || '').trim();
  if (!message) return NextResponse.json({ reply: 'Tell me what kind of night you are planning.' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ reply: localReply(message), mode: 'demo' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        instructions: `You are NOIR VIP Concierge for a fictional premium Washington, DC nightlife venue. Be concise, warm, polished, and useful. Never invent availability. Demo table inventory: ${JSON.stringify(TABLES)}. Ask only missing questions needed for a table reservation: date, guest count, occasion, preferred area, budget, guest names when appropriate, bottle preferences, contact info, and deposit readiness. Recommend only options compatible with the provided inventory.`,
        input: message,
      }),
    });
    if (!response.ok) throw new Error('OpenAI request failed');
    const data = await response.json();
    return NextResponse.json({ reply: data.output_text || localReply(message), mode: 'ai' });
  } catch {
    return NextResponse.json({ reply: localReply(message), mode: 'demo' });
  }
}
