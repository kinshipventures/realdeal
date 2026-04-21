# Real Deal - Shell Board

## Current Reference

- Live current capture: [/tmp/realdeal-current.png](/tmp/realdeal-current.png)
- Shell source:
  - [src/App.tsx](/Users/gabrielmurray/dev/realdeal/src/App.tsx)
  - [src/components/nav/Sidebar.tsx](/Users/gabrielmurray/dev/realdeal/src/components/nav/Sidebar.tsx)
  - [src/index.css](/Users/gabrielmurray/dev/realdeal/src/index.css)

## What The Current Shell Already Gets Right

- the app feels light and clean
- the left rail is simple and easy to understand
- spacing is generous
- the main home screen already hints at a calmer product direction
- there is enough softness in the surfaces to build on

## What The Shell Is Missing

- one stronger product frame around the whole app
- a more distinctive left rail
- a more deliberate relationship between nav and page content
- a clearer top-of-page pattern across screens
- more consistency from one screen to the next

## Current Anatomy

### Left Rail

- fixed
- white glass-like background
- light border
- simple icon + label nav items
- collapsible from 220 to 56

### Main Canvas

- content just starts after left padding
- pages mostly define their own top spacing and width
- the shell steps back too far once the content begins

### Tokens In Use

- background: `#F5F4F0`
- brand green: `#34B15D`
- nav background: `rgba(255,255,255,0.92)`
- panel surface: `rgba(255,255,255,0.92)`
- edge: `rgba(0,0,0,0.08)`
- serif: Fraunces
- body: Plus Jakarta Sans

## Keep

- the calm light background
- the left rail as the primary nav pattern
- the soft surface treatment
- the app feeling airy instead of cramped
- the mix of serif display and sans body

## Change

### Left Rail

- make it feel more intentional and more branded
- let green frame the rail instead of just appearing as a small active accent
- reduce the feeling that it is just a generic app sidebar

### Page Frame

- give every main page a more consistent top frame
- make content feel nested inside the shell
- stop relying on each page to invent its own opening

### Shell Contrast

- keep neutral reading surfaces
- use restrained green framing around the rail and top shell moments
- keep the strongest color away from every card body

## Target Direction

### Shell Idea

Green-framed shell, neutral reading surfaces.

### Left Rail Direction

- softer green-tinted shell
- stronger sense of depth than the current flat white rail
- active state should feel held by the rail, not just highlighted inside it

### Main Content Direction

- a consistent top frame before page-specific content starts
- stronger max-width discipline
- content should feel placed into the product, not dropped onto a blank page

## Rules For The Redesign

- green should frame, not flood
- the rail should carry more identity
- the first 15 percent of every page should feel consistent
- the content area should stay calmer than the shell
- the shell should make the app feel premium before any individual widget does

## First Build Moves

1. Redesign the left rail surface and active states.
2. Add a consistent top content frame pattern.
3. Unify page width and page padding rules.
4. Shift green toward shell framing and away from card fill.

## Done / Not Done

- Done: shell direction is defined
- Not done: live shell redesign in the app
