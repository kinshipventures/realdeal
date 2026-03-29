---
status: testing
phase: 08-ui-enrichment
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 07-02-SUMMARY.md]
started: 2026-03-26T21:30:00.000Z
updated: 2026-03-26T21:30:00.000Z
---

## Current Test

number: 1
name: Dashboard loads with real data
expected: |
  Open https://mojrm.vercel.app — dashboard shows the equity score ring, pod health cards for LPs/MAPS/MAPS Lite/Talent/Service Providers, and contact data from the 25 imported contacts.
awaiting: user response

## Tests

### 1. Dashboard loads with real data
expected: Dashboard shows equity ring, pod health cards with real contact counts from the 25 imported dummy contacts. Pods visible: LPs, MAPS, MAPS Lite, Talent & Influencers, Services for Founders.
result: [pending]

### 2. Recent Activity section
expected: Dashboard shows a "Recent Activity" section with the last 5 interactions across all contacts. Each row shows a type icon, contact name, date, and summary text.
result: [pending]

### 3. Enhanced Upcoming section
expected: "Upcoming" section shows both birthdays (Priya Mehta Apr 3, Alex Fontaine Apr 8, Nadia Bloom Apr 18) AND follow-ups due this week (Devon Chase Mar 26, Marco Delgado Mar 26, Damien Okafor Mar 27) in one combined list.
result: [pending]

### 4. Who Needs Attention — per-contact frequency
expected: "Needs Attention" shows overdue contacts based on their individual Contact Frequency, not just pod cadence. Serena Voss (Monthly, last contacted Jan 14) and Layla Hassan (Monthly, last contacted Dec 5) should appear as overdue.
result: [pending]

### 5. Contact card — Contact Info section
expected: Open any contact (e.g., Alex Fontaine). Contact Info section shows LinkedIn URL, City/Country (Los Angeles, United States), Global Region (AMER), Birthday (Apr 8), Gender (Non-binary).
result: [pending]

### 6. Contact card — Relationship section
expected: Same contact shows Relationship section with Introduced By, Relationship Owner (Moj Mahdara), Contact Frequency (Weekly), and Intel/Notes prominently displayed.
result: [pending]

### 7. Contact card — Timeline with source labels
expected: Interaction timeline entries show source labels — "Gmail", "Granola", or "Manual" — alongside the type and date. Summary text is visible inline.
result: [pending]

### 8. Contact card — Fund Tags (conditional)
expected: Open Priya Mehta (LP) — Fund Tags section shows "KV Fund Investor: Fund I" and "SPV Investor: Lovable". Open Juno Park (Maps) — no Fund Tags section visible (hidden when empty).
result: [pending]

### 9. Contact card — Next Follow-Up bar
expected: Open Devon Chase — Next Follow-Up bar pinned at bottom shows "Mar 26 · Intro to Amara Diallo at Kinetic Health". Open a contact without follow-up — no bar visible.
result: [pending]

### 10. Add Contact — structured entry
expected: Click the "+" FAB on dashboard. Modal opens with "Add Contact" mode. Fill First Name, Last Name, Email, select a Pod. Submit — contact appears in the app.
result: [pending]

### 11. Add Contact — brain dump
expected: In the Add Contact modal, switch to "Quick Note" mode. Type free text like "Sarah Russell, Eight Sleep, met at Upfront". Submit — creates contact in Unsorted pod with Needs Review flag.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0
blocked: 0

## Gaps

[none yet]
