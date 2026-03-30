---
status: partial
phase: 16-dashboard-nurturing
source: [16-VERIFICATION.md]
started: 2026-03-30T19:30:00Z
updated: 2026-03-30T19:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dashboard widget toggle persistence
expected: Open dashboard, click gear icon, toggle a widget off, refresh page — widget remains hidden after refresh (localStorage persistence)
result: [pending]

### 2. Focus preset visual behavior
expected: Switch to Focus preset on dashboard — Equity ring, Wrapped Insights, Pod Health, and Recent Activity sections disappear immediately
result: [pending]

### 3. Nurturing Hub deep-link scroll
expected: Click "See all" on Needs Attention widget — navigates to /pulse/nurturing and scrolls to the needs attention section
result: [pending]

### 4. Record page nurturing banner
expected: Open a record page for a contact with no recent interactions — orange or red banner strip appears below header with dismissible X button. Dismissing it, refreshing, and returning — banner should reappear. Opening in new tab same session — banner stays dismissed
result: [pending]

### 5. Pipeline card avatar dot tooltip
expected: Open pipeline Kanban, hover avatar dot on an opportunity card — tooltip shows reason text (e.g. "John Doe — Overdue for contact")
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
