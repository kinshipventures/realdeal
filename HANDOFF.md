# Kinship Brain — Handoff Guide

*Last updated: March 2026. Written for Briell and Moj.*

---

## Overview

*For Moj — a quick summary of where things stand.*

**What Kinship Brain is**

Kinship Brain is Moj's relationship intelligence app — not a CRM. It's a visual tool for staying invested in her network, tracking who needs attention, and building the micro-habits of giving that are core to her approach. Contacts live in pods (groupings like LP Network, Talent), organized into categories. Every interaction logged — a call, email, intro, meeting — contributes to an equity score that tells Moj whether a relationship is thriving, healthy, cooling, or dormant.

**What's built and working**

- Dashboard (called "Pulse") with overall health score, overdue contacts, and today's focus list
- Visual map of all pods and categories — drag-and-drop, positions save automatically
- Full contact profiles: birthday countdown, milestones, interests, relationship context
- Interaction logging: calls, emails, texts, meetings, intros, and notes — all tracked with dates
- Social equity scoring per contact and per pod (0–100 scale, cadence-aware)
- CSV import: Briell can upload a spreadsheet of contacts from the browser — no command line access needed
- Import dedup: contacts with the same name or email are automatically skipped on re-import
- Global search: press Cmd+K (or click the search icon) to find any contact by name from any view
- Birthday reminders: "Coming Up" section on the dashboard shows contacts with birthdays in the next 14 days
- Wrapped insight card: rotating card on the dashboard showing weekly stats — people reached, top pod, most connected contact
- Campaigns: create outreach campaigns (events, investments, etc.), track progress per contact, manage from dashboard or from a contact's profile

**What's NOT built**

- Gmail integration — requires Moj to provide credentials and approve OAuth setup; build-ready on our end but blocked on access
- Telegram bot integration — the Toast assistant is a separate project; the Airtable bridge to connect them is future work
- Team accounts with per-user views — everyone sees the same data for now
- Export — no way to get data back out as a CSV from the app today

**Where it lives**

The app runs in a browser. It connects directly to the Airtable base — no backend server. To use it, open the URL Gabe provided and bookmark it. There's no login screen.

---

## How to Use the App

*For Briell — everything you can do, and how.*

### Pulse (Dashboard)

The Pulse view is the home screen. It shows:

- **Overall health score** — a 0–100 aggregate of all relationship equity across all pods
- **Pod health cards** — each pod's score with a sparkline showing recent activity
- **Wrapped insight card** — a rotating card showing weekly stats (people reached, top pod, most connected). Tap to cycle through the three insights.
- **Coming Up** — birthdays in the next 14 days. Click a name to open their profile.
- **Today's Focus** — contacts the app thinks need attention soon
- **Campaigns** — active outreach campaigns with progress bars. Click "+" to create a new one, click a campaign to see details and manage per-contact status.
- **Needs Attention** — overdue contacts past their pod's cadence

Scores update automatically as interactions are logged.

### Map

The Map view is the visual network. Pods appear as large colored orbs around the center Moj orb.

- **Click a pod orb** to open that pod and see its categories
- **Click a category orb** to open the contact panel for that category (slides in from the right)
- **Drag any orb** to rearrange the layout — positions save automatically in your browser
- **Click the "+" orb** in category view to add a new category to that pod
- Press Escape at any point to step back up

### Contact Profiles

Inside the contact panel, click a contact's name to open their full profile.

What you can do:
- Edit name, email, phone, company, role, location, website — changes save to Airtable automatically within a second or two
- Add or edit birthday (format shown in-app), milestones, interests, and relationship context
- See their equity score (0–100) with a breakdown by interaction type
- View their full interaction history

The profile saves field-by-field as you leave each input — no Save button needed.

### Logging Interactions

In a contact's profile, scroll to the interaction history section. Use the "+" button to add a new interaction:

- **Call** — weight 3 in equity scoring
- **Email** — weight 2
- **Text** — weight 2
- **Meeting** — weight 4
- **Intro** — weight 5 (highest — making connections is Moj's highest-value behavior)
- **Note** — weight 0, doesn't update "last contacted" date

Adding any interaction except a note updates the contact's "Last Contacted" date automatically.

### Importing Contacts

Navigate to `/import` in the browser (add `/import` to the end of the app's URL). This is the import tool.

**Steps:**

1. Drag a CSV file onto the upload zone, or click to select a file
2. Select which pod to import the contacts into
3. Preview the first few rows — check that columns look right
4. Click Import
5. Wait for the results — you'll see "Imported X contacts, skipped Y duplicates" when it's done

The import reads these column names from your CSV header row (case-insensitive):

| Column | Where it goes |
|--------|--------------|
| Name | Contact name (required) |
| Email | Email address |
| Phone | Phone number |
| Company | Company name |
| Role | Job title or role |
| Location | City, region, or country |
| Website | URL |
| Notes | General notes |
| Specialization | Area of expertise |
| Recommended By | Who referred them |
| Past Clients | Past client names |

Columns not in this list are ignored — safe to include extra columns. Contacts with the same name OR the same email as an existing contact (case-insensitive) are automatically skipped.

---

## Airtable Field Guide

*For Briell — what the app reads, and what's safe to change.*

The app reads Kinship Brain's Airtable base directly. It knows fields by their exact names. If a field is renamed, the app stops seeing that data — it won't error visibly, the field will just appear empty.

**Rule: Do NOT rename any field marked "NO" in the Safe to rename column. The app depends on these exact names.**

You CAN freely add new fields to any table — the app ignores fields it doesn't recognize.

### Contacts table (table ID: `tbll75mRMMVBGiNpj`)

| Field | Field Type | App reads? | Safe to rename? | Notes |
|-------|------------|-----------|-----------------|-------|
| Name | Single line text | Yes | NO | Primary identifier; used to detect duplicates on import |
| Email | Email | Yes | NO | Used for dedup on import |
| Phone | Phone | Yes | NO | |
| Company | Single line text | Yes | NO | |
| Role | Single line text | Yes | NO | |
| Location | Single line text | Yes | NO | |
| Website | URL | Yes | NO | |
| Notes | Long text | Yes | NO | |
| Recommended By | Single line text | Yes | NO | Must use exact spacing and capitalization |
| Specialization | Single line text | Yes | NO | |
| Past Clients | Single line text | Yes | NO | Must use exact spacing and capitalization |
| Birthday | Date | Yes | NO | Format: YYYY-MM-DD |
| Milestones | Long text | Yes | NO | Freeform text |
| Interests | Long text | Yes | NO | Freeform text |
| Relationship Context | Long text | Yes | NO | Must use exact spacing and capitalization |
| Last Contacted | Date | Yes — auto-updated | NO | Updated automatically when interactions are logged |
| Lists | Link to Lists | Yes | NO | Which pod(s) this contact belongs to |
| Categories | Link to Categories | Yes | NO | Sub-grouping within a pod |
| Interactions | Link to Interactions | Yes | NO | Populated automatically when interactions are logged |

### Lists (Pods) table (table ID: `tblnsxNUscKApvMsV`)

The app calls these "Pods" in the UI. In Airtable the table is still called "Lists" — that's fine, no need to rename it.

| Field | Field Type | App reads? | Safe to rename? | Notes |
|-------|------------|-----------|-----------------|-------|
| Name | Single line text | Yes | NO | Pod name shown on orbs in the map |
| Color | Single line text | Yes | NO | Hex color, e.g. `#718096` |
| Owner | Single select | Yes | NO | Values must be: `moj_mahdara` or `kinship_ventures` |
| Is Priority | Checkbox | Yes | NO | Priority pods are weighted higher in equity scoring |
| Cadence | Single select | Yes | NO | Values must be: `weekly`, `biweekly`, `monthly`, or `quarterly` |
| Categories | Link to Categories | Yes | NO | |
| Contacts | Link to Contacts | Yes | NO | |

### Categories table (table ID: `tblVAgv23LUXs7Q0p`)

| Field | Field Type | App reads? | Safe to rename? | Notes |
|-------|------------|-----------|-----------------|-------|
| Name | Single line text | Yes | NO | Category name shown on orbs |
| List | Link to Lists | Yes | NO | Which pod this category belongs to |
| Color | Single line text | Yes | NO | Hex color, e.g. `#718096` |
| Contacts | Link to Contacts | Yes | NO | |

### Interactions table (table ID: `tblbxLX5EM09Y6xim`)

| Field | Field Type | App reads? | Safe to rename? | Notes |
|-------|------------|-----------|-----------------|-------|
| Contact | Link to Contacts | Yes | NO | Which contact this interaction is for |
| Type | Single select | Yes | NO | Values must be: `call`, `email`, `text`, `meeting`, `intro`, or `note` |
| Date | Date | Yes | NO | When the interaction happened |
| Notes | Long text | Yes | NO | Optional context or detail |

### Naming conventions

All multi-word field names use Title Case with spaces: "Recommended By", "Last Contacted", "Is Priority". The app matches these exactly. If Airtable auto-formats something differently, update the field name to match.

---

## Importing Contacts

*Step-by-step for a new list.*

**Prepare your CSV:**

Your CSV needs a header row. Column names don't need to be in any particular order, and they're matched case-insensitively. Only Name is required — all other columns are optional.

Example header row:
```
Name,Email,Phone,Company,Role,Location,Notes
```

Columns the app doesn't recognize are safely ignored — you can include extra data without problems.

**Import steps:**

1. Open the app in your browser
2. Go to `/import` (add `/import` to the end of the app URL)
3. Drag your CSV file onto the upload area, or click to browse
4. Choose which pod to import into from the dropdown
5. Review the preview — check that names and emails look right
6. Click Import
7. Wait for completion — you'll see a count of imported vs. skipped contacts

**On duplicates:**

The app checks: does a contact with the same name already exist? Does one with the same email already exist? If yes to either, that row is skipped. Comparison is case-insensitive, so "Jane Smith" and "jane smith" are treated as the same person.

**On large CSVs:**

The import sends contacts to Airtable in batches of 10, with a short pause between batches. For lists of 200+ contacts this can take a minute or two. Leave the browser tab open until you see the completion message.

---

## Known Issues

*Real limitations found during development.*

**1. Large imports may be slow**

Airtable limits how fast data can be written. The import paces at roughly 10 contacts per second. A 300-contact list takes about 30 seconds. If the tab is closed before it finishes, the partial import will remain — the app won't know which contacts succeeded. Re-importing is safe (duplicates are skipped), but you may need to delete partial records from Airtable manually.

**2. Orb layout can get stuck**

If the map view looks wrong — orbs overlapping or in unexpected positions — you can reset the layout. In Chrome or Safari: open DevTools (right-click → Inspect), go to Application → Local Storage, find the key `kinshipbrain:node-positions:v2`, and delete it. Refresh the page. The orbs will reset to their default circular layout.

**3. Equity scores assume monthly cadence by default**

If a pod has no cadence set in Airtable, the app defaults to monthly (30 days). Contacts in that pod who haven't been reached in over 30 days will show as overdue. Set an explicit cadence on the pod in Airtable to change this.

**4. No search**

There's no way to search for a specific contact by name within the app. To find someone, you navigate through their pod → category → contact list. If a contact isn't categorized, they won't appear on the map.

**5. No login**

The app has no password. Anyone with the URL can access it. This is an accepted tradeoff for a private tool used by a small team. Don't share the URL publicly.

**6. App data refreshes every 5 minutes**

The app caches data from Airtable for 5 minutes to avoid hitting API limits. If you edit something directly in Airtable, it may take up to 5 minutes to appear in the app. Changes made through the app's own UI appear immediately.

**7. Dark mode is automatic**

The app follows your device's display setting. If your Mac or phone is set to dark mode, the app shows in dark mode. There's no manual toggle.

**8. Supabase folder in the codebase**

There's a `supabase/` folder in the codebase from an early version of the project. It's not connected to anything and can be ignored.

---

## What's Next

*Future work — in plain language, in priority order.*

### High priority — would make the biggest difference

**Contact search**
Being able to type a name and find a contact instantly is the most common missing feature. Right now you navigate manually through pods and categories. This would be a few hours of dev work — straightforward to add when there's capacity.

**Gmail integration**
Pull email history into contact timelines automatically — every email exchange shows up as an interaction without anyone logging it manually. This is the highest-leverage automation available.

What's blocking it: Moj needs to approve OAuth access and provide Gmail credentials. Once that's done, the integration needs a small server component for secure token handling (the browser can't access Gmail directly for security reasons). Estimated dev time: 1–2 days once access is granted.

### Medium priority — meaningful but not urgent

**Export contacts to CSV**
Get data back out of the app. Useful for sharing lists, backing up data, or working outside the app. Probably a half-day of work.

**Import history**
See a log of past imports — when they ran, how many contacts were added, any errors. Makes auditing easier if something goes wrong.

**Bot integration**
The Telegram assistant (Toast) is a separate project that already exists. Connecting it to Airtable so that interactions logged through Telegram appear in Kinship Brain would close the loop. This requires coordination between the two projects.

### Future — bigger lifts, need the right moment

**Team accounts**
Right now Moj and Briell see the same view with the same data. Adding user accounts with individual views or permissions is a larger architectural change. Worth revisiting when the team grows or when sharing the app externally becomes a priority.

**Calendar sync**
Automatically log meetings from Google Calendar or Outlook as interactions. Tied to Gmail access — getting email sorted first unlocks this.

**Mobile app**
The app works on mobile browsers today but isn't optimized for all workflows (logging an interaction on the go, for example). A native app or a properly mobile-responsive version would help with daily habit formation. Desktop-first for now.

---

## Escalation Contact

**Developer:** Gabe Murray

**For bugs or questions after March 31:** [Gabe to fill in contact method — email or phone]

**For Airtable issues:** Airtable support at [support.airtable.com](https://support.airtable.com). You can also access Airtable's built-in help at the bottom of any Airtable view.

**If the app won't load:** First try a hard refresh (Cmd+Shift+R on Mac). If the Airtable token has expired, the app will show a blank screen or an error — this can be fixed by updating the token in the deployment settings (Gabe can do this remotely in under 5 minutes).
