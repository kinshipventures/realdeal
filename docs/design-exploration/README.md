# Design Exploration — March 23, 2026

Design system exploration for the Kinship Brain visual redesign, driven by the Trolley CRM PDF reference and Moj's "make everything bolder" direction.

## Journey

### 01 — Initial Proposal
`01-initial-proposal.html`

First pass: Fraunces vs Instrument Serif vs Playfair Display font comparison. Color palette. Dashboard mockup with green header band. Basic orb map. Contact panel.

**Feedback:** Orbs boring. Pod card left-border is AI slop. Orb map mockup too static. Alerts also have slop border.

### 02 — Orb + Card Explorations
`02-orb-card-explorations.html`

Four orb treatments (glow halo, health ring, 3D sphere, breathing pulse). Six card treatments (color dot, colored shadow, background tint, bottom bar, mini orb avatar, colored name). Two map layouts (organic + gradient connections, depth layers + glow halos on dark).

**Decisions:** Mini orb avatar for cards. Glow halo + health ring for orbs. Radial gradient on orb surface not the move.

### 03 — Orb Surface + Map Concepts
`03-orb-surface-map-concepts.html`

Five orb surface alternatives (flat + rim light, matte + grain, two-tone color shift, dead flat, inset depth). Four genuinely different map concepts (orbital system, constellation, radar pulse, topographic landscape).

**Decisions:** Two-tone color shift for orb surface. Orbital system for map layout with connection lines and clustered small orbs.

### 04 — Final Combined System
`04-final-system.html`

Everything locked in together: two-tone gradient orbs with tight health rings and glow halos. Orbital map with orbit rings, connection lines, and clustered category orbs. Mini orb avatar dashboard cards. Fraunces 800 headings + Plus Jakarta Sans body. Green header band. Icon-forward alerts.

### 05 — Motion + Interaction
`05-motion-interaction.html`

Interactive exploration of entrance animations, health ring fill, glow behavior, hover/press states, card interactions, panel transitions, view switching, loading states, and cursor types.

**Decisions:**
- Entrance: orbit slide variant — all orbs start stacked at hub center and fly out to positions with staggered delay (running to their spots)
- Glow: reactive on hover (smooth, quick, responsive) — same feel as lift+glow hover
- Orb hover: lift + glow with press squish
- Card hover: scale + colored shadow (each card glows its pod color)
- Panel: soft fade-slide (short travel, materializes)
- View switch: crossfade dissolve
- Loading: skeleton shimmer
- Cursor: pointer for clickable, grab/grabbing for draggable. Keep it simple.

### 06 — Dark Mode
`06-dark-mode.html`

Full token mapping (light→dark), side-by-side dashboard, orb map (glows intensify on dark), and contact panel. Four principles: glow intensification, green band darkens, hub gets a rim, follow system preference.

**Decision:** Approved as-is.

### 07 — Responsive + Mobile
`07-responsive-mobile.html`

Dashboard at phone/tablet/desktop breakpoints. Mobile orb map with tighter orbits. Contact panel becomes full-screen sheet on mobile. Bottom tab bar replaces floating pill nav. Touch target notes.

**Decision:** Approved as-is.

### 08 — Iconography
`08-iconography.html`

Two style directions (rounded line vs filled duotone). Interaction type pills with semantic colors. Timeline context mockup. Mobile nav icons (heart=Pulse, crosshair=Map). Size scale (12/16/20/28px).

**Decision:** Rounded line icons (Lucide library). Semantic colors per interaction type.

### 09 — Empty States
`09-empty-states.html`

Six zero-data mockups: empty map, empty dashboard, empty pod, empty interactions, search no results, all caught up. Uses orb language for illustrations, ghost hint cards, one primary action per state.

**Decision:** Approved as-is.

### 10 — Data Visualization
`10-data-visualization.html`

Sparklines in pod cards, activity heat map, 6-month equity trend line, pod health comparison bars, Spotify Wrapped full-bleed slides, segmented per-contact equity ring, interaction frequency bars.

### 11 — Copy Audit
`11-copy-audit.html`

Full before/after of every user-facing string. Side-by-side mockups with green highlights on changed copy.

**Decisions:** All proposed copy approved. Voice: warm, lowercase-leaning, direct, human. Key shifts: "Healthy"→"Steady", "Dormant"→"Fading", "Remove"→"Let go", "At risk"→"Slipping away", placeholders conversational ("What happened?", "Find someone...").

## Locked Decisions

| Element | Decision | Rationale |
|---------|----------|-----------|
| Display font | Fraunces 800 | Heavier than Playfair, matches Trolley PDF confidence |
| Body font | Plus Jakarta Sans | Geometric, modern, good legibility |
| Orb surface | Two-tone color shift | Hue-shifted diagonal gradient gives internal color motion |
| Orb effects | Glow halo + health ring | Colored ambient glow + data-encoded equity ring |
| Health ring gap | 4px from orb edge | Tight, snug feel |
| Card treatment | Mini orb avatar | Dashboard cards mirror map's visual language |
| Map concept | Orbital system | Concentric orbits, priority = proximity to hub |
| Map connections | Lines between main orbs | Hub-to-pod + cross-connections between related pods |
| Small orb overflow | Clustered/stacked | Categories cluster near parent pod, not scattered |
| Alert style | Icon circle + tinted bg | No left-border stripes |
| Brand color | #25B439 (green) | From Trolley PDF, used as environment not just accent |
| Background | #f8f8f6 | Warm near-white |
| Hub orb | #1C1C1E → #2C2C30 | Dark two-tone shift |
| Orb entrance | Orbit slide (stacked start) | All orbs begin at hub center, fly out staggered to orbital positions |
| Glow behavior | Reactive on hover | Quiet at rest, lights up smooth+fast under cursor |
| Orb hover | Lift + glow + press squish | Scale up, translateY, glow intensifies. Press squishes. iOS-style |
| Card hover | Scale + colored shadow | Each card glows its pod color on hover |
| Panel transition | Soft fade-slide | Short travel (40px), materializes in place. 350ms |
| View switch | Crossfade dissolve | Old fades out, new fades in. 300ms. Calm, editorial |
| Loading | Skeleton shimmer | Ghost shapes with shimmer animation |
| Cursors | pointer + grab only | Pointer for clickable orbs, grab/grabbing for drag. No crosshair/zoom |
| Dark mode bg | #111111 | Pure dark, lets orb glows pop |
| Dark mode surface | #1a1a1a | One step up from bg for cards/panels |
| Dark green band | #1B8A2A | Darker green reduces eye strain on dark bg |
| Dark hub orb | #2C2C30 + rim | Slightly lighter + subtle white border to stay visible |
| Dark glow opacity | 0.40 (up from 0.25) | Glows intensify on dark canvas for atmosphere |
| System preference | prefers-color-scheme | Follow OS setting, no manual toggle for v1 |
| Mobile nav | Bottom tab bar | Fixed, 48px height, dot indicators. Replaces floating pill |
| Mobile panel | Full-screen sheet | Slides up from bottom, back arrow to map. No split view |
| Mobile map | Pinch-to-zoom + tap | 44px touch targets, tighter orbits, clusters fan on tap |
| Icons | Rounded line 1.5px (Lucide) | Medium weight, rounded caps, geometric. Not hairline, not chunky |
| Icon sizes | 12/16/20/28px | Inline, timeline, nav, empty states |
| Interaction colors | Green=call, blue=email, purple=text, orange=meeting, neutral=note, pink=intro | Semantic per type |
| Empty states | Orb illustration + ghost hints + 1 CTA | Consistent visual language, always one clear next action |
| Sparklines | 30-day trend in pod cards | Pod-colored area fill at 12% opacity |
| Pod health bars | Horizontal bars with two-tone gradient | Sorted by health, score in pod color |
| Equity trend | 6-month line chart with green fill | Dashboard section or expanded equity ring view |
| Wrapped vision | Full-bleed color slides with oversized serif | Monthly/quarterly network celebration. Bold endgame. |
| Segmented ring | Per-contact equity ring by interaction type | Channel diversity at a glance |
