# Real Deal - Shell Variants

## Goal

Define the shared app frame before changing any live screen.

## Current Baseline

- left rail is clean but generic
- content starts after padding and then every page does its own thing
- green exists, but mostly as an accent instead of a framing language

## Variant A - Framed Rail

### Idea

Keep the current app structure, but make the left rail and page opening feel more designed.

### Moves

- keep the current fixed rail width behavior
- add a soft green-tinted rail background
- add a stronger active state with a held-in surface, not just a light row fill
- introduce one shared top content frame across pages

### Pros

- lowest risk
- easiest to apply across the app
- keeps the current Real Deal feel intact

### Cons

- may still feel a little too safe
- does not push the product shell far enough

## Variant B - Nested Workspace

### Idea

Make the app feel like content lives inside a framed workspace.

### Moves

- rail gets a green-tinted shell and slightly stronger visual depth
- main content sits inside a softer inner frame with clearer top padding
- all core pages begin with a shared top band zone before page-specific content
- neutral reading surfaces stay inside the workspace

### Pros

- strongest fit for "green framing + calm reading surfaces"
- feels more premium
- gives the app one real shell

### Cons

- requires more shell cleanup
- more noticeable shift from the current generic page-body feel

## Variant C - Editorial Strip

### Idea

Use a strong top strip across every page and keep the rest of the shell more minimal.

### Moves

- keep the rail close to current
- put more of the brand framing in a green top strip and page opener
- page bodies stay mostly neutral and simple

### Pros

- strong page identity
- less rail work

### Cons

- weaker than B as a full product shell
- risks feeling like branding layered on top of unchanged pages

## Recommendation

Pick Variant B.

It is the clearest version of:
- green-framed shell
- neutral content surfaces
- one designed environment

## Build Notes

- use A as the fallback if B feels too disruptive
- borrow C only for the top-page opening logic, not as the whole shell strategy
