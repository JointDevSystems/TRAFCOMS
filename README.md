# TRAFCOMS

Unified operating record for empty container logistics in Mombasa, regulated by the Kenya Maritime Authority.
Standalone for now: no backend, no Supabase, no depot integrations. Data lives in the browser (localStorage) and starts from realistic demo data.

## Run
ES modules need a web server:

    npx serve .        # or: python3 -m http.server 8080
    npm test

## Roles
Kenya Maritime Authority (full visibility), shipping line (own containers), transporter and clearing agent (space and bookings), depot operator (own yard). Sign-in is a demo role picker until real authentication is added.

## Platform rules built in
- Bookings run Submitted, Accepted by depot, Documents under review, Confirmed in storage.
- Required documents follow the service type; the interchange receipt is issued on confirmation.
- Confirming needs every document verified and a zone with room; occupancy above 85% of approved TEU raises regulator alerts.
- Heavy-damage containers need a joint survey (depot schedules, shipping line acknowledges).
- Escalations carry a desk, SLA and priority by category. Every action is written to the audit log.
- Container numbers are validated with the ISO 6346 check digit.

## Styling
The stylesheets `styles.css`, `royal.css`, `glass.css`, `cameras.css` and `nav-shell.css` are the portal's own files, unchanged. `app.css` holds the few TRAFCOMS-only additions. Markup uses the portal's classes (panel, kpi-card, data-table, sbadge, action-btn, modal-box). Light is the default theme, dark is one click away.

## Structure
    js/config.js    roles, depots, lines, desks, document rules, navigation
    js/store.js     state, demo data, role-scoped selectors, alerts, audit
    js/actions.js   validated operations (bookings, documents, surveys, escalations)
    js/ui.js        toast, overlays, tables, bars
    js/views/       shared.js (all roles), kma.js (regulator), portal.js (line, depot, agents)
    js/app.js       shell, sign-in, drawer, events
    tests/          node tests for the rules above

## Connecting later
Reads happen in `load()` and writes in `save()` inside `js/store.js`. Depot and partner feeds can write into the same arrays (containers, bookings, documents) through `js/actions.js`.
