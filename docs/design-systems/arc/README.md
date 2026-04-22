# Arc Design System Reference

A reverse-engineered reference for designing new features in the style of Arc, the browser by The Browser Company.

Arc does not publish a formal design system. This spec distills observations from the product, marketing surfaces, interviews with the team (Josh Miller, Hursh Agrawal, Dustin Senos, Kristina Varshavskaya), help center articles, and exposed CSS custom properties. Values marked "observed" are best-effort approximations. Values marked "documented" are pulled directly from public sources.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | Copy-paste CSS custom properties for color, type, space, radius, shadow, motion |
| `brand.md` | Logo, gradient language, signature colors, voice and tone, copy patterns |
| `product-ui.md` | Product patterns: sidebar, command bar, Spaces, tabs, Boosts, Little Arc, Split View, pinned tabs, archive |
| `motion.md` | Spring feel, easings, durations, signature transitions |
| `components.md` | Buttons, inputs, cards, sidebar items, modals, tooltips |
| `principles.md` | The design mindset behind Arc: calm, playful, opinionated, command-first, spatial |

## How to use this spec

1. Read `principles.md` first. Arc is an attitude more than a palette. Every component decision should trace back to one of those five principles.
2. Use `tokens.css` as your starting variables. Load it in the `:root` of a design prototype.
3. For a new feature, work in this order:
   - Start with the `principles.md` filter: which principle does this lean on?
   - Pick the surface (sidebar, command bar, modal, Little Arc-style popover) from `product-ui.md`.
   - Compose components from `components.md`.
   - Apply motion from `motion.md` to every state change.
   - Run copy through the `brand.md` voice checklist.
4. Avoid Chrome-like conventions: top tab bars, system grays, hard drop shadows, generic modal overlays. If a pattern looks like default Chromium, rework it.

## What makes Arc Arc

The five decisions that, if you copy them, will make a feature feel like Arc:

1. Sidebar-first layout with three tab tiers (Favorites, Pinned, Today).
2. Command bar (Cmd+T) as the entry point for almost every action.
3. A personal gradient chosen by the user that bleeds into the sidebar as ambient color.
4. Spring-y, slightly overshooting motion on every state change, never linear easing.
5. Playful, sentence-case, first-person copy ("Little Arc", "Max", "Boosts", not "Quick View", "AI Assistant", "Extensions").
