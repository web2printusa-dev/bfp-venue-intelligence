# Demo Build Plan

## Phase 1 — Foundation
- Next.js App Router + TypeScript
- responsive design tokens and venue theme resolver
- venue config schema
- demo data layer with strict venue scoping
- guest and command-center shells
- integration adapter contracts

## Phase 2 — Guest experience
- cinematic/editorial home experience
- events
- interactive floor plan
- table detail/availability
- AI Concierge reservation conversation
- bottle selection and guest details
- reservation confirmation

## Phase 3 — Venue Command
- tonight overview
- live floor-plan state
- reservations and customer profiles
- deposits, bottle orders and committed spend
- promoter attribution
- Ask Your Venue panel

## Phase 4 — Real integration readiness
- GoHighLevel CRM/messaging adapter
- OpenAI server adapter
- payment adapter
- POS adapter contract + mock POS feed
- reservation-provider adapter contract
- webhook/event ingestion layer

## Phase 5 — Productization
- BFP admin: Add Venue
- branding/media configuration
- floor-plan/table configuration
- module toggles
- integration setup
- domain/deployment workflow

## Design guardrails
- Luxury hospitality/nightlife, not SaaS-template aesthetics.
- Human-designed editorial composition; intentional asymmetry and whitespace.
- Photography/video carries emotion; UI remains restrained.
- No generic AI gradients, floating glass-card overload, icon walls, or unnecessary effects.
- Motion must be purposeful, GPU-friendly, reduced-motion aware, and must not block interaction.
- Mobile-first reservation experience.
- Sway Nightclub is a quality/reference point only; do not copy its assets, copy, layout or proprietary identity.

## First sales-demo story
The salesperson demonstrates the guest experience first, creates a reservation through AI Concierge, then reveals Venue Command and asks the management brain questions about the reservation that was just created. The transition from luxury website to operational intelligence is the primary reveal.