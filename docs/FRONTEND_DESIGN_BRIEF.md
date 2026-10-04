# Frontend Design Brief — BFP Venue Intelligence

## Non-negotiable objective
The frontend must look 100% intentionally human-designed by a high-end hospitality/nightlife digital studio. It must NOT look like an AI-generated website, a SaaS dashboard template, a generic Tailwind starter, or a collection of trendy components.

The product should feel current for 2026–2027 and make a venue owner feel they are seeing the next generation of nightclub/lounge/restaurant web experience.

## Reference direction
Use the *quality and experiential principles* seen in premium nightlife sites such as Sway Nightclub and the LIV event/table-reservation experience as reference points only. Do not copy their layout, assets, copy, brand identity, or proprietary design.

What to learn from the references:
- editorial confidence
- nightlife photography/video as the emotional centerpiece
- event-first discovery
- table/cabana categories that are immediately understandable
- capacity + minimum spend visible before booking
- a premium booking modal rather than a clunky multi-page form
- optional visual/3D venue exploration
- fast paths to tickets and table reservations

## Human-design rules
1. Composition must be art-directed, not generated from a repeated section formula.
2. Avoid perfect symmetry across the entire site. Use controlled asymmetry, crop choices, overlaps and varied rhythm where appropriate.
3. Do not use the common AI-site formula: giant centered gradient headline -> three equal cards -> icon grid -> generic testimonials -> CTA strip.
4. No generic neon-purple/blue AI gradients. Color comes from the venue brand, photography, lighting and carefully selected accents.
5. No excessive glassmorphism, glowing borders, floating pills, generic icon cards or decorative effects without purpose.
6. Do not fill space just because a component library offers a component. Every element needs a reason.
7. Use strong typography hierarchy with editorial scale changes. Headlines should feel art-directed, not auto-sized.
8. Use authentic nightlife imagery/video and venue-specific media. Demo media must feel believable and cohesive, never like random stock-photo tiles.
9. Buttons and controls should be restrained and consistent. The reservation CTA may receive the strongest accent treatment.
10. Microcopy should be concise. Nightlife customers should understand the action without reading paragraphs.
11. Desktop can be cinematic; mobile must remain extremely fast and reservation-first.
12. Motion should reveal hierarchy and atmosphere, not advertise that the site has animations. No animation may delay booking or degrade scrolling.
13. Respect reduced-motion preferences.
14. Performance is part of the visual design: optimized media, responsive images, lazy loading below the fold and minimal client-side animation overhead.

## Guest frontend concept

### Opening / hero
Cinematic venue/event media, deliberately composed typography and a small number of high-value actions. The experience should immediately communicate the venue's personality rather than explain software.

Primary actions can resolve from venue configuration:
- View Events
- Reserve a Table
- Guest List
- Dining Reservations

AI should NOT dominate the hero with a generic chatbot bubble.

### Upcoming events
Upcoming events should feel like an experience, not a CMS card grid. Event artwork/artist photography, date, event type and clear ticket/table actions. Layout may vary between featured and secondary events so it feels editorial rather than templated.

### Event experience page
For an event, show the event identity alongside the purchasing/reservation experience. Core actions:
- Get Tickets / Buy Now
- Explore Tables / View Venue
- Table categories with capacity and minimum spend
- Book Now

### Table reservation modal
Clicking Book Now opens a premium reservation layer without losing the event context. It includes:
- table/section name
- capacity
- description
- minimum spend
- deposit and fee breakdown where applicable
- guest-count control
- availability/status
- visual location / View on Map
- Continue to Checkout
- Ask VIP Concierge

The AI option is contextual. It already knows the event, date, selected section/table, pricing and current availability.

### AI VIP Concierge
AI is an expert host embedded into the reservation experience, not a novelty chat widget. It should be able to handle natural requests such as:
"It's my wife's birthday, there are 12 of us, I want to be close to the DJ and stay under $3,000."

The concierge asks only missing questions, recommends valid options from live structured data, can explain the tradeoffs, gather guest names and bottle preferences, and move the customer back into a deterministic reservation/checkout flow.

Provide both paths at all times:
- customer who knows what they want -> fast booking UI
- customer who needs help -> AI concierge

### Venue exploration
Create an adapter-driven venue-tour module. Baseline is an original interactive floor plan with selectable sections/tables. Premium venues may connect a 3D/digital-twin provider such as Matterport. The reservation experience must not depend on Matterport being present.

## Reveal principle
The guest frontend must be beautiful enough to sell on its own. The prospect should initially believe they are seeing an exceptional modern venue website. Only afterward do we reveal that the customer experience is feeding the Venue Command operating brain.

## Reusability without template appearance
The platform is reusable, but each deployed venue must NOT visibly look like the same template with a different logo.

Achieve this through configuration for:
- typography pairing
- spacing/density mode
- navigation treatment
- hero composition
- event presentation variant
- media crop/art direction
- accent strategy
- section order
- enabled modules
- floor-plan treatment
- motion intensity

Reuse the underlying components and data contracts while allowing meaningful art direction per venue.

## Demo frontend acceptance criteria
- At first glance it feels like a premium nightlife brand, not software.
- No obvious AI-generated design tropes.
- Event discovery and table reservation are immediately understandable.
- A visitor can book without speaking to AI.
- AI can join at the point where human VIP-host assistance would naturally help.
- The same structured reservation is visible later in Venue Command.
- Responsive mobile experience feels intentionally designed rather than a collapsed desktop layout.
- Visual effects never materially hurt Core Web Vitals or booking usability.
