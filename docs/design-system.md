# Kinship Brain — Design System

## Principles

1. **Restraint over intensity** — color should whisper, not shout. Orbs hint at their color; they don't broadcast it.
2. **Glass and light** — depth through layering, not flat fills. Three-layer radial gradients simulate real light passing through glass.
3. **Information density without overwhelm** — panels and cards show what matters, reveal more on demand.
4. **Accessibility-first** — WCAG AA minimum on all text. Use [WebAIM WAVE](https://wave.webaim.org/) for evaluation.

---

## Color

### Base Palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#F5F4F0` | App background — warm off-white |
| `bg-surface` | `rgba(255,255,255,0.54)` | Orb base layer |
| `bg-overlay` | `rgba(245,244,240,0.88)` | Panel / drawer backgrounds |
| `bg-hover` | `rgba(0,0,0,0.03)` | Row / card hover state |
| `border-subtle` | `rgba(0,0,0,0.04–0.07)` | Dividers, panel borders |
| `border-glass` | `rgba(255,255,255,0.65–0.70)` | Orb outer border |

### Text

| Token | Value | Contrast on `bg-overlay` | Usage |
|---|---|---|---|
| `text-primary` | `rgba(0,0,0,0.82)` | ~12:1 ✅ AAA | Names, headings |
| `text-secondary` | `rgba(0,0,0,0.45)` | ~5.2:1 ✅ AA | Company, subtitles |
| `text-tertiary` | `rgba(0,0,0,0.28)` | ~3.2:1 ⚠️ AA large only | Timestamps, metadata |
| `text-overdue` | `#D93025` | ~4.6:1 ✅ AA | Overdue dates |
| `text-orb` | `rgba(0,0,0,0.70)` | — | Orb labels (on glass) |

> **WCAG thresholds**: 4.5:1 for normal text (AA), 3:1 for large/bold text (AA), 7:1 for AAA.
> Tertiary text (`0.28` alpha) is borderline — only use for non-critical metadata at 11px.

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `color-overdue` | `#FF3B30` | Overdue pulse ring, dot indicator |
| `color-overdue-text` | `#D93025` | Overdue timestamp text |

### Background Atmosphere (gradient mesh)

Three subtle radial gradients composited over `#F5F4F0`. Opacities intentionally low — atmosphere, not decoration.

```
rgba(180,160,255,0.13)  top-left   — soft lavender
rgba(255,160,100,0.10)  bottom-right — warm peach
rgba(140,200,255,0.08)  top-right   — cool blue
```

---

## Typography

**Font**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) — geometric, warm, contemporary.

Loaded weights: `300`, `400`, `500`, `600` (optical size 9–40).

### Scale

| Usage | Size | Weight | Notes |
|---|---|---|---|
| Panel heading | 18px | 600 | `letter-spacing: -0.02em` |
| Contact name | 13px | 500 | |
| Orb label (list) | 9–13px | 600 | Scales with name length |
| Orb label (category) | 8–11px | 500 | |
| Company / subtitle | 11px | 400 | |
| Metadata / timestamp | 10–11px | 500 | `letter-spacing: 0.02em` |
| Section label | 11px | 400 | lowercase, no uppercase |

> No `text-transform: uppercase` on labels — use lowercase for a softer, more editorial feel.

---

## Spacing

8pt grid: `8, 16, 24, 32, 40, 48` px.

| Context | Value |
|---|---|
| Panel padding (horizontal) | 24px |
| Panel padding (top) | 28px |
| Panel row padding | 10px 20px |
| Header bottom gap | 18px |
| Contact card gap | 12px |
| Orb-to-orb radius (lists) | 310px |
| Orb-to-orb radius (categories) | 230px |

---

## Components

### Orb (glass sphere)

Three-layer radial gradient system:
1. **Specular** — `rgba(255,255,255,0.72)` at top-left 30%/22% — where light enters
2. **Refraction** — `color @ 0.12–0.14` at bottom-right — light exits tinted
3. **Ambient** — `color @ 0.07–0.08` at center — overall body hue
4. **Base** — `rgba(255,255,255,0.54–0.56)` — glass substrate

**Rule**: color layers should never exceed `0.16` opacity. Above this the orb reads as "colored" not "glass-tinted".

| Orb type | Size | Hover scale | Purpose |
|---|---|---|---|
| Moj (hub) | 116px | — | Central identity, settings |
| List | 96px | 1.06 | Navigate into a list |
| Category | 64px | 1.10 | Open contact panel |

### Panel (contact drawer)

- Width: 360px, full viewport height
- Background: `rgba(245,244,240,0.88)` + `backdrop-filter: blur(32px)`
- Enters from right: `cubic-bezier(0.87, 0, 0.13, 1)` at `0.35s`
- Exits: no animation (dismisses immediately via state)

### Contact Card

- Full-width button row, 44px min-height (Apple HIG touch target)
- Avatar: 34px circle, HSL color derived from name hash (consistent per person)
- Hover: `rgba(0,0,0,0.03)` background

---

## Motion

All easing values chosen to match [Dia browser](https://diabrowser.com) motion language.

| Token | Curve | Duration | Usage |
|---|---|---|---|
| `ease-enter` | `cubic-bezier(0.5, 1, 0.9, 1)` | 500ms | Orb entrance (orb-enter) |
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
- [ ] Interactive elements have visible focus styles (currently suppressed via `outline: none` — needs keyboard nav solution before public launch)
- [ ] Orb labels are readable — minimum 8px, `rgba(0,0,0,0.60)` on glass white
- [ ] Overdue indicators use both color AND shape (dot + text) — not color alone
- [ ] Contact panel is keyboard-navigable (tab through rows)
- [ ] `aria-label` on icon-only buttons (close ×, search ⌕)
- [ ] `role="navigation"` on breadcrumb nav

### Known gaps

| Issue | Severity | Notes |
|---|---|---|
| Orb nodes not keyboard-focusable | Medium | `nodesFocusable={false}` in ReactFlow — intentional for now, revisit |
| Close button (×) has no `aria-label` | Medium | Screen readers will read "×" literally |
| `text-tertiary` at 10px | Low | `rgba(0,0,0,0.28)` is borderline at small sizes — monitor |

---

## File Map

| Path | Purpose |
|---|---|
| `src/styles/globals.css` | Animations, orb interactions, scrollbar, grain overlay |
| `src/components/map/OrbMap.tsx` | Canvas layout, node/edge assembly, view state |
| `src/components/map/ListNode.tsx` | 96px glass sphere — list orbs |
| `src/components/map/CategoryNode.tsx` | 64px glass sphere — category orbs |
| `src/components/map/MojNode.tsx` | 116px hub orb — Moj identity node |
| `src/components/contacts/ContactPanel.tsx` | Right-side contact drawer |
| `src/components/contacts/ContactCard.tsx` | Row component inside panel |
| `src/lib/airtable.ts` | All Airtable reads/writes, in-memory cache |
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/lib/utils.ts` | `hexToRgba`, `formatRelativeTime` |
| `src/hooks/useNodePositions.ts` | localStorage position persistence |
