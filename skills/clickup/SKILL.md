---
name: clickup
description: >
  Use this skill whenever the user asks you to interact with ClickUp via the API - including reading tasks,
  searching tasks, listing or navigating Spaces/Folders/Lists, reading chat channels/messages, docs,
  or generating reports and summaries from ClickUp data. Trigger this skill any time the user mentions
  ClickUp tasks, workspaces, lists, spaces, folders, chat, docs, or asks for status reports, overviews,
  or summaries of work tracked in ClickUp.
---

# ClickUp Skill

## Daily Catch-Up Check

When the user asks "anything new in clickup" or similar, run this full sequence:

```bash
# 1. @mentions (inbox)
clickup inbox

# 2. Recently updated tasks
clickup task recent

# 3. Recent chat in key channels
for ch in "8cqbk2w-71137" "8cqbk2w-71937"; do
  curl -s -H "Authorization: $CLICKUP_API_KEY" \
    "https://api.clickup.com/api/v3/workspaces/9017085020/chat/channels/$ch/messages?limit=5"
done

# 4. Gabe's deliverables list - tasks updated in last 24h
curl -s -H "Authorization: $CLICKUP_API_KEY" \
  "https://api.clickup.com/api/v2/list/901711757325/task?date_updated_gt=$(python3 -c 'import time; print(int((time.time()-86400)*1000))')&assignees[]=95389616"
```

Channels checked:
- `8cqbk2w-71137` = int-ops-automations (primary)
- `8cqbk2w-71937` = general-int-production

Summarize: new mentions, task changes by others, chat messages worth noting. Skip noise.

---

## Workspace

- **Workspace ID:** `9017085020` (Moj Mahdara / Trolley HQ)
- **Gabe's user ID:** `95389616`
- **Auth:** `$CLICKUP_API_KEY` env var. v2 uses raw token in `Authorization` header (no Bearer). v3 same.

## User ID Map

| ID | Name | Email |
|----|------|-------|
| 95389616 | Gabriel Murray | gabriel@withtrolley.ai |
| 89337602 | Briell Huddleston | relationshipmanager@withtrolley.ai |
| 89137173 | Moj Mahdara | moj@kinshipventures.co |
| 75491783 | Gaby Trujillo | gaby@withtrolley.com |
| 95269648 | Nicole Camacho | nicole@withtrolley.ai |
| 89322812 | Mariana Dominguez | operations@withtrolley.ai |
| 89130635 | Moj Office | mojoffice@kinshipventures.co |
| 89340213 | Daniela | daniela@withtrolley.ai |
| 89302208 | Andrea Tarazona | andru@withtrolley.ai |
| 89358308 | Sheika Javellana | sheika@withtrolley.ai |
| 95373392 | GP (Gwyneth) | fndr@goop.com |
| 95325222 | Kevin Keating | kevin@kinshipventures.co |
| 60117476 | Roya Rastegar | royazrastegar@gmail.com |
| 150082954 | Daniela Liberatoscioli | dani.libe02@gmail.com |

## Chat Channels (Gabe is member of all)

| Channel ID | Name | Type |
|------------|------|------|
| 8cqbk2w-71137 | int-ops-automations | CHANNEL |
| 8cqbk2w-71937 | general-int-production | CHANNEL |
| 8cqbk2w-71177 | int-ops-hr-general | CHANNEL |
| 8cqbk2w-71797 | trolley-general | CHANNEL |
| 6-901711757325-8 | Moj RM - Gabe's Deliverables | CHANNEL (list) |
| 6-901711774022-8 | Trolley Founder Suite - Briell | CHANNEL (list) |
| 6-901710503665-8 | Team Backlog | CHANNEL (list) |
| 4-90173895815-8 | Systems & AI | CHANNEL (space) |
| 6-901711746741-8 | Bugs | CHANNEL (list) |
| 6-901708448901-8 | To Do - Lovable | CHANNEL (list) |
| 6-901711745605-8 | Process Improvement Roadmap | CHANNEL (list) |
| 6-901711831943-8 | Mentorship: Read The Room | CHANNEL (list) |

### Chat Archive

Full message history saved at `data/clickup-chats/` (fetched 2026-04-01). Files:
- `int-ops-automations.md` (114 msgs) - **primary Kinship/Real Deal channel**
- `general-int-production.md` (273 msgs)
- `int-ops-hr-general.md` (495 msgs)
- `to-do-lovable.md` (63 msgs) - Lovable case study work
- `trolley-general.md` (216 msgs)
- `team-backlog.md` (18 msgs)
- Others: <5 msgs each

Refresh archive: run the python script pattern from the session that created these (see `memory/2026-04-01.md`).

## Key Lists (Task Containers)

| List ID | Name | Folder |
|---------|------|--------|
| 901711757325 | Moj RM - Gabe's Deliverables | Systems Ops |
| 901711774022 | Trolley Founder Suite - Briell's Deliverables | Systems Ops |
| 901710503665 | Team Backlog | Systems Ops |

## Key Docs

| Doc ID | Name | Contents |
|--------|------|----------|
| 8cqbk2w-101757 | Kinship Brain Docs | Briell's Feedback & Open Questions (14 items) + Bugs Tracker |
| 8cqbk2w-100037 | Kinship Brain x Lovable Case Study | Roles, phases, pod structure |
| 8cqbk2w-100897 | Moj Brand Intelligence | Brand intel |
| 8cqbk2w-10657 | Company Wiki | Wiki |

---

## Preferred Interface: CLI (v2 tasks)

Use the `clickup` CLI (Homebrew: `triptechtravel/tap/clickup`) for task operations. Already authenticated as Gabriel Murray.

### Quick Commands
```bash
clickup task recent                           # Recently updated tasks
clickup task list --list-id ID                # Tasks in a list
clickup task list --list-id ID --assignee me  # My tasks in a list
clickup task search "query"                   # Search across workspace
clickup space list                            # List all spaces
clickup inbox                                 # Recent @mentions
clickup task view TASK_ID                     # Single task details
```

Add `--json` to any command for machine-readable output. Add `--jq "expression"` for filtering.

### Fallback: Raw API
Only use raw curl if the CLI can't do something specific. API key is available as the environment variable
`CLICKUP_API_KEY`. Base URL: `https://api.clickup.com/api/v2`.

## Authentication

Every request must include:
```
Authorization: <CLICKUP_API_KEY>
Content-Type: application/json
```

Note: ClickUp uses the raw token in `Authorization` - **no** `Bearer` prefix.

---

## Hierarchy & Terminology

ClickUp's hierarchy (v2 API):

```
Workspace (called "team" in v2 API)
  └── Space
        ├── Folder
        │     └── List
        │           └── Task
        └── Folderless List
              └── Task
```

- In v2 endpoints, **Workspace = Team** (`team_id`)
- Tasks belong to a **List**; a task's `id` has no leading `#` in API calls

---

## Core Endpoints

### Workspace / Team

| Action | Method | Endpoint |
|--------|--------|----------|
| Get authorized workspaces | GET | `/team` |

### Spaces

| Action | Method | Endpoint |
|--------|--------|----------|
| Get spaces in workspace | GET | `/team/{team_id}/space?archived=false` |
| Get single space | GET | `/space/{space_id}` |

### Folders

| Action | Method | Endpoint |
|--------|--------|----------|
| Get folders in space | GET | `/space/{space_id}/folder?archived=false` |
| Get single folder | GET | `/folder/{folder_id}` |

### Lists

| Action | Method | Endpoint |
|--------|--------|----------|
| Get lists in folder | GET | `/folder/{folder_id}/list?archived=false` |
| Get folderless lists in space | GET | `/space/{space_id}/list?archived=false` |
| Get single list | GET | `/list/{list_id}` |

### Tasks

| Action | Method | Endpoint |
|--------|--------|----------|
| Get tasks in a list | GET | `/list/{list_id}/task` |
| Get a single task | GET | `/task/{task_id}` |
| Search tasks in workspace | GET | `/team/{team_id}/task` |

---

## Reading & Searching Tasks

### Get tasks in a list

```
GET /list/{list_id}/task
```

Key query params:
- `page` - pagination, 0-indexed (100 tasks/page max)
- `order_by` - `id`, `created`, `updated`, `due_date`
- `reverse` - `true` to reverse sort
- `subtasks` - `true` to include subtasks
- `statuses[]` - filter by status name (e.g. `statuses[]=in progress`)
- `assignees[]` - filter by user ID
- `due_date_gt` / `due_date_lt` - Unix timestamps (ms)
- `date_created_gt` / `date_created_lt` - Unix timestamps (ms)
- `date_updated_gt` / `date_updated_lt` - Unix timestamps (ms)
- `include_closed` - `true` to include closed tasks
- `custom_fields` - filter by custom field values (see references/custom-fields.md)

### Search tasks across a workspace (filtered)

```
GET /team/{team_id}/task
```

Supports same query params as above, plus:
- `space_ids[]` - limit to specific spaces
- `project_ids[]` - limit to specific folders
- `list_ids[]` - limit to specific lists

### Pagination pattern

Tasks max out at 100 per page. To get all tasks:
1. Fetch page 0
2. If response returns exactly 100 tasks, fetch page 1
3. Repeat until fewer than 100 tasks are returned

---

## Navigating the Hierarchy

When the user refers to a space/folder/list by **name** (not ID), you must resolve it:

1. `GET /team` → get `team_id`
2. `GET /team/{team_id}/space` → find space by name → get `space_id`
3. `GET /space/{space_id}/folder` → find folder by name → get `folder_id`
4. `GET /folder/{folder_id}/list` OR `GET /space/{space_id}/list` (folderless) → find list → get `list_id`

Cache IDs within the conversation - don't re-fetch if already resolved.

---

## Generating Reports & Summaries

When asked for a report or summary:

1. **Clarify scope** if ambiguous - which space, folder, list, or the whole workspace?
2. **Fetch tasks** with relevant filters (status, assignee, date ranges)
3. **Aggregate and present** using a clear structure:

### Standard report format

```
## [Scope Name] - Task Summary
Generated: [date]

### Overview
- Total tasks: N
- Open: N | In Progress: N | Closed: N
- Overdue: N (due date < today, not closed)

### By Status
[status]: N tasks

### By Assignee (if applicable)
[name]: N tasks

### Notable / Overdue Tasks
- [task name] - due [date], assigned to [name]
```

Adapt verbosity to what the user asked for. For quick summaries, lead with the key numbers.

### Quick task view format
```
📋 <Task Name>
   Status: <status> · Priority: <priority> · Assignee: <name>
   Due: <date> · List: <list name>
   <1-line description if available>
   🔗 <ClickUp URL>
```

### Task list format
```
📋 <List/Space Name> - <count> tasks

🔴 Urgent/High
  · <Task> - due <date>, assigned: <name>

🟡 Normal
  · <Task> - due <date>

🟢 Low
  · <Task>
```

---

## Date Handling

- ClickUp stores all timestamps as **Unix milliseconds** (13-digit integers)
- Convert to/from human dates when displaying or filtering
- "Today" = start of current UTC day in ms: `Date.now()` rounded to midnight

---

## Rate Limits

- Rate limits vary by plan (typically 100 req/min on free, higher on paid)
- If you hit a 429, wait and retry with exponential backoff
- Batch reads where possible; avoid fetching the same resource twice

---

## Common Errors

| Status | Meaning | Fix |
|--------|---------|-----|
| 401 | Invalid API key | Check `CLICKUP_API_KEY` env var |
| 404 | Resource not found | Verify IDs; task IDs have no leading `#` |
| 429 | Rate limit hit | Back off and retry |
| 400 | Bad request | Check required params and data types |

---

## v3 API: Chat

Base: `https://api.clickup.com/api/v3/workspaces/9017085020`

### List channels
```
GET /chat/channels
```
Returns all channels (CHANNEL, DM). Includes `id`, `name`, `type`, `latest_comment_at`, `archived`.
Paginated via `next_cursor`.

### Get messages in a channel
```
GET /chat/channels/{channel_id}/messages?limit=50
```
Returns messages newest-first. Each message has:
- `id` - message ID
- `content` - markdown text (mentions as `[@Name](#user_mention#USER_ID)`)
- `date` - Unix ms timestamp
- `user_id` - sender (map via User ID table above)
- `replies_count` - number of thread replies
- `type` - "message"

Paginate with `?cursor=` from response `next_cursor`.

### Get thread replies
```
GET /chat/messages/{message_id}/replies?limit=10
```
Same message format. Returns replies to a specific message.

### Channel members
```
GET /chat/channels/{channel_id}/members
```

## v3 API: Docs

### List workspace docs
```
GET /docs
```
Returns all docs with `id`, `name`, `date_created`, `date_updated`, `creator`.

### Get doc pages + content
```
GET /docs/{doc_id}/pages
```
Returns array of pages. Each has:
- `id` - page ID
- `name` - page title
- `content` - markdown/rich text content (full body)
- `date_edited`, `edited_by`
- `pages` - nested sub-pages

## v3 API: Workspace Members
```
GET /api/v2/team
```
Returns teams with `members[]` array. Each member has `user.id`, `user.username`, `user.email`.
Use to resolve unknown user IDs.

---

## Reference Files

- `references/task-fields.md` - Full task object field reference
- `references/custom-fields.md` - Working with custom fields in queries

Read these when you need field-level detail or custom field filtering.
