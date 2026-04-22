# Arc Components

Every component assumes `tokens.css` is loaded. Values reference Arc tokens directly.

## Buttons

### Primary

Used for the single most important action on a surface. One per context.

```css
.arc-button--primary {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--arc-radius-pill);
  background: var(--arc-brand-blue);
  color: #fff;
  font: var(--arc-weight-medium) var(--arc-text-base)/1 var(--arc-font-ui);
  letter-spacing: var(--arc-tracking-snug);
  border: none;
  box-shadow: var(--arc-shadow-sm);
  transition: var(--arc-transition-hover), var(--arc-transition-press);
}
.arc-button--primary:hover { filter: brightness(1.08); }
.arc-button--primary:active { transform: scale(0.98); }
.arc-button--primary:focus-visible { box-shadow: var(--arc-focus-ring); }
```

### Secondary

Inline with primary. Lower contrast, same pill shape.

- Background: `var(--arc-palette-hover)`.
- Color: `var(--arc-palette-foreground-primary)`.
- Otherwise identical to primary.

### Ghost

Toolbar actions, icon buttons. Transparent until hovered.

- Background: transparent.
- Hover: `var(--arc-palette-hover)`.
- Radius: `var(--arc-radius-sm)`.
- Size: 28px x 28px for icon-only.

### Destructive

Same shape as primary. Background `var(--arc-brand-red)`. Used only for irreversible actions.

### Button sizes

| Size | Height | Padding x | Text |
|---|---|---|---|
| sm | 24px | 10px | var(--arc-text-sm) |
| md | 32px | 14px | var(--arc-text-base) |
| lg | 40px | 18px | var(--arc-text-md) |

## Inputs

### Text input

```css
.arc-input {
  height: 32px;
  padding: 0 12px;
  background: var(--arc-palette-background-extra);
  border: var(--arc-border-subtle);
  border-radius: var(--arc-radius-md);
  font: 400 var(--arc-text-base)/1.2 var(--arc-font-ui);
  color: var(--arc-palette-foreground-primary);
  transition: var(--arc-transition-hover), box-shadow var(--arc-duration-fast) var(--arc-ease-out-soft);
}
.arc-input:hover { border-color: rgba(0,0,0,0.14); }
.arc-input:focus {
  outline: none;
  border-color: var(--arc-brand-blue);
  box-shadow: var(--arc-focus-ring);
}
.arc-input::placeholder { color: var(--arc-palette-foreground-tertiary); }
```

### Command input

Oversized, borderless, feels like a thought, not a form field.

- Height: 56px.
- Padding: 0 20px.
- Font: `--arc-text-lg`, weight 400.
- Background: transparent (parent provides the glass).
- No border. No focus ring. Cursor only.
- Leading icon: 20px, morphs with input mode (search glass -> globe -> sparkle).

### Toggle / switch

Pill-shaped track with spring handle.

- Track: 28px wide x 16px tall, `--arc-radius-pill`.
- Handle: 12px circle, 2px inset, white, `--arc-shadow-sm`.
- On: track `--arc-brand-blue`.
- Transition: 220ms `--arc-ease-out-spring`.

## Cards

Used sparingly. Arc resists the "default card grid". When a card is right, it's either a sidebar item or a Library thumbnail.

### Thumbnail card (tab peek, Library)

- Background: `var(--arc-palette-background-extra)`.
- Border: `var(--arc-border-hairline)`.
- Radius: `var(--arc-radius-lg)`.
- Shadow: `var(--arc-shadow-md)`.
- Inner padding: 0 (image is edge-to-edge); caption bar uses 10px padding.
- Hover: shadow lifts to `--arc-shadow-lg` with 220ms transition.

## Sidebar item

Most-used component in Arc. Must feel tight, responsive, and grippable.

```css
.arc-sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--arc-sidebar-item-height); /* 30px */
  padding: 0 var(--arc-sidebar-item-padding-x); /* 10px */
  border-radius: var(--arc-radius-sm);
  font: var(--arc-weight-regular) var(--arc-text-sm)/1 var(--arc-font-ui);
  color: var(--arc-palette-foreground-primary);
  transition: var(--arc-transition-hover);
  cursor: default;
  user-select: none;
}
.arc-sidebar-item:hover { background: var(--arc-sidebar-surface-hover); }
.arc-sidebar-item[data-state="active"] {
  background: var(--arc-sidebar-surface-active);
  font-weight: var(--arc-weight-medium);
  box-shadow: var(--arc-shadow-sm);
}
.arc-sidebar-item__favicon { width: 16px; height: 16px; border-radius: 4px; flex: none; }
.arc-sidebar-item__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

## Modals

Arc avoids classical modals. When one is necessary, it behaves like the command bar: floating, centered, blurred.

- Container: `--arc-radius-xl`, `--arc-shadow-xl`, `--arc-blur-modal`.
- Backdrop: `rgba(0, 0, 0, 0.28)` with 180ms fade.
- Width: content-driven, max 520px for dialogs, 720px for richer flows.
- Padding: 24px (dialog) or 32px (rich).
- Title: `--arc-text-xl`, weight 600, `--arc-tracking-tight`.
- Body: `--arc-text-base`, weight 400, `--arc-leading-normal`.
- Actions: bottom-right, primary + secondary. Never three buttons.

## Tooltips

- Background: `rgba(25, 25, 28, 0.92)` (light mode) or `rgba(255,255,255,0.08)` (dark).
- Text: 12px, weight 500, white or near-white.
- Radius: `--arc-radius-sm`.
- Padding: 6px 10px.
- Keyboard hint: right-aligned, weight 400, color 0.6 alpha.
- Appear delay: 450ms. Dismiss: instant on pointer leave.
- Motion: fade + 4px translate from origin, 140ms.

## Dropdowns / context menus

- Material: `--arc-blur-modal` glass.
- Radius: `--arc-radius-md`.
- Shadow: `--arc-shadow-lg`.
- Min width: 200px.
- Rows: 32px tall, 10px horizontal padding, 12px gap between icon and label.
- Separator: 1px line, `--arc-sidebar-divider`, 4px vertical margin.
- Destructive row: text in `--arc-brand-red`.
- Entry: 140ms fade + 4px translate from trigger edge.

## Tabs (intra-surface, not browser tabs)

When you need tabs inside a modal or page (settings, Library categories), use a soft pill tab bar.

- Container: horizontal row, `--arc-palette-hover` background, `--arc-radius-pill`, 4px padding.
- Item: 28px tall, 12px horizontal padding, `--arc-radius-pill`.
- Active: background `--arc-palette-background-extra`, `--arc-shadow-sm`.
- Transition: background 220ms `--arc-ease-out-soft`.

## Status pill

Used inline for meta labels ("beta", "live", "new"). The status pill in Arc even picks up the sidebar theme on hover.

- Height: 20px, padding 0 8px, `--arc-radius-pill`.
- Font: 11px, weight 600, `--arc-tracking-wide`, uppercase.
- Default: `--arc-palette-hover` bg, `--arc-palette-foreground-secondary` text.
- Live / new: `--arc-brand-red` bg, white text.
- On theme: background shifts to a translucent version of the Space accent.

## Segmented control

Binary or ternary choice, pill style.

- Same shape as intra-surface tabs but with only 2-3 items and no scroll.

## Avatar / favicon

- Sizes: 14px (badge), 16px (sidebar), 20px (header), 28px (profile), 40px (Space dot large).
- Shape: `--arc-radius-sm` for favicons, circle for people.
- Fallback: first letter on a gradient derived from a hash of the site name.

## Divider

1px line, `--arc-sidebar-border`. Prefer spacing over dividers. If you're reaching for a divider, you probably need more whitespace instead.

## Empty state

- Central illustration or single icon at 32-48px, low opacity (0.5) in mono.
- One line of copy, sentence case, warm.
- One CTA max. Ghost button, never primary.

## Focus ring

A single, chunky, colored focus halo. Never the browser default.

```css
:focus-visible {
  outline: none;
  box-shadow: var(--arc-focus-ring);
}
```
