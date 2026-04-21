# Design System - Real Deal

## Product Context
- **What this is:** A personal command surface for triaging the day. It pulls inbox pressure, calendar reality, open loops, waiting items, and world-level movement into one place.
- **Who it's for:** A founder, operator, or high-context person who wants to decide what matters fast without living in ten tabs all day.
- **Space/industry:** Personal operating system, executive dashboard, relationship-aware work triage. Adjacent to Arc and Dia in product feel, but grounded in daily operational work.
- **Project type:** Authenticated web app dashboard.

## Aesthetic Direction
- **Direction:** Calm command surface.
- **Decoration level:** Intentional.
- **Mood:** Dia's calm, report-like clarity with Arc's shell and spatial framing. The app should feel composed, premium, and useful, not loud, not toy-like, and not like an internal admin panel.
- **Reference sites:** https://www.diabrowser.com/, https://arc.net/

## Core Design Thesis
- The shell should feel designed before the cards do.
- The first screen should make one strong point before it shows the full workload.
- Most of the page should live in warm neutrals. Green can still frame the experience, but it should do that through controlled shell treatment instead of full-page wash.
- The app should feel like a morning report with controls, not a control room with extra copy.

## Safe And Risky Decisions

### Safe Choices
- Use a clear left rail and a disciplined app grid. Users expect orientation and fast scanning in this kind of product.
- Keep cards and lists readable, dense, and practical. The app still has to work like a command surface.
- Use a restrained neutral palette for the base UI. This keeps the product legible and calm.

### Risks
- Use an editorial serif for the top thesis and major section moments. Gain: more character and calm authority. Cost: needs tighter restraint elsewhere so it does not feel fancy for no reason.
- Give the app a stronger shell tint and frame instead of a flat full-bleed page. Gain: Real Deal feels more like a product environment. Cost: more visual opinion, less generic flexibility.
- Reduce equal-weight modules above the fold. Gain: faster focus and more confidence. Cost: some information moves lower or stays hidden until needed.

## Typography
- **Display/Hero:** Instrument Serif - for the morning thesis, key section openings, and high-value statements. If licensing is available later, Exposure can replace this role.
- **Body:** Instrument Sans - clean, modern, and calmer than most dashboard sans choices.
- **UI/Labels:** Instrument Sans 500/600.
- **Data/Tables:** Instrument Sans with tabular numerals for default tables and metrics. Use Space Mono sparingly for timestamps, counts, and machine-like detail.
- **Code:** Space Mono.
- **Loading:** Google Fonts for Instrument Serif and Instrument Sans. Space Mono via Google Fonts. If the team wants closer Dia fidelity later, self-host licensed ABC Oracle, Exposure, and ABC Favorit Mono.

### Scale

| Usage | Size | Weight | Font | Notes |
|---|---|---|---|---|
| Hero thesis | 48-56px | 400-500 | Serif | Large, calm, not shouty |
| Page title | 32-40px | 500 | Serif | One main thought per screen |
| Section title | 22-28px | 500 | Serif | Used sparingly |
| Card title | 17-20px | 500-600 | Sans | Practical, not ornamental |
| Body | 14-16px | 400-500 | Sans | Default reading size |
| Secondary body | 13-14px | 400-500 | Sans | Summaries and support text |
| Meta / status | 11-12px | 500-600 | Sans or Mono | Tight, deliberate |
| Timestamp / count accent | 11-12px | 400-500 | Mono | Use with restraint |

## Color
- **Approach:** Restrained shell with signal accents.
- **Primary shell accent:** `#3147FF` - active chrome, selected views, important focus states.
- **Secondary shell tint:** `#EDEBFF` - soft shell glow, highlighted surfaces, ambient framing.
- **Brand framing green:** `#25B439` - shell framing, selected app moments, success, connected state, and a few high-confidence actions.
- **Warm neutrals:**
  - `#FAF8F4` - page background
  - `#F2EEE7` - elevated wash
  - `#E1D9CD` - border and soft dividers
  - `#B2AAA0` - muted labels
  - `#6F675F` - secondary text
  - `#201D1A` - primary ink
- **Support accents:**
  - `#FFF1C7` - thesis highlight, soft report note
  - `#C9E7FF` - cool informational wash
  - `#F4D3D8` - low-intensity watch state
- **Semantic:**
  - success `#25B439`
  - warning `#E3A63A`
  - error `#D65A4A`
  - info `#5B79FF`
- **Dark mode:** Not the priority for this redesign. If expanded later, keep backgrounds charcoal and desaturate shell blues by 10-15 percent.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable-compact
- **Scale:** 4, 8, 12, 16, 24, 32, 40, 56, 72

### Spacing Rules
- Above the fold, show no more than 3 primary modules.
- Use larger spacing around the thesis area than the rest of the page.
- Keep internal card spacing tight and external section spacing generous.
- Side rail spacing should feel quieter than content spacing.

## Layout
- **Approach:** Hybrid. Editorial opening, disciplined app grid below.
- **Grid:** 12 columns desktop, 8 columns main + 4 columns rail for the primary home view.
- **Max content width:** 1360px
- **Border radius:** 10 / 16 / 24 / 32 / full

### Shell Rules
- The app should read as one framed environment, not a flat page.
- The left rail is part of the identity, not just navigation.
- The top section should carry the daily thesis and a small number of summary signals.
- Secondary queues should feel nested and quieter.
- Do not give every section the same visual weight.

### Home Screen Rules
- Start with one clear thesis about the day.
- Then show what needs action now.
- Then show drift, waiting, and movement.
- If a module is not changing the next hour, it should not dominate the fold.

## Surface System
- Base surfaces should be light, warm, and low-contrast.
- Use frosted or tinted shell treatment only on large containers, nav, overlays, and high-level framing.
- Card borders should be visible but soft.
- Shadows should be broad and low-contrast, never crunchy.

### Surface Tokens
- `surface-base`: `rgba(255,255,255,0.70)`
- `surface-elevated`: `rgba(255,255,255,0.86)`
- `surface-shell`: `rgba(237,235,255,0.55)`
- `surface-overlay`: `rgba(255,255,255,0.62)`
- `border-soft`: `rgba(32,29,26,0.08)`
- `border-strong`: `rgba(32,29,26,0.14)`
- `shadow-soft`: `0 12px 40px rgba(24, 20, 16, 0.08)`
- `shadow-shell`: `0 20px 80px rgba(49, 71, 255, 0.10)`
- `blur-shell`: `20px`

## Motion
- **Approach:** Intentional.
- **Easing:**
  - enter: `cubic-bezier(0.2, 0.8, 0.2, 1)`
  - exit: `cubic-bezier(0.4, 0, 0.2, 1)`
  - move: `cubic-bezier(0.22, 1, 0.36, 1)`
- **Duration:**
  - micro: 80ms
  - short: 160ms
  - medium: 240ms
  - long: 360ms

### Motion Rules
- No decorative motion loops on core work surfaces.
- Movement should support orientation, not spectacle.
- Panels should glide, not slam.
- Hover states should feel polished but very quiet.

## Components

### Left Rail
- Stronger visual identity than the current sidebar.
- Green-tinted shell treatment is allowed here.
- Fewer hard dividers.
- Active state should feel selected by the shell, not just highlighted with a pill.

### Thesis Band
- Replace the current generic opening with a stronger daily thesis.
- Use serif display, one supporting line, and 2-3 compact summary signals.
- This is the main place where Dia's calm should show up.
- A restrained green frame or underlay can live here if the content still reads clearly.

### Priority Modules
- Use one dominant action area.
- Other modules should step down clearly.
- Avoid long stacks of equally loud cards.

### Cards
- Cards should feel more like grouped report sections than standalone widgets.
- Use fewer heavy fills and fewer isolated little pills.
- Labels should be quieter.

### Tags And Status
- Green can appear in the shell and top framing, but not on every card.
- Reserve the strongest saturation for framing, status, urgency, or selection.
- Most tags should use ink, smoke, sand, or cool shell tones.

## Copy And Voice
- Tone should be direct, calm, and slightly editorial.
- The page should sound like it knows what matters, not like it is trying to explain every module.
- Prefer short headings with confidence.
- Prefer support copy that reduces anxiety and clarifies what to do next.

## What To Avoid
- Big green fills that flatten the whole page into one block.
- Equal-weight cards from top to bottom.
- Generic dashboard gradients.
- Excessive chips, pills, and boxed metrics fighting for attention.
- Overusing green inside every module at once.
- UI that feels like a prettier admin panel instead of a designed environment.

## Implementation Priorities
1. Redesign the shell and left rail.
2. Rewrite the top section into a stronger thesis band.
3. Rebalance module weight on the home screen.
4. Use green as restrained framing, then let neutrals handle most surfaces.
5. Tighten type hierarchy and spacing before adding any new visual effects.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | Shifted from green-first dashboard styling to calm command surface | The live product is now a broader personal OS, and the old Kinship design system no longer matches the product. |
| 2026-04-21 | Chose Dia calm + Arc shell as the reference mix | Dia gives the right emotional tone, Arc gives the right framing and product shell. |
| 2026-04-21 | Kept green as framing instead of full-page environment | Green should still shape the shell, but warm neutrals should carry most surfaces and reading areas. |
