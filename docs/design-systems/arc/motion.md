# Arc Motion Language

Arc's motion is the feature. State changes are always animated, always spring-based, and often slightly overshoot. Nothing in the product "snaps" without easing. Nothing loads without a curve.

## Principles

1. Spring, not linear. Physics-based motion tricks the eye into thinking something is real.
2. Short durations, expressive easings. Most transitions are 140-380ms. The character comes from the curve, not the length.
3. Overshoot is fine. A gentle settle past the target feels alive. Bounces ("tab pop open") are intentional.
4. Motion follows attention. Whatever the user just did should animate toward or around where they acted.
5. Reduce motion means reduce, not remove. Respect `prefers-reduced-motion` by trimming distance and disabling overshoot, not by cutting transitions entirely.

## Durations

| Token | Value | Use |
|---|---|---|
| `--arc-duration-instant` | 80ms | Press, active-state flashes |
| `--arc-duration-fast` | 140ms | Hover, focus, icon morph |
| `--arc-duration-base` | 220ms | Modal fade, tab reveal |
| `--arc-duration-slow` | 380ms | Space switch, sidebar collapse |
| `--arc-duration-slower` | 560ms | Command bar full sequence, Little Arc spawn |

## Easings (cubic-bezier approximations of spring feel)

| Token | Curve | Character | Use |
|---|---|---|---|
| `--arc-ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Smooth deceleration, no overshoot | Default enter |
| `--arc-ease-out-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Gentle overshoot | Tabs, pills, cards |
| `--arc-ease-out-bold` | `cubic-bezier(0.16, 1, 0.3, 1)` | Sharp attack, long tail | Command bar expand |
| `--arc-ease-in-soft` | `cubic-bezier(0.4, 0, 1, 1)` | Quiet exit | Fading away |
| `--arc-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetrical | Space switch slide |

## Signature transitions

### Command bar open (Cmd+T)

A multi-phase sequence. Documented parameters from a SwiftUI reproduction of Arc's search bar animation:

```
Phase 1 - Validating   0.08s  easeInOut        overlay opacity 0 -> 0.18
Phase 2 - Decrease     0.09s  spring           scale 1.0 -> 0.96, shadow 5 -> 10
Phase 3 - Increase     0.38s  easeOut          scale 0.96 -> 1.0, shadow 10 -> 70
Phase 4 - Finished     0.01s  linear           shadow 70 -> 5, overlay 0.18 -> 0
```

Total ~560ms. Reads as: flash of color, slight squeeze, then expanding glow that relaxes.

CSS approximation:

```css
@keyframes arc-command-bar-in {
  0%   { opacity: 0; transform: scale(0.96); box-shadow: 0 0 0 rgba(0,0,0,0); }
  15%  { opacity: 1; transform: scale(0.96); box-shadow: 0 4px 16px rgba(110,86,255,0.24); }
  60%  { transform: scale(1.02); box-shadow: 0 20px 80px rgba(110,86,255,0.28); }
  100% { transform: scale(1.0); box-shadow: var(--arc-shadow-lg); }
}

.arc-command-bar--entering {
  animation: arc-command-bar-in 560ms var(--arc-ease-out-bold) both;
}
```

### Tab open (sidebar)

New tab slides down from above its eventual slot, with a small spring overshoot, while existing tabs slide down to make room.

- Distance: -8px from final Y.
- Duration: 220ms.
- Easing: `--arc-ease-out-spring`.

### Tab close

Tab collapses vertically (height to 0) while neighbors slide up.

- Duration: 180ms.
- Easing: `--arc-ease-in-soft`.
- The tab does not fade - it physically vacates.

### Space switch

The entire sidebar (tabs, pinned, ambient gradient) translates horizontally by its own width, while the new Space's sidebar slides in from the opposite direction. Content pane cross-fades.

- Duration: 380ms.
- Easing: `--arc-ease-in-out`.
- Gradient color is animated as a separate CSS variable transition over the same duration.

### Hover (sidebar item, button)

Background-color only. Never transform on hover.

- Duration: 140ms.
- Easing: `--arc-ease-out-soft`.

### Press

Slight scale to 0.98 on mousedown, release on mouseup.

- Duration: 80ms down, 140ms up.
- Easing: `--arc-ease-out-soft`.

### Little Arc spawn

Miniature window appears at the cursor, scaling from 0.7 to 1.0 with a spring overshoot and fading in simultaneously.

- Duration: 320ms.
- Easing: `--arc-ease-out-spring`.
- Origin: cursor position via `transform-origin`.

### Tab peek (hover thumbnail)

After 450ms of stationary hover, a large thumbnail card fades and scales in from 0.94 to 1.0.

- Reveal duration: 220ms.
- Easing: `--arc-ease-out-soft`.
- Dismiss: 140ms fade only.

### Boost apply / strip

A brief colored wash (Space accent color, 0.18 opacity) sweeps across the active tab when a Boost applies. This is vestigial of the command bar "validation flash" - reused to confirm any destructive or magical action.

## Reduced motion

When `prefers-reduced-motion: reduce`:

- Disable overshoot. Swap `--arc-ease-out-spring` for `--arc-ease-out-soft`.
- Cut all entrance translations to 0 distance. Keep opacity.
- Cut Space switch to a cross-fade. No horizontal slide.
- Keep hover color transitions - they're assistive, not decorative.

## Performance rules

- Animate only `transform`, `opacity`, `filter`, `backdrop-filter`, `box-shadow`, and CSS variables representing color.
- Never animate `width`, `height`, `top`, `left`, `margin`.
- Use `will-change` only on elements that are currently animating; remove after.
- Prefer CSS transitions for simple state changes. Reach for JS / spring physics libraries (Framer Motion, Motion One) only for the command bar, Space switch, and Little Arc spawn.
