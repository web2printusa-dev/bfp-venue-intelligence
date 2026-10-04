# BFP Venue Intelligence — Platform Architecture

## Product principle

This repository is the master BFP-managed Venue Intelligence platform. A venue is configuration and data, not a fork of the application. The first demo is Venue #1 and must exercise the same paths a production venue will use.

## Surfaces

### Guest Experience
Premium, editorial nightlife/restaurant presentation inspired by high-end hospitality sites, without copying another venue's design. Core routes: home, events, reserve, interactive floor plan, bottle service, guest list, private events, and AI Concierge.

### Venue Command
Operator dashboard for tonight's operations, reservations, tables, guests, bottles, deposits, committed spend, promoters, customer history, and integration health.

### Ask Your Venue
Natural-language management interface over authorized venue data. Example questions: committed revenue tonight, unpaid deposits, bottle demand, top customers, promoter performance, reservation changes, and comparisons across nights.

## Multi-venue model

Every business record is scoped by `venueId`. Branding, navigation, modules, floor plan, policies, integrations and AI behavior are resolved from venue configuration. Secrets are never stored in venue configuration or committed to Git.

A venue configuration controls:
- identity, logo and domain
- typography, colors and media
- venue type: nightclub, lounge, restaurant or hybrid
- enabled modules
- sections and floor plan
- tables, capacity, minimums and status
- bottle/menu catalog
- reservation questions and policies
- AI concierge tone and allowed actions
- integration adapter selection

## Core entities

- Venue
- VenueConfig
- Event
- Section
- Table
- Reservation
- Guest
- Customer
- BottleItem / MenuItem
- ReservationItem
- Deposit / Payment
- Promoter
- StaffMember
- POSCheck / POSLineItem
- Conversation
- AIAction
- IntegrationConnection
- AuditEvent

## Reservation lifecycle

`available -> held -> pending_deposit -> reserved -> checked_in -> seated -> closed`

Cancellation/no-show states are recorded separately so history is preserved.

The AI Concierge writes through reservation services rather than directly manipulating UI state. Venue Command reads the same source of truth. This is what makes the demo flow real: guest conversation -> structured reservation -> floor-plan update -> dashboard update -> management AI can query it.

## Integration adapters

The core application must not depend directly on one vendor. Define interfaces for:

- CRM: GoHighLevel first
- POS: provider-specific adapters later
- Reservations: provider-specific adapters later
- Payments: payment provider adapter
- Messaging: SMS/email adapter, with GHL available for production automation
- AI: server-side OpenAI adapter

Demo adapters implement the same interfaces using seeded data. Production adapters can replace them without rewriting pages or business logic.

## Deployment model

Default BFP-managed deployment: BFP controls source, deployment and platform updates; each venue owns its domain, branding and business/customer data. A dedicated deployment or licensed client implementation can be produced when contractually required without exposing unrelated venue data or BFP secrets.

## Security rules

- Never expose OpenAI, CRM, POS, reservation or payment credentials to the browser.
- Never commit credentials to Git.
- Scope every query and mutation to the authenticated venue.
- Require explicit permissions for management AI actions that communicate with customers, change reservations, issue refunds or trigger payments.
- Log consequential AI actions to `AuditEvent`.
- AI answers must be grounded in retrieved venue data; it must not invent operational facts.

## Demo acceptance loop

1. Guest opens a premium venue site.
2. Guest asks AI Concierge for a birthday table for eight near the DJ.
3. Concierge asks only missing qualifying questions.
4. Concierge presents compatible available tables and minimums.
5. Guest selects a table, provides guest names and bottle preferences, and creates a reservation.
6. The table changes state in Venue Command immediately.
7. Reservation, guests, bottles, occasion and expected/committed spend appear in the dashboard.
8. Manager asks Ask Your Venue what changed, committed revenue, unpaid deposits, or who ordered a particular bottle.
9. Answers are calculated from the same structured demo data.

This loop is the first milestone before external POS/reservation integrations.