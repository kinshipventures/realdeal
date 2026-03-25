# Phase 2: Visual Redesign - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

App visuals aligned with Trolley CRM PDF direction. Design tokens in CSS custom properties. Dashboard, orb map, contact panels, and nav all get the Trolley treatment. Scoped to 5 specific deltas. Must be demo-ready for Gwyneth.

</domain>

<decisions>
## Implementation Decisions

### The 5 Trolley deltas
- **D-01:** Typography — serif headings (match Trolley PDF's editorial serif, closest Google Font) + matched sans-serif body text replacing DM Sans
- **D-02:** Color — green (`~#2DB83D`) as primary brand color, used for dashboard header band, nav accents, section dividers
- **D-03:** Orbs — solid opaque circles replacing glass orb system. Dark/black hub orb for Moj. Saturated colors for list and category orbs. Subtle depth (soft drop shadow or very subtle gradient, not flat).
- **D-04:** Dashboard cards — pod cards match Trolley's list representation treatment. Equity ring gets a new gradient harmonized with the green palette (green-to-teal or similar). All sections get visual refresh, not selective.
- **D-05:** Design tokens — all colors, typography, spacing, and orb constants defined as CSS custom properties. No inline magic values.

### Typography
- **D-06:** Headings use a bold editorial serif matching the Trolley PDF (high stroke contrast, ball terminals — likely Playfair Display or closest match). Used for panel titles, section headings, dashboard headings.
- **D-07:** Body text switches from DM Sans to a sans-serif matching the Trolley PDF's body font. Full font alignment with the PDF.
- **D-08:** Loaded via Google Fonts. Weights TBD during implementation based on closest match.

### Brand color
- **D-09:** Green is the primary brand color, used the same way the PDF uses it — full-panel backgrounds, section headers, dividers.
- **D-10:** Dashboard gets a green header band (top section with equity score + stats), rest of dashboard on white/light background.
- **D-11:** Nav pill active state uses green.
- **D-12:** Background shifts from warm off-white `#F5F4F0` to match Trolley's palette (white or near-white body, green panels).

### Orb map
- **D-13:** Glass orb system is replaced entirely. No more three-layer radial gradients, no `0.16` opacity ceiling. Solid fills with pod/category colors.
- **D-14:** Moj hub orb becomes dark/black, matching the Trolley PDF's hub nodes (CRM, Moj Mahdara).
- **D-15:** Size hierarchy slightly exaggerated from current (116/96/64) — hub gets larger, categories stay similar or slightly smaller. Exact sizes at Claude's discretion.
- **D-16:** Subtle depth on orbs — soft drop shadow or very subtle gradient. Not completely flat, but not glass.
- **D-17:** Edge/connection lines stay as straight lines between orbs (matches Trolley PDF).

### Dashboard surface treatment
- **D-18:** Green header band for top row (equity ring + stats). Remaining sections on light/white background.
- **D-19:** All dashboard sections get visual refresh — pod cards, today's focus, needs attention, dormant cleanup. No section left in the old style.
- **D-20:** Pod health cards match Trolley's treatment for list representations.
- **D-21:** Equity ring gradient updated to harmonize with green brand — green-to-teal or similar palette-matched gradient replacing the current orange-to-purple.

### Contact panels
- **D-22:** Contact panels (right-side drawer) are IN SCOPE — they get the new typography, colors, and card treatment for a consistent experience.

### Navigation
- **D-23:** Floating pill nav gets green active state indicator. Inactive tab stays subtle.

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

</decisions>

<specifics>
## Specific Ideas

- "I'm going to do whatever Trolley is doing, that vision and that PDF" — full alignment, not cherry-picking
- "Let's do it just like how Charlie's doing it. The same way the green's being used in the PDF. Let's use it in the app."
- "I think green is the primary brand. Check the PDF just to be sure, but most likely I just want to use verbatim what they gave me."
- Pod cards should "match Trolley exactly" — replicate the PDF's treatment for list representations
- Orb sizing "exaggerate it a little bit more" from current ratios but not necessarily 3x — slightly more dramatic hierarchy

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual north star
- `2026 Trolley CRM.pdf` — The visual reference. 10-page deck showing orb diagrams, green brand panels, serif headings, solid colored circles. Every visual decision in this phase references this PDF.

### Design system (to be updated)
- `docs/design-system.md` — Current token set, typography, spacing, glass orb rules, motion curves. This document gets rewritten to reflect the Trolley-aligned design system.

### Orb map implementation
- `src/components/map/GlassOrb.tsx` — Current glass orb component. Three-layer radial gradient system being replaced with solid fills.
- `src/components/map/OrbMap.tsx` — Canvas layout, node/edge assembly, view state. Node sizes defined here.
- `src/components/map/ListNode.tsx` — 96px list orbs (size changing)
- `src/components/map/CategoryNode.tsx` — 64px category orbs
- `src/components/map/MojNode.tsx` — 116px hub orb (going dark, size increasing)

### Dashboard
- `src/components/dashboard/Dashboard.tsx` — All dashboard sections: EquityRing, StatBlock, PodCard, FocusCard, OverdueRow, DormantRow. All inline styles being converted to design tokens.

### Contact panels
- `src/components/contacts/ContactPanel.tsx` — Right-side drawer
- `src/components/contacts/ContactDetail.tsx` — Full contact view
- `src/components/contacts/ContactCard.tsx` — Row component

### Navigation
- `src/components/App.tsx` — Routes, floating pill nav, background gradient

### Styles
- `src/styles/globals.css` — Animations, orb interactions, scrollbar, grain overlay

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EquityRing` in Dashboard.tsx — SVG arc with gradient. Gradient colors and stroke need updating.
- `PANEL` style constant in Dashboard.tsx — shared glass panel style. Will be replaced with new surface tokens.
- `Avatar` in ui.tsx — HSL color derived from name hash. May need palette adjustment.

### Established Patterns
- Inline styles throughout Dashboard.tsx — all using magic values (`rgba(0,0,0,0.82)`, `rgba(245,244,240,0.88)`, etc.). Phase converts these to CSS custom properties.
- `GlassOrb.tsx` encapsulates all orb rendering — single component to replace/refactor for solid orbs.
- Node sizes are constants in ListNode/CategoryNode/MojNode — straightforward to update.
- Background gradient mesh in App.tsx (three radial gradients) — will change or be removed.

### Integration Points
- `GlassOrb.tsx` props (size, color, glow, label) — new solid orb component should maintain same prop interface for minimal node component changes
- `PANEL` constant used across Dashboard.tsx — extract to CSS custom property for consistent surface treatment
- `globals.css` `.orb-interactive` class — hover/press interactions may need updating for solid orbs
- Google Fonts loaded in `index.html` — add new serif + sans fonts, remove DM Sans

</code_context>

<deferred>
## Deferred Ideas

- Dark mode / theme switching — future, not Phase 2 scope
- Animated orb transitions (morph from glass to solid) — unnecessary, just ship the new style
- Custom Trolley font licensing (if PDF uses a non-Google font) — use closest Google Font match instead
- Orb map physics/force layout — separate feature, not a visual redesign item

</deferred>

---

*Phase: 02-visual-redesign*
*Context gathered: 2026-03-22*
