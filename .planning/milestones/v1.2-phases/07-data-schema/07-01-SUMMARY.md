---
phase: 07-data-schema
plan: 01
status: complete
started: 2026-03-26T20:40:00.000Z
completed: 2026-03-26T20:46:00.000Z
requirements-completed: [DATA-03]
---

# Plan 07-01: Expand Airtable Schema & Create Pods

## What was built

Expanded the Airtable schema to match Briell's V1 spec and ensured all 6 pods exist.

## Key changes

### Contacts table (tbll75mRMMVBGiNpj) — 16 new fields
- First Name, Last Name (singleLineText)
- LinkedIn (url)
- Country (singleSelect: 12 countries)
- Global Region (singleSelect: AMER/APAC/ME/LATAM/EU)
- Gender (singleSelect: Male/Female/Non-binary/Other)
- Birthday (singleLineText — "Nov 12" format)
- Introduced By, Relationship Owner, Next Action (singleLineText)
- Intel / Notes (multilineText)
- Contact Frequency (singleSelect: Weekly/Monthly/Quarterly/Annual/As Needed)
- Next Follow-Up Date (date)
- KV Fund Investor (multipleSelects: Fund I/Fund II)
- SPV Investor (multipleSelects: 10 options)
- Needs Review (checkbox)

### Interactions table (tblbxLX5EM09Y6xim) — 4 new fields
- Summary (multilineText)
- Source (singleSelect: Gmail/Granola/Manual)
- Email Link, Granola Link (url)

### Lists table (tblnsxNUscKApvMsV) — 1 new field + 1 new record
- Cadence (singleSelect: weekly/biweekly/monthly/quarterly) added
- Cadence values set on all 5 existing pods
- "Unsorted" pod created (recGR6AQTq1ceL1yq)

### Pod record IDs
- LPs: recqkgZAzBab2icWP
- MAPS: recR2WivtqJEc5oB2
- MAPS Lite: recA46JFn7fAMPO1x
- Talent & Influencers: recMuRc6bROyXnir1
- Services for Founders: recNqFuuXDQU25KKr
- Unsorted: recGR6AQTq1ceL1yq

## Self-Check
All fields verified via Airtable MCP list_tables_for_base.
