

# Landing Page Polish + Sidebar Badge Pulse

## 1. Sidebar badge dot with pulse animation

The `NavItem` component currently has no `badge` prop - the previous implementation didn't persist. Add a `badge` boolean prop and render a pulsing green dot.

**Sidebar.tsx changes:**
- Add `badge?: boolean` to `NavItem` props
- Render a small green dot (6px) with CSS pulse animation when `badge` is true
- Pass `badge={!localStorage.getItem('realdeal:changelog-seen:0.2')}` to the "What's New" NavItem
- On click, set the localStorage key before navigating
- Pulse keyframes via inline style or a `@keyframes` block in index.css

## 2. Replace fake testimonials with a social proof / logo strip

Remove the `TESTIMONIALS` array and the quote cards. Replace with:
- A "Backed by" or "Trusted by" section featuring the Kinship Ventures team names (Moj Mahdara, Gwyneth Paltrow, Trina Spear) as simple name + title cards without fabricated quotes
- A logo strip of well-known brands from the Kinship portfolio: **goop**, **FIGS**, **MoonPay**, **Forerunner Ventures**, **Wonder** - rendered as text logos (styled brand names) since we don't have image assets

## 3. Expand the "How it works" section

Current: 3 sparse steps with one-line descriptions on a green background.

Expand to:
- More descriptive step copy with concrete outcomes
- Add a 4th step ("Insights" - track relationship health and get smart nudges)
- Add subtle visual elements per step (inline SVG icons matching the feature icons style)
- Add a connecting visual (numbered flow with subtle connecting lines or arrows between steps)
- Slightly more padding and larger step descriptions

## Files changed

| File | Changes |
|---|---|
| `src/components/nav/Sidebar.tsx` | Add `badge` prop to NavItem, pulse dot, changelog seen logic |
| `src/index.css` | Add `@keyframes badge-pulse` animation |
| `src/components/landing/LandingPage.tsx` | Replace TESTIMONIALS with name cards + logo strip, expand STEPS to 4 with richer copy and icons |

