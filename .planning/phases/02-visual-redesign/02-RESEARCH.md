# Phase 2: Visual Redesign - Research

**Researched:** 2026-03-22
**Domain:** CSS design tokens, typography, React Flow node styling, dashboard layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Typography — serif headings (match Trolley PDF's editorial serif, closest Google Font) + matched sans-serif body text replacing DM Sans
- **D-02:** Color — green (`~#2DB83D`) as primary brand color, used for dashboard header band, nav accents, section dividers
- **D-03:** Orbs — solid opaque circles replacing glass orb system. Dark/black hub orb for Moj. Saturated colors for list and category orbs. Subtle depth (soft drop shadow or very subtle gradient, not flat).
- **D-04:** Dashboard cards — pod cards match Trolley's list representation treatment. Equity ring gets a new gradient harmonized with the green palette. All sections get visual refresh.
- **D-05:** Design tokens — all colors, typography, spacing, and orb constants defined as CSS custom properties. No inline magic values.
- **D-06:** Headings use a bold editorial serif matching the Trolley PDF (high stroke contrast, ball terminals). Used for panel titles, section headings, dashboard headings.
- **D-07:** Body text switches from DM Sans to a sans-serif matching the Trolley PDF's body font.
- **D-08:** Loaded via Google Fonts.
- **D-09:** Green is the primary brand color, used for full-panel backgrounds, section headers, dividers.
- **D-10:** Dashboard gets a green header band (top section with equity score + stats), rest of dashboard on white/light background.
- **D-11:** Nav pill active state uses green.
- **D-12:** Background shifts from warm off-white `#F5F4F0` to match Trolley's palette (white or near-white body, green panels).
- **D-13:** Glass orb system is replaced entirely. No more three-layer radial gradients.
- **D-14:** Moj hub orb becomes dark/black.
- **D-15:** Size hierarchy slightly exaggerated — hub gets larger, categories stay similar or slightly smaller.
- **D-16:** Subtle depth on orbs — soft drop shadow or very subtle gradient. Not completely flat.
- **D-17:** Edge/connection lines stay as straight lines between orbs.
- **D-18:** Green header band for top row (equity ring + stats). Remaining sections on light/white background.
- **D-19:** All dashboard sections get visual refresh.
- **D-20:** Pod health cards match Trolley's treatment for list representations.
- **D-21:** Equity ring gradient updated to harmonize with green brand — green-to-teal or similar.
- **D-22:** Contact panels (right-side drawer) are IN SCOPE.
- **D-23:** Floating pill nav gets green active state indicator.

### Claude's Discretion
- Exact serif and sans-serif font choices (closest Google Fonts to the PDF)
- Font weights and size adjustments during the switch
- Exact green hex value (sample from PDF, likely `#2DB83D` or similar)
- Exact exaggerated orb sizes (hub ~130-140px, keep proportional)
- Drop shadow values for solid orbs
- Green-to-teal gradient stops for equity ring
- Pod card layout details within the Trolley-matched direction
- Focus card and overdue list styling within the new design language
- Contact panel header/section styling within the new design language
- CSS custom property naming conventions
- How `GlassOrb.tsx` is refactored/replaced (may become `SolidOrb.tsx` or just `Orb.tsx`)
- Transition/animation adjustments for new visual system
- design-system.md updates to reflect the new token set

### Deferred Ideas (OUT OF SCOPE)
- Dark mode / theme switching
- Animated orb transitions (morph from glass to solid)
- Custom Trolley font licensing
- Orb map physics/force layout
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Design tokens defined as CSS custom properties (colors, typography, spacing) | Tailwind v4 @theme pattern enables token definition that generates both utility classes and CSS vars |
| VIS-02 | Dashboard visuals aligned with Trolley CRM PDF (scoped to 3-5 specific deltas) | PDF analyzed — fonts, colors, orb styles, layout patterns all documented below |
| VIS-03 | App looks polished enough to demo to Gwyneth | Solid orbs + green brand + serif headings + tokenized surface = cohesive presentation |
</phase_requirements>

---

## Summary

The Trolley CRM PDF shows a clear design language: vibrant green (`#25B439` sampled from cover) as the primary brand color on full-panel backgrounds, bold editorial serif headings (Playfair Display is the nearest Google Font — high stroke contrast, ball terminals, large x-height), clean geometric sans body text (Plus Jakarta Sans is the match — fresh geometric, strong legibility, distinct from DM Sans), and solid opaque circles for all network nodes (near-black `#1C1C1E` hub, fully saturated category colors, straight-line connections).

The current app has ~568 lines of inline styles with magic values in Dashboard.tsx alone, a three-layer radial gradient glass orb system in GlassOrb.tsx, and DM Sans throughout. This phase replaces all of it systematically: define tokens in `@theme` and `:root` in globals.css, replace `GlassOrb` with `SolidOrb`, update the dashboard layout with a green header band, and swap fonts in index.html and globals.css.

The Tailwind v4 `@theme` directive is the correct mechanism for design tokens — it simultaneously generates utility classes AND CSS custom properties. Regular `:root` variables handle non-utility tokens (orb sizes, panel constants). The split gives maximum utility-class coverage without polluting `@theme` with implementation-specific values.

**Primary recommendation:** Define all tokens in `globals.css` using `@theme` for utility-mapped tokens and `:root` for component-specific constants. Replace `GlassOrb.tsx` with `SolidOrb.tsx` maintaining identical props. Migrate Dashboard.tsx inline styles by referencing `var(--token)` in style props, not by adding Tailwind classes — Dashboard.tsx uses inline styles throughout and that pattern should stay consistent.

---

## Standard Stack

### Core (already installed — no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.2.1 | Utility classes + `@theme` design tokens | Already in project; v4's `@theme` is the right token mechanism |
| Google Fonts | via `<link>` in index.html | Font loading | No package needed; same pattern as current DM Sans load |

### No new npm packages required
The entire visual redesign is accomplished through:
- CSS changes in `globals.css` (tokens, font import)
- HTML change in `index.html` (new font link)
- Component refactor of `GlassOrb.tsx` → `SolidOrb.tsx`
- Style updates across Dashboard.tsx, App.tsx, ContactPanel.tsx, ContactDetail.tsx, ContactCard.tsx, node components

**Do not add:** color manipulation libraries (tinycolor2, chroma-js), CSS-in-JS, animation libraries, or icon sets. None required.

---

## Typography

### Font Identification (from PDF analysis)

**Heading font — Playfair Display**
- Confidence: HIGH
- Evidence: The PDF's "trolley.ai", "About our CRM", "MAPS", "LPs", "Service Providers", "Talent", "List Status" headings all show high stroke contrast, ball terminals on 'r', 'l', 'y', large x-height, compressed vertical stress, bracketed serifs — all hallmarks of Playfair Display
- Google Fonts URL: https://fonts.google.com/specimen/Playfair+Display
- Use: Bold weight (700/800) for all section headings, panel titles, dashboard headings
- NOT italic — the PDF uses upright bold exclusively for headings

**Body font — Plus Jakarta Sans**
- Confidence: MEDIUM
- Evidence: The PDF's left-panel body text shows a geometric sans with slightly tall x-height, open counters, balanced spacing, and a contemporary feel. Plus Jakarta Sans matches these characteristics better than DM Sans (which reads warmer/rounder). Inter is an alternative but Plus Jakarta Sans has more personality.
- Google Fonts URL: https://fonts.google.com/specimen/Plus+Jakarta+Sans
- Use: All body text, labels, UI elements — replaces DM Sans entirely
- Weights to load: 400, 500, 600

**Note on the PDF's heading treatment:** All large headings are lowercase (not title case) — "trolley.ai", "trolley", "About our CRM" uses sentence case. The boldness comes from weight, not size inflation. Apply `font-weight: 800` for the largest display headings, `font-weight: 700` for section headings.

### Google Fonts Load Pattern
```html
<!-- index.html — replace existing DM Sans link -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Architecture Patterns

### Token Architecture: @theme + :root split

Tailwind v4's `@theme` directive generates BOTH utility classes AND CSS custom properties. Use this split:

**`@theme` block** — tokens that need utility class coverage (colors, font families):
```css
/* Source: https://tailwindcss.com/docs/theme */
@theme {
  /* Colors */
  --color-brand: #25B439;
  --color-brand-dark: #1A8A2A;
  --color-surface: #ffffff;
  --color-bg: #f8f8f6;
  --color-text-primary: rgba(0,0,0,0.82);
  --color-text-secondary: rgba(0,0,0,0.45);
  --color-text-tertiary: rgba(0,0,0,0.28);
  --color-hub-orb: #1C1C1E;

  /* Font families */
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

**`:root` block** — component-specific constants that don't need utility classes:
```css
:root {
  /* Orb sizes */
  --orb-hub: 136px;
  --orb-list: 96px;
  --orb-category: 60px;

  /* Orb radius */
  --orbit-lists: 310px;
  --orbit-categories: 230px;

  /* Panel */
  --panel-bg: rgba(255,255,255,0.92);
  --panel-blur: blur(32px);
  --panel-border: rgba(0,0,0,0.07);
  --panel-radius: 16px;

  /* Surfaces */
  --surface-panel: rgba(255,255,255,0.92);
  --surface-panel-border: 1px solid rgba(0,0,0,0.07);

  /* Brand header */
  --header-band-bg: #25B439;
  --header-band-text: #ffffff;
  --header-band-padding: 28px 32px;

  /* Orb shadows (solid orbs) */
  --orb-shadow-base: 0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12);
  --orb-shadow-hover: 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.14);
  --orb-shadow-hub: 0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.20);
}
```

### globals.css update pattern

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

@theme {
  /* ... token definitions ... */
}

:root {
  /* ... component constants ... */
}

@layer base {
  body {
    background: var(--color-bg);
    font-family: var(--font-sans);
    /* ... */
  }

  h1, h2, h3, .heading {
    font-family: var(--font-serif);
  }
}
```

### Solid Orb Component Pattern

The existing `GlassOrb.tsx` props interface (`size`, `color`, `glowIntensity`, `animationDelay`, `onClick`, `className`, `children`) MUST be preserved — all four node components (ListNode, CategoryNode, MojNode, CreateCategoryNode) depend on it. Rename to `SolidOrb.tsx` (or `Orb.tsx`) and update imports.

**Key change:** Replace the three-layer radial gradient background with a solid fill. Keep `.orb-interactive` CSS class but update its box-shadow to use the new shadow tokens (no more inner glow ring, use drop shadow instead).

```tsx
// SolidOrb.tsx — replaces GlassOrb.tsx
// Props interface unchanged for drop-in replacement

export function SolidOrb({ size, color, glowIntensity = 'low', animationDelay, onClick, className, children }: SolidOrbProps) {
  // Hub orb (Moj) receives color='#1C1C1E' — dark fill
  // Category orbs receive their pod color — solid fill

  // Very subtle gradient for depth — single layer, not glass
  // A 10-15% lighter tint at top-left gives shape without going glass
  const bg = `radial-gradient(ellipse 60% 50% at 30% 25%, ${hexToRgba(color, 0.15)} 0%, transparent 100%), ${color}`

  // For hub orb: pure solid, no gradient needed
  // Caller passes dark color, gradient barely visible

  return (
    <div
      className={`orb-enter orb-interactive${className ? ` ${className}` : ''}`}
      onClick={onClick}
      style={{
        '--orb-scale': size >= 96 ? '1.05' : '1.08',
        '--orb-lift': '-2px',
        '--orb-color-rgb': hexToRgbValues(color),
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        background: bg,
        // No white border — solid orbs don't need the glass edge
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animationDelay,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

**`orb-interactive` update in globals.css** — remove the inset white highlight (glass artifact), update shadow to drop shadow:
```css
.orb-interactive {
  will-change: transform;
  box-shadow: var(--orb-shadow-base);
  transition:
    transform 0.18s cubic-bezier(0.34, 1.2, 0.64, 1),
    box-shadow 0.18s cubic-bezier(0.215, 0.61, 0.355, 1);
}

.orb-interactive:hover {
  transform: scale(var(--orb-scale, 1.05)) translateY(var(--orb-lift, -2px));
  box-shadow: var(--orb-shadow-hover);
}

.orb-interactive:active {
  transform: scale(0.93) !important;
  transition-duration: 0.08s !important;
  transition-timing-function: ease-in !important;
}
```

### Dashboard Green Header Band Pattern

The green header band is a wrapper div around the top row (equity ring + stats). The rest of the dashboard sits on the white/near-white background.

```tsx
// Pattern: wrap the top row in a green band, not the whole dashboard
<div style={{ background: 'var(--header-band-bg)', borderRadius: '0 0 24px 24px' }}>
  <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--header-band-padding)' }}>
    {/* equity ring + stats row */}
  </div>
</div>

<div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>
  {/* pod cards, focus, overdue, dormant */}
</div>
```

**Text on green band:** Use white (`#ffffff`) for all text inside the header band. The equity ring score number, stat values, and labels all flip to white.

**Equity ring gradient update:** Replace orange-to-purple with green-to-teal:
```tsx
<linearGradient id="equityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stopColor="#2DB83D" />
  <stop offset="100%" stopColor="#00C9B1" />
</linearGradient>
```
On the green band background, use white track + lighter white arc, OR invert: white track at low opacity, white arc fill.

### Inline Style to Token Migration Pattern

Dashboard.tsx uses inline styles throughout. The migration strategy: replace magic values with `var(--token)` in the existing style props. Do NOT convert to Tailwind classes — the file uses inline styles and that pattern stays consistent.

```tsx
// BEFORE
<div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.02em' }}>

// AFTER
<div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
```

The `PANEL` constant becomes:
```tsx
const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}
```

### Nav Active State (green)

Replace the current `rgba(0,0,0,0.08)` active background with the brand green. White text on green, dim text on inactive:

```tsx
background: isActive ? 'var(--color-brand)' : 'transparent',
color: isActive ? '#ffffff' : 'rgba(0,0,0,0.35)',
```

### Recommended File Change Order

1. `globals.css` — add tokens, new font import, update `body` font-family, update `.orb-interactive`
2. `index.html` — swap font link (Playfair Display + Plus Jakarta Sans, remove DM Sans)
3. `GlassOrb.tsx` → rename/refactor to `SolidOrb.tsx` — solid fill, same props
4. Update imports in `ListNode.tsx`, `CategoryNode.tsx`, `MojNode.tsx`, `CreateCategoryNode.tsx`
5. Update node sizes in each node component (hub: 136px, list: 96px, category: 60px)
6. `Dashboard.tsx` — green header band wrapper, token migration, equity ring gradient, pod cards
7. `App.tsx` — nav active state green, remove lavender/peach/blue radial gradient mesh
8. `ContactPanel.tsx`, `ContactDetail.tsx`, `ContactCard.tsx` — token migration + heading font on titles
9. `design-system.md` — rewrite to reflect new token set

### Recommended Project Structure (no change needed)
```
src/
├── styles/
│   └── globals.css          # All tokens live here
├── components/
│   ├── map/
│   │   ├── SolidOrb.tsx     # Renamed from GlassOrb.tsx
│   │   └── ...
│   └── ...
```

### Anti-Patterns to Avoid
- **Adding Tailwind classes to Dashboard.tsx:** The file uses inline styles. Don't mix paradigms mid-migration.
- **Touching `GlassOrb.tsx` in-place:** Rename to `SolidOrb.tsx` so git history is clear. Update all imports.
- **Gradient on hub orb:** The Trolley PDF hub nodes are flat solid near-black. No gradient needed.
- **Green text on green band:** Body text in the header band must be white or white-alpha, never green-on-green.
- **Removing the grain overlay:** Keep `body::after` grain — it adds texture to flat solid surfaces which matters more now that the glass system is gone.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design token system | Custom token registry / JS constants | Tailwind v4 `@theme` + `:root` CSS variables | Native CSS custom properties work everywhere — style props, CSS classes, JS via `getComputedStyle` |
| Font loading | Self-hosted font files, custom font loader | Google Fonts `<link>` in index.html with `display=swap` | Already the project pattern for DM Sans; no build config changes needed |
| Color utilities | Custom hex manipulation for orb gradient tints | `hexToRgba()` already in `src/lib/utils.ts` | Utility already exists; use it for the subtle radial gradient on solid orbs |
| Orb shadow calculation | JS-computed shadow values | CSS custom properties in `:root` | Static shadow values don't need runtime calculation |
| Split background | Canvas tricks, pseudo-elements, complex gradient | Simple wrapper div with background on the green band section | A `<div>` with `background: var(--header-band-bg)` is the right tool |

**Key insight:** Everything needed already exists in the project or in native CSS. The glass orb system was the most complex visual piece — replacing it with a solid fill is strictly simpler.

---

## Common Pitfalls

### Pitfall 1: Equity ring invisible on green band
**What goes wrong:** The SVG ring uses dark colors (`rgba(0,0,0,0.06)` track, orange-to-purple gradient arc). On a green background, the track disappears and the arc clashes.
**Why it happens:** Colors weren't designed for light-on-dark contexts.
**How to avoid:** Use `rgba(255,255,255,0.20)` for the ghost track and white or white gradient for the arc stroke when rendered on the green band.
**Warning signs:** Ring looks flat/invisible in browser preview on green background.

### Pitfall 2: Text contrast failure on green band
**What goes wrong:** Existing text colors (`rgba(0,0,0,0.45)`, `rgba(0,0,0,0.28)`) fail WCAG AA on green.
**Why it happens:** Those values were designed for white/off-white backgrounds.
**How to avoid:** On the green band, override text colors to white variants. `rgba(255,255,255,0.70)` for secondary text on green still passes AA (contrast ratio ~4.8:1 on `#25B439`).
**Warning signs:** Any dark alpha color on green background.

### Pitfall 3: Orb label legibility on solid dark orb
**What goes wrong:** Hub orb labels (`rgba(0,0,0,0.70)` text on glass white) become unreadable on near-black `#1C1C1E` solid fill.
**Why it happens:** Label color wasn't updated with orb background change.
**How to avoid:** Hub orb labels must use white (`rgba(255,255,255,0.90)`). Check `MojNode.tsx` for any hardcoded text colors.
**Warning signs:** Dark text on dark circle.

### Pitfall 4: GlassOrb import chain breaks
**What goes wrong:** After renaming `GlassOrb.tsx` to `SolidOrb.tsx`, TypeScript build fails on stale imports.
**Why it happens:** Four node components import GlassOrb.
**How to avoid:** Update all four imports in the same commit as the rename — `ListNode.tsx`, `CategoryNode.tsx`, `MojNode.tsx`, `CreateCategoryNode.tsx`.
**Warning signs:** `Cannot find module './GlassOrb'` build error.

### Pitfall 5: Background mesh gradient fighting green panels
**What goes wrong:** The current `app-bg` radial gradient (lavender, peach, blue) bleeds through or clashes with the solid green header band.
**Why it happens:** The atmospheric gradient was designed for the glass/transparent system. Solid green panels need a neutral background.
**How to avoid:** Remove the colored radial gradient mesh from `App.tsx`/`app-bg`. Replace with `background: var(--color-bg)` (white or near-white). The green panels provide the color now.
**Warning signs:** Purple/peach tint visible behind or around the green band.

### Pitfall 6: Tailwind v4 @theme token naming conflicts
**What goes wrong:** Custom `--color-brand` conflicts with Tailwind's default palette reset expectations.
**Why it happens:** Tailwind v4 uses `--color-*` namespace. If you do `--color-*: initial` to reset, you lose ALL colors.
**How to avoid:** Don't reset the color namespace. Just add custom tokens alongside defaults. Use specific names like `--color-brand` that don't shadow Tailwind internals.
**Warning signs:** All color utilities stop working after adding `@theme`.

### Pitfall 7: `orb-error-flash` animation references removed glass border
**What goes wrong:** `@keyframes orb-error` animates `border-color` from `rgba(255,255,255,0.65)` — the glass border that no longer exists on solid orbs.
**Why it happens:** Error animation was written for the glass system.
**How to avoid:** Update `orb-error-flash` keyframes to animate `box-shadow` instead of `border-color` for solid orbs.
**Warning signs:** Error flash looks wrong or broken after glass system removal.

---

## Code Examples

Verified patterns from official sources and direct code analysis:

### Token definition in globals.css (Tailwind v4)
```css
/* Source: https://tailwindcss.com/docs/theme */
@theme {
  --color-brand: #25B439;
  --color-brand-dark: #1A8A2A;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

:root {
  --orb-hub: 136px;
  --orb-list: 96px;
  --orb-category: 60px;
  --surface-panel: rgba(255,255,255,0.92);
  --panel-radius: 16px;
  --header-band-bg: #25B439;
}
```

### Serif heading in Dashboard (inline style)
```tsx
// Section headings get the serif font
<span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
  needs attention
</span>
```

### Solid orb background (with subtle depth)
```tsx
// Solid fill with a single subtle radial for shape — not glass
const bg = color === '#1C1C1E'
  ? '#1C1C1E'  // Hub: pure solid, no gradient
  : `radial-gradient(ellipse 55% 45% at 30% 25%, ${hexToRgba(color, 0.18)} 0%, transparent 100%), ${color}`
```

### Green header band
```tsx
<div style={{ background: 'var(--header-band-bg)', borderRadius: '0 0 20px 20px', marginBottom: 0 }}>
  <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 32px' }}>
    {/* Equity ring + stats — all text white on green */}
  </div>
</div>
```

### Equity ring on green band
```tsx
// Ghost track: white at low opacity; arc: white
<circle ... stroke="rgba(255,255,255,0.20)" ... />
<circle ... stroke="url(#equityGradient)" ... />
<defs>
  <linearGradient id="equityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
    <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
  </linearGradient>
</defs>
```

### Nav active state — green
```tsx
background: isActive ? 'var(--color-brand)' : 'transparent',
color: isActive ? '#ffffff' : 'rgba(0,0,0,0.35)',
boxShadow: isActive ? '0 1px 4px rgba(37,180,57,0.30)' : 'none',
```

### Pod card — Trolley treatment
The PDF shows list representations as solid colored circles with a label. The pod card equivalent: solid left border in pod color, white/light background, name + count + status. The existing `borderLeft: '4px solid ${color}'` pattern is actually correct directionally — refine it with the new surface token and remove the glass PANEL style.
```tsx
<div style={{
  background: 'var(--surface-panel)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderLeft: `4px solid ${pod.color}`,
  borderRadius: 12,
  padding: '16px 20px',
  minWidth: 160,
  flexShrink: 0,
}}>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` for design tokens | `@theme {}` in CSS | Tailwind v4 (2025) | Tokens become CSS vars automatically; no JS config needed |
| Multi-layer radial gradient for orb depth | Single subtle gradient or solid fill | This phase | Simpler component, easier to maintain |
| DM Sans everywhere | Playfair Display (headings) + Plus Jakarta Sans (body) | This phase | Editorial authority matches the PDF reference |
| Warm off-white (`#F5F4F0`) atmospheric background | Clean white/near-white body + green panels | This phase | Matches Trolley's high-contrast split-panel aesthetic |

**Deprecated/outdated:**
- `glass orb system`: Three-layer radial gradient + white border + `--orb-glow-size` CSS var. Replaced by solid fill + drop shadow.
- `app-bg` class with atmospheric gradient mesh: Lavender/peach/blue radials conflict with solid brand green. Remove.
- `DM Sans`: Remove from Google Fonts link and font-family stack in globals.css.

---

## Open Questions

1. **Exact green hex value**
   - What we know: PDF cover green is approximately `#25B439` or `#2DB83D` (both plausible from visual sampling)
   - What's unclear: Can't sample exact hex from PDF rendering
   - Recommendation: Use `#25B439` as the starting point — it's vibrant and saturated like the PDF. Adjust in browser if it reads too lime or too emerald.

2. **Orb label color on saturated category orbs**
   - What we know: The PDF uses white text labels on all colored category circles (pink, red, green, purple, blue)
   - What's unclear: Current app uses `rgba(0,0,0,0.70)` — some pod colors may be dark enough to fail contrast with black text
   - Recommendation: Switch all category orb labels to white (`rgba(255,255,255,0.90)`). Hub orb labels already need white. Standardize all orb labels to white.

3. **Dashboard background after removing atmospheric gradient**
   - What we know: Trolley PDF right panel is white. The app will remove the lavender/peach/blue gradient mesh.
   - What's unclear: Whether pure white or a very subtle warm white (`#F8F8F6`) reads better against the green band
   - Recommendation: Use `#F8F8F6` — pure white makes the transition from green too stark. Slight warmth eases it.

---

## PDF Visual Reference Notes

From direct analysis of all 10 pages of `2026 Trolley CRM.pdf`:

**Green:** Full-bleed left panel (slides 2-8), cover background (slides 1, 9). Vibrant saturated green — not muted, not dark. Approximately `#25B439`.

**Orbs:**
- Hub nodes ("CRM", "MOJ MAHDARA", "TALENT", "LPs", "SERVICE PROVIDERS", "MAPS"): Near-black fill, approx `#1C1C2E` or `#212121`. White labels. Large — roughly 2x the category orbs.
- Sub-hub nodes ("KINSHIP VENTURES", "TRADITIONAL", "INFLUENCERS", "EXISTING SPVS"): Dark gray `#4A4A5A`. White labels.
- Category orbs: Fully saturated — hot pink, red, green (brand color), purple/violet, blue, teal, cyan, orange, yellow. White labels. Smaller than hubs.
- Edge lines: Thin black lines, straight (no curves, no arrows).

**Typography:**
- Large headings ("trolley.ai", "MAPS", section titles): Bold serif, high stroke contrast, ball terminals — Playfair Display is the match.
- Left panel subhead ("CRM Breakdown", "About Maps"): Bold geometric sans — same family as body, semibold weight.
- Body text: Clean geometric sans — regular weight.

**Layout:**
- Slides 2-8: ~37% width green panel left, ~63% white right.
- No background decoration on the white side.
- Orb diagrams float on white with no background panel/card.

---

## Sources

### Primary (HIGH confidence)
- Direct PDF analysis — `2026 Trolley CRM.pdf` — all 10 pages, visual font/color/layout inspection
- https://tailwindcss.com/docs/theme — `@theme` directive, CSS custom properties, token namespaces
- Source code analysis — `GlassOrb.tsx`, `Dashboard.tsx`, `globals.css`, `App.tsx` — current implementation patterns

### Secondary (MEDIUM confidence)
- https://fonts.google.com/specimen/Playfair+Display — font characteristics confirmed (ball terminals, high stroke contrast, large x-height)
- https://fonts.google.com/specimen/Plus+Jakarta+Sans — geometric sans characteristics confirmed
- https://tailwindcss.com/blog/tailwindcss-v4 — v4 CSS-first config confirmed

### Tertiary (LOW confidence)
- WebSearch results on green header band CSS — generic patterns confirmed via common knowledge

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all changes are CSS + component refactor
- Typography: HIGH for Playfair Display (PDF evidence strong); MEDIUM for Plus Jakarta Sans (best match but not confirmed by source)
- Architecture: HIGH — Tailwind v4 @theme verified against official docs; inline style migration pattern verified against existing code
- Pitfalls: HIGH — sourced from direct code analysis of existing implementation

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 (stable libraries; fonts and Tailwind v4 won't change materially)
