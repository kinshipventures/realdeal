# Design System — Kinship Brain

## Product Context
- **What this is:** Relationship intelligence OS for Moj Mahdara (CEO, Kinship Ventures)
- **Who it's for:** Moj, Briell, Gwyneth, and the Kinship team
- **Space:** Relationship management — not a CRM. People, not customers.
- **Project type:** Web app (React + Vite + React Flow)
- **Reference:** Trolley CRM PDF (`2026 Trolley CRM.pdf`)

## Aesthetic Direction
- **Direction:** Editorial/Magazine
- **Decoration:** Intentional — the orbs ARE the decoration. No gratuitous effects.
- **Mood:** Confident, bold, warm. A brand book, not a dashboard. Feels like Moj, not like Notion.

## Typography
- **Display/Headings:** [Fraunces](https://fonts.google.com/specimen/Fraunces) 700/800 — heavier than Playfair, matches Trolley PDF confidence. Variable font with optical size axis.
- **Body:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) 400/500/600 — geometric, modern, good legibility.
- **Loading:** Google Fonts via `<link>` in index.html + CSS `@import` backup.

### Scale

| Usage | Size | Weight | Font |
|---|---|---|---|
| Display | 32px | 800 | Serif |
| Heading | 18px | 700 | Serif |
| Subheading | 15px | 700 | Serif |
| Pod name | 13px | 700 | Serif |
| Body | 13px | 400-500 | Sans |
| Caption | 11px | 500 | Sans |
| Score number | 22-28px | 700 | Sans |
| Orb label | 8-13px | 600 | Sans |

## Color

### Brand
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-brand` | `#25B439` | `#2ECB45` | Primary green — nav, CTAs, accents |
| `--color-brand-dark` | `#1A8A2A` | `#1A8A2A` | Hover states on green |
| `--header-band-bg` | `#25B439` | `#1B8A2A` | Dashboard header band (darkens in dark mode) |

### Surfaces
| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#f8f8f6` | `#111111` |
| `--color-surface` | `#ffffff` | `#1a1a1a` |
| `--surface-panel` | `rgba(255,255,255,0.92)` | `rgba(255,255,255,0.06)` |
| `--border` | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.06)` |

### Text
| Token | Light | Dark |
|---|---|---|
| `--text-primary` | `rgba(0,0,0,0.82)` | `rgba(255,255,255,0.87)` |
| `--text-secondary` | `rgba(0,0,0,0.45)` | `rgba(255,255,255,0.45)` |
| `--text-tertiary` | `rgba(0,0,0,0.28)` | `rgba(255,255,255,0.25)` |

### On Green Band
| Value | Usage |
|---|---|
| `#ffffff` | Score numbers, stat values, headings |
| `rgba(255,255,255,0.70)` | Secondary labels |
| `rgba(255,255,255,0.55)` | Tertiary labels |

### Interaction Type Colors
| Type | Color | Usage |
|---|---|---|
| Call | `#2E7D32` | Timeline icon, type pill |
| Email | `#1565C0` | Timeline icon, type pill |
| Text | `#7B1FA2` | Timeline icon, type pill |
| Meeting | `#E65100` | Timeline icon, type pill |
| Note | `rgba(0,0,0,0.50)` | Timeline icon, type pill |
| Intro | `#C2185B` | Timeline icon, type pill |

### Orb Pod Colors (from Trolley PDF)
Each pod gets a distinct color. All orbs use two-tone gradient (base → hue-shifted neighbor).

| Pod | Base | Shift | Glow |
|---|---|---|---|
| Maps | `#E53935` | `#FF6B4A` | `rgba(229,57,53, 0.25/0.40)` |
| LPs | `#FF6B8A` | `#FF8FA5` | `rgba(255,107,138, 0.25/0.40)` |
| Companies | `#7E57C2` | `#5C6BC0` | `rgba(126,87,194, 0.25/0.40)` |
| Talent | `#25B439` | `#00BFA5` | `rgba(37,180,57, 0.25/0.40)` |
| Service Providers | `#F5A623` | `#FFD54F` | `rgba(245,166,35, 0.25/0.40)` |
| Hub (MRM) | `#1C1C1E` | `#2C2C30` | `rgba(0,0,0, 0.20/0.30)` |

Glow values: light mode / dark mode. Dark mode intensifies glow by ~60%.

## Orb System

### Surface
Two-tone color shift — diagonal gradient (`135deg`) from base color to a hue-shifted neighbor. Not lighter/darker, color-shifted. Each orb has internal color motion.

### Effects
- **Glow halo:** Colored ambient glow via `box-shadow`. Quiet at rest (`0.25` opacity), lights up on hover (`0.40`). Reactive, smooth, fast.
- **Health ring:** Thin arc ring (2px stroke) showing equity score. 4px gap from orb edge. Fills on entrance with smooth sweep animation. Track: `rgba(0,0,0,0.06)`.
- **Hub orb in dark mode:** Gets a subtle `rgba(255,255,255,0.06)` border ring to stay visible.

### Sizes
| Type | Diameter | Hover scale | Role |
|---|---|---|---|
| Hub (MRM) | 136px | — | Central identity, settings |
| List/Pod | 96px | 1.05 | Navigate into a pod |
| Category | 60px | 1.08 | Open contact panel |

### Hover + Press
- **Hover:** Scale up + translateY(-3px) + glow intensifies. `0.2s cubic-bezier(0.34, 1.2, 0.64, 1)`.
- **Press:** Scale down to 0.94. `0.08s ease-in`. iOS-style squish.
- **Cursor:** `pointer` for clickable, `grab`/`grabbing` for draggable.

## Map

### Layout: Orbital System
Concentric dashed orbit rings emanate from the hub. Priority pods orbit closer, lower priority further out. The hub has gravitational pull.

### Connections
Lines between hub and all pods, plus subtle cross-connections between related pods. Line style: `1.5px rgba(0,0,0,0.06)`.

### Small Orb Clustering
When a pod has many categories, smaller orbs cluster into a tight group near their parent pod rather than scattering across the canvas. Tap the cluster to fan them out on mobile.

### Entrance Animation
All orbs start stacked at the hub center and fly out to their orbital positions with staggered delay. Each orb slides from hub to its spot. Hub appears first, then pods radiate outward. `0.7s cubic-bezier(0.22, 1, 0.36, 1)`, stagger: `0.1s` per orb.

## Cards (Pod Cards)

### Treatment: Mini Orb Avatar
Each card has a small (30px) two-tone orb at the left — same visual treatment as the map orbs. The dashboard and map share the same visual DNA.

### Hover
Scale up slightly (1.02) + drop shadow shifts to the pod's color. Each card glows its own color on hover. `0.15s ease`.

## Dashboard

### Green Header Band
Top section wraps equity ring + stats in brand green. Rounded bottom corners (`0 0 20px 20px`). White text on green. Equity ring: white arc strokes, white gradient on green.

### Section Headings
`today's focus` and `needs attention` — lowercase, serif, intentional whisper.

## Contact Panel

### Desktop
Right-side drawer, 340px wide. Frosted panel background.
### Mobile
Full-screen sheet, slides up from bottom. Back arrow to return to map. No split view.
### Transition
Soft fade-slide: 40px travel distance, materializes in place. `0.35s cubic-bezier(0.4, 0, 0.2, 1)`.

## Navigation

### Desktop
Floating pill nav, centered. Active tab: brand green background + white text + green shadow. Inactive: transparent + dim text.
### Mobile
Fixed bottom tab bar, 48px height. Heart icon = Pulse, crosshair/target icon = Map. Active = solid green fill, inactive = 1.5px stroke outline.

### View Switch
Crossfade dissolve between Pulse and Map. `0.3s`. Calm, editorial.

## Icons
- **Style:** Rounded line, 1.5px stroke, rounded caps and joins (Lucide library)
- **Sizes:** 12px (inline text), 16px (timeline/pills), 20px (nav/buttons), 28px (empty states/features)
- **Active nav:** Solid fill in brand green. Inactive: light stroke outline.

## Empty States
Every empty state uses:
1. A colored orb illustration (pod color or brand green) with a line icon inside
2. Ghost hint cards showing the shape of future data (dashed borders)
3. One clear primary green CTA button
4. Warm, human copy (not "No data found")

| State | Heading | CTA |
|---|---|---|
| Map — no pods | Your network starts here | Create first pod |
| Dashboard — no activity | No pulse yet | Log interaction |
| Pod — no contacts | {Pod name} is empty | Add contact |
| Contact — no interactions | No history yet | Log first interaction |
| Search — no results | No one by that name | Add {searched name} |
| All caught up | All caught up | Open map |

## Loading
Skeleton shimmer — ghost shapes of the final UI with a shimmer animation. Orb map: single green orb pulses where hub will appear, then orbs radiate out.

## Motion

| Animation | Curve | Duration | Usage |
|---|---|---|---|
| Orb entrance | `cubic-bezier(0.22, 1, 0.36, 1)` | 700ms | Orbit slide from hub |
| Orb hover | `cubic-bezier(0.34, 1.2, 0.64, 1)` | 200ms | Lift + glow |
| Orb press | `ease-in` | 80ms | Squish |
| Health ring fill | `cubic-bezier(0.4, 0, 0.2, 1)` | 1200ms | Smooth sweep |
| Panel slide | `cubic-bezier(0.4, 0, 0.2, 1)` | 350ms | Soft fade-slide |
| View switch | ease | 300ms | Crossfade dissolve |
| Card hover | ease | 150ms | Scale + colored shadow |
| Stagger delay | — | 100ms per orb | Entrance sequencing |

## Dark Mode

Follow `prefers-color-scheme` — no manual toggle for v1. Key adaptations:
- Surfaces go dark (`#111` bg, `#1a1a1a` surface)
- Green band darkens to `#1B8A2A` (less eye strain)
- Orb glows intensify (0.25 → 0.40 opacity) — the map becomes a constellation
- Hub orb gets a subtle `rgba(255,255,255,0.06)` border ring
- Brand green brightens slightly to `#2ECB45` for contrast
- Text flips to white hierarchy (87%/45%/25% opacity)

## Responsive

| Breakpoint | Layout |
|---|---|
| Desktop (960px+) | Full dashboard, floating pill nav, side-by-side contact panel |
| Tablet (768px) | 2-column pod grid, pill nav, side panel |
| Phone (<768px) | Horizontal scroll pods, bottom tab bar, full-screen contact sheet |

Mobile map: pinch-to-zoom, 44px touch targets, tighter orbits. Tap to drill (no hover). Clusters fan on tap.

## Data Visualization

| Component | Description |
|---|---|
| Sparklines | 30-day trend in pod cards. Pod-colored area fill at 12% opacity. |
| Health bars | Horizontal bars with two-tone gradient. Sorted by health, score in pod color. |
| Equity trend | 6-month line chart with green area fill. Dashboard section or expanded ring view. |
| Activity heat | GitHub-style grid in brand green at varying opacities. 12-week view. |
| Segmented ring | Per-contact equity ring by interaction type. Channel diversity at a glance. |
| Frequency bars | 8-week bar chart per contact. Brand green at varying opacities. |
| Wrapped | Full-bleed color slides with oversized Fraunces serif. Monthly/quarterly network celebration. |

## Voice + Copy

**Tone:** Warm, lowercase-leaning, direct, human. Not corporate, not techy. The language a stylish CEO uses texting her team.

### Score Labels
| Score | Label |
|---|---|
| 85+ | Thriving |
| 70+ | Steady |
| 40+ | Cooling |
| <40 | Fading |

### Dormancy Labels
| Days | Label |
|---|---|
| 180+ | Slipping away |
| 120+ | Going quiet |
| <120 | Cooling off |

### Key Copy Decisions
| Element | Copy |
|---|---|
| Search placeholder | Find someone... |
| Notes placeholder | What happened? |
| Create contact button | Add to network |
| Delete confirm | Remove this person? |
| Dormant remove | Let go |
| No search results | No one by that name |
| Empty contacts | No one here yet |
| Overdue timestamp | {N}d ago |
| Never contacted | Never reached |
| Dormant section header | {N} gone quiet |
| Success alert | Logged with {name}. |
| Error alert | Couldn't reach Airtable. Try again? |
| Category placeholder | Name this group |
| Stat label | Reached this week (not "7d") |
| Field: Specialization | Focus |
| Field: Past clients | Known for |
| Field: Recommended by | Intro'd by |
| Section: Relationship context | Context |

## Spacing
8pt grid: `8, 16, 24, 32, 40, 48` px.

| Context | Value |
|---|---|
| Panel padding | 24px horizontal, 28px top |
| Header band padding | 28px 24px 32px |
| Card padding | 14-16px |
| Card gap | 12px |
| Orb orbit radius (lists) | 310px |
| Orb orbit radius (categories) | 230px |
| Panel radius | 16px |
| Card radius | 12px |
| Button radius | 10px |

## Interaction States

Every component that touches data needs all five states specified.

| Component | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Dashboard (overall) | Skeleton shimmer on green band + card ghosts | "No pulse yet" + orb illustration | "Couldn't reach Airtable. Try again?" | Normal render | Stats load before interactions (stagger) |
| Pod cards | Shimmer card shapes | No pod cards section shown | Pod card shows "—" for score | Normal render | Cards appear as pods load, scores fill in after |
| Today's Focus | Hidden until data loads | Section hidden (not shown, not empty state) | Inherits dashboard error | Normal render | — |
| Needs Attention | Spinner inside panel | "All caught up." | Inherits dashboard error | Normal render | List grows as data streams in |
| Orb Map | Single green orb pulses at hub position | "Your network starts here" + ghost orbit rings | "Couldn't load your network" | Orbit slide entrance animation | Pods load first, categories on drill-in |
| Contact Panel | Spinner | "No one here yet" | "Couldn't reach Airtable. Try again?" | Normal render | — |
| Contact Detail | Spinner | N/A (always has a contact selected) | Field-level inline errors | Auto-save indicator (subtle) | Fields save independently |
| Interaction Logger | — | Default to Call type selected | "Couldn't save. Try again?" | Type pill briefly flashes green | — |
| Search | — | "No one by that name" + "Add {name}" CTA | — | Instant filter (no loading) | — |
| Dormant Section | Hidden until data loads | Section hidden | — | Snooze/remove confirmed inline | — |

## Motion Choreography

What animates when, tied to user actions.

| User Action | What Happens | Animation |
|---|---|---|
| App loads | Green band + stats appear, then pod cards, then focus/overdue | Stagger: band instant, cards fade-in 0.2s stagger 0.05s |
| Navigate to Map | Crossfade from Pulse view | 300ms crossfade, then hub appears, orbs fly out staggered |
| Orb map loads | Hub appears first, pods radiate from hub center | 700ms orbit slide per orb, 100ms stagger |
| Hover an orb | Orb lifts, glow intensifies | 200ms cubic-bezier(0.34, 1.2, 0.64, 1) |
| Click a pod orb | Other pods fade, categories emerge around selected | Selected stays, others scale to 0.8 + fade to 0.3 (200ms), categories pop in (450ms stagger) |
| Click a category orb | Contact panel slides in from right | 350ms soft fade-slide (40px travel) |
| Close contact panel | Panel fades + slides out | 250ms ease-in, panel exits right |
| Log an interaction | Type pill flashes green, health ring updates | Pill: 150ms green flash. Ring: 400ms sweep to new value. Orb glow: single pulse if equity changed. |
| Switch Pulse / Map tabs | Crossfade between views | 300ms ease |
| Hover a pod card | Card lifts slightly, shadow shifts to pod color | 150ms ease |
| Click dormant "Let go" | Row collapses | 200ms height collapse + fade |
| Click dormant "Keep" | Row collapses (snoozed) | Same as above |
| Scroll pod cards | Horizontal scroll with momentum | Native scroll, no custom animation |

## Accessibility

### Contrast Ratios
| Pair | Ratio | Grade |
|---|---|---|
| `--text-primary` on `--surface` | ~12:1 | AAA |
| `--text-secondary` on `--surface` | ~5.2:1 | AA |
| `--text-tertiary` on `--surface` | ~3.2:1 | AA large only |
| White on `#25B439` (green band) | ~5.5:1 | AA |
| White 70% on `#25B439` | ~4.8:1 | AA |
| White on orb colors (varies) | 4.5:1+ | AA (validated per color) |

### Keyboard Navigation
- Tab through pod cards, focus cards, overdue rows, dormant rows
- Enter/Space activates buttons and clickable rows
- Escape closes contact panel (escape stack — topmost handler fires)
- Arrow keys navigate within orb map (React Flow built-in)
- Focus ring: 2px solid brand green, 2px offset. Visible on keyboard focus, hidden on mouse.

### ARIA
- `role="navigation"` on nav pill / tab bar
- `aria-label` on all icon-only buttons (close, search, back)
- `aria-current="page"` on active nav tab
- `aria-live="polite"` on equity score (announces changes)
- Contact panel: `role="dialog"` + `aria-labelledby` pointing to panel title

### Touch Targets
- Minimum 44x44px on all interactive elements (Apple HIG)
- Orbs: invisible hit area expansion on mobile for smaller orbs
- Pod cards: full card is tappable, not just text
- Dormant action buttons: 44px height despite small visual size

### Known Gaps (to address)
| Issue | Severity | Status |
|---|---|---|
| Orb map nodes not keyboard-focusable | Medium | React Flow `nodesFocusable={false}` — intentional for v1 |
| Close button (x) needs `aria-label` | Medium | "Close" label exists in code |
| `--text-tertiary` at 10px is borderline | Low | Use for non-critical metadata only |
| No skip-to-content link | Low | Add before public launch |
| No reduced-motion support | Medium | Add `prefers-reduced-motion` to disable orb entrance and breathing animations |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-23 | Design system created | /design-consultation with 11 exploration iterations |
| 2026-03-23 | Fraunces over Playfair Display | Heavier weight matches Trolley PDF. Playfair too precious. |
| 2026-03-23 | Two-tone orbs over radial gradient | Color shift feels alive without being shiny/glassy |
| 2026-03-23 | Orbital map over constellation/radar/topo | Gravity metaphor: priority = proximity to hub |
| 2026-03-23 | Mini orb avatar cards over left-border | Left-border is AI slop. Mini orb connects dashboard to map language. |
| 2026-03-23 | "Fading" over "Dormant" | Relationship word, not a database word |
| 2026-03-23 | "Let go" over "Remove" | Human decision, not a database operation |
| 2026-03-23 | Lucide rounded line icons | Medium weight, geometric, matches Plus Jakarta Sans |
