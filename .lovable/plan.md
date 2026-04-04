

# Phase 3: Import Flow Polish

## Current State

The import flow works but feels like a developer tool - a single flat page with all options visible at once. No guidance for first-time users, no step indicators, and the upload/preview/import states just swap content abruptly.

## What Changes

Redesign ImportPanel as a guided stepper flow with 3 clear steps, animated transitions, and contextual help text. Keep the same underlying logic (`csvImport.ts` unchanged).

## Steps

### Step 1: Upload
- Add a numbered step indicator bar at the top (1. Upload - 2. Configure - 3. Import)
- Add a brief welcome line: "Import contacts from a CSV file. We'll match your columns automatically."
- Keep drag-and-drop zone but add a sample CSV download link ("Need a template?") that generates a minimal CSV with expected headers
- Add file size validation (warn if > 5MB)

### Step 2: Configure (replaces "preview")
- Step indicator advances to step 2
- Show file name with a "Change file" button (resets to step 1)
- Record type selector with short descriptions ("Contacts - People you know" / "Companies - Organizations")
- Pod selector with empty-state message if no pods exist ("Create a pod first")
- Column mapping with green checkmarks for matched columns, amber for skipped
- Collapsible preview table (collapsed by default, "Preview 5 rows" toggle)
- Validation summary card at bottom: "X ready, Y will be skipped (no name)" with clear iconography

### Step 3: Import + Results
- Progress bar with percentage label and estimated time remaining
- Live counter: "Imported X / Skipped Y"
- On completion, show a results card with success icon, counts, and any errors in a collapsible section
- "View in Pods" button navigates to `/pods`, "Import Another" resets

## Design

- Calm, minimal - aligned with existing design tokens
- Subtle fade transitions between steps (200ms opacity)
- Step indicator uses small numbered circles with connecting lines
- Active step is brand green, completed steps have a checkmark, future steps are grey

## Files Modified

- `src/components/import/ImportPanel.tsx` - full rewrite of the render section; state machine and handlers stay mostly the same, add step indicator component inline, add template download helper, add estimated time calculation

## Technical Details

- Add `step` derived from `state`: upload=1, preview=2, importing/done=3
- Template CSV: `generateTemplate()` creates a Blob with headers (Name, Email, Phone, Company, Role, Location) and one example row
- Estimated time: `(remaining * 250ms)` based on avg per-row time from progress updates
- No new files needed - all changes in ImportPanel.tsx

