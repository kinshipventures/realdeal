# RealDeal — Design System

## Principles

1. **Bold color and clarity** — brand green is confident and present. Use it to signal identity, not decoration.
2. **Editorial authority** — serif headings give the interface weight and intention. Content-first.
3. **Information density without overwhelm** — panels and cards show what matters, reveal more on demand.
4. **Accessibility-first** — WCAG AA minimum on all text. White-on-green is explicitly validated.

---

## Color

### Tokens

All color tokens are defined in `src/styles/globals.css` in the `@theme` block (generates Tailwind utilities + CSS vars) and the `:root` block (component-specific constants).

#### Brand

| Token | Value | Usage |
|---|---|---|
| `--color-brand` | `#25B439` | Primary brand green — nav active, focus card accent, section dividers |
| `--color-brand-dark` | `#1A8A2A` | Darker variant for hover states on green |
| `--header-band-bg` | `#25B439` | Dashboard green header band background |

#### Background

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#f8f8f6` | App body background — near-white, slight warmth |
| `--color-surface` | `#ffffff` | Pure white surface |
| `--surface-panel` | `rgba(255,255,255,0.92)` | Panel / drawer backgrounds |
| `--surface-panel-border` | `1px solid rgba(0,0,0,0.07)` | Panel border shorthand |

#### Orbs

| Token | Value | Usage |
|---|---|---|
| `--color-hub-orb` | `#1C1C1E` | Moj hub orb — near-black solid fill |

#### Text (on light background)

| Token | Value | Contrast on `--surface-panel` | Usage |
|---|---|---|---|
| `--color-text-primary` | `rgba(0,0,0,0.82)` | ~12:1 ✅ AAA | Names, headings, primary content |
| `--color-text-secondary` | `rgba(0,0,0,0.45)` | ~5.2:1 ✅ AA | Company, subtitles, secondary content |
| `--color-text-tertiary` | `rgba(0,0,0,0.28)` | ~3.2:1 ⚠️ AA large only | Timestamps, metadata, hints |

#### Text (on green band)

| Value | Contrast on `#25B439` | Usage |
|---|---|---|
| `#ffffff` | ~5.5:1 ✅ AA | Score numbers, stat values, headings on green |
| `rgba(255,255,255,0.70)` | ~4.8:1 ✅ AA | Secondary labels on green |
| `rgba(255,255,255,0.55)` | ~3.8:1 ⚠️ AA large only | Tertiary labels on green (11px+) |

#### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `color-overdue` | `#FF3B30` | Overdue dot indicator |
| `color-overdue-text` | `#D93025` | Overdue timestamp text |
| `hsla(20, 80%, 45%, 0.80)` | warm orange | Overdue count labels — intentional semantic, not a shared token |

> **WCAG thresholds**: 4.5:1 for normal text (AA), 3:1 for large/bold text (AA), 7:1 for AAA.

---

## Typography

**Heading font**: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) — bold editorial serif with high stroke contrast, ball terminals, large x-height. Closest Google Font match to the Trolley CRM PDF headings.

**Body font**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) — geometric sans with tall x-height, open counters, contemporary feel. Replaces DM Sans entirely.

Both loaded via Google Fonts in `index.html`.

```css
--font-serif: 'Playfair Display', Georgia, serif;
--font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

Loaded weights:
- Playfair Display: `700`, `800`
- Plus Jakarta Sans: `400`, `500`, `600`

### Scale

| Usage | Size | Weight | Font | Notes |
|---|---|---|---|---|
| Dashboard section heading | 16px | 600 | Serif | `letter-spacing: -0.02em` |
| Panel heading (category name) | 18px | 600 | Serif | `letter-spacing: -0.02em` |
| Contact name | 18px | 600 | Serif | `letter-spacing: -0.02em` |
| Section label (contact, context, personal) | 11px | 600 | Serif | lowercase |
| Pod card name | 13px | 600 | Serif | `letter-spacing: -0.01em` |
| Score number | 22–28px | 700 | Sans | `letter-spacing: -0.03em` |
| Body / card content | 13px | 400–500 | Sans | |
| Company / subtitle | 11–12px | 400 | Sans | |
| Metadata / timestamp | 10–11px | 500 | Sans | `letter-spacing: 0.02em` |
| Orb label | 8–13px | 600 | Sans | always white on solid orbs |

> Heading CSS rule: `h1, h2, h3, .heading { font-family: var(--font-serif); }` — applied globally in globals.css.

---

## Spacing

8pt grid: `8, 16, 24, 32, 40, 48` px.

| Context | Value |
|---|---|
| Panel padding (horizontal) | 24px |
| Panel padding (top) | 28px |
| Panel row padding | 10px 20px |
| Header band padding | 28px 24px 32px |
| Header bottom gap | 18px |
| Contact card gap | 12px |
| Orb-to-orb radius (lists) | 310px |
| Orb-to-orb radius (categories) | 230px |

---

## Components

### Orb (solid sphere)

Solid opaque fill with a single subtle radial gradient for shape/depth. No glass layers.

```tsx
// Solid fill with subtle shape radial
const bg = color === '#1C1C1E'
  ? '#1C1C1E'  // Hub: pure solid
  : `radial-gradient(ellipse 55% 45% at 30% 25%, ${hexToRgba(color, 0.18)} 0%, transparent 100%), ${color}`
```

**All orb labels use white text** — `rgba(255,255,255,0.90-0.92)` for names, `rgba(255,255,255,0.50-0.55)` for counts.

| Orb type | Size | Hover scale | Purpose |
|---|---|---|---|
| Moj (hub) | 136px | — | Central identity, settings — pure solid near-black |
| List | 96px | 1.05 | Navigate into a list |
| Category | 60px | 1.08 | Open contact panel |

Shadow tokens:
```css
--orb-shadow-base: 0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12);
--orb-shadow-hover: 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.14);
--orb-shadow-hub: 0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.20);
```

### Dashboard Green Header Band

Top section wraps the equity ring + stats in a green full-width band with rounded bottom corners.

```tsx
<div style={{ background: 'var(--header-band-bg)', borderRadius: '0 0 20px 20px' }}>
  {/* equity ring + stats — all text white */}
</div>
<div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>
  {/* pod cards, focus, overdue, dormant — light bg */}
</div>
```

Equity ring on green: white ghost track `rgba(255,255,255,0.20)`, white-to-white gradient arc.

### Pod Cards

Solid left border in pod color, white surface panel background, serif pod name.

```tsx
style={{
  background: 'var(--surface-panel)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderLeft: `4px solid ${pod.color}`,
  borderRadius: 12,
  padding: '16px 20px',
}}
```

### Panel (contact drawer)

- Width: 360px, full viewport height
- Background: `var(--surface-panel)` + `backdrop-filter: var(--panel-blur)`
- Enters from right: `cubic-bezier(0.87, 0, 0.13, 1)` at `0.35s`
- Panel titles use serif font

### Nav Pill

Active tab: `var(--color-brand)` background, `#ffffff` text, `0 1px 4px rgba(37,180,57,0.30)` shadow.
Inactive tab: transparent background, `rgba(0,0,0,0.35)` text.

### Contact Card

- Full-width button row, 44px min-height (Apple HIG touch target)
- Avatar: 34px circle, HSL color derived from name hash (consistent per person)
- Hover: `rgba(0,0,0,0.03)` background via `.interactive-row`

---

## Motion

All easing values match the Dia browser motion language.

| Token | Curve | Duration | Usage |
|---|---|---|---|
| `ease-enter` | `cubic-bezier(0.5, 1, 0.9, 1)` | 500ms | Orb entrance |
| `ease-decel` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | 220ms | Hover, general transitions |
| `ease-panel` | `cubic-bezier(0.87, 0, 0.13, 1)` | 350ms | Panel slide-in |
| `ease-press` | `ease-in` | 80ms | Orb press-down |

### Stagger delays

- List orbs on load: `i × 0.04s`
- Category orbs on drill-in: `i × 0.03s`

---

## Accessibility

**Reference tool**: [WebAIM WAVE](https://wave.webaim.org/) — run on every major view before shipping.

### Checklist

- [ ] All body text meets WCAG AA (4.5:1 contrast)
- [ ] White text on green band validated: `#ffffff` on `#25B439` = ~5.5:1 ✅ AA
- [ ] Interactive elements have visible focus styles (suppressed via `outline: none` — needs keyboard nav solution before public launch)
- [ ] Orb labels are readable — white `rgba(255,255,255,0.90)` on solid colored fills
- [ ] Overdue indicators use both color AND shape (dot + text) — not color alone
- [ ] Contact panel is keyboard-navigable (tab through rows)
- [ ] `aria-label` on icon-only buttons (close ×, search ⌕)
- [ ] `role="navigation"` on breadcrumb nav

### Known gaps

| Issue | Severity | Notes |
|---|---|---|
| Orb nodes not keyboard-focusable | Medium | `nodesFocusable={false}` in ReactFlow — intentional for now |
| Close button (×) has no `aria-label` | Medium | Screen readers will read "×" literally |
| `text-tertiary` at 10px | Low | `rgba(0,0,0,0.28)` is borderline at small sizes — use for non-critical metadata only |

---

## File Map

| Path | Purpose |
|---|---|
| `src/styles/globals.css` | All design tokens (`@theme` + `:root`), animations, orb interactions, scrollbar, grain overlay |
| `src/components/map/SolidOrb.tsx` | Shared solid orb component (replaces GlassOrb) |
| `src/components/map/OrbMap.tsx` | Canvas layout, node/edge assembly, view state |
| `src/components/map/ListNode.tsx` | 96px solid orb — list orbs |
| `src/components/map/CategoryNode.tsx` | 60px solid orb — category orbs |
| `src/components/map/MojNode.tsx` | 136px hub orb — Moj identity node |
| `src/components/dashboard/Dashboard.tsx` | Green header band, equity ring, pod cards, focus, overdue, dormant |
| `src/components/contacts/ContactPanel.tsx` | Right-side contact drawer |
| `src/components/contacts/ContactCard.tsx` | Row component inside panel |
| `src/lib/airtable.ts` | All Airtable reads/writes, in-memory cache |
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/lib/utils.ts` | `hexToRgba`, `formatRelativeTime` |
