# ClickUp KV CRMs export

- Exported at: 2026-04-08T21:48:36Z
- Folder: KV CRMs (90171097431)
- Space: CRM (90171161757)

## Lists
- Maps: 493 rows including subtasks, 56 fields -> `maps/`
- SPV: 35 rows including subtasks, 41 fields -> `spv/`
- Talent: 99 rows including subtasks, 62 fields -> `talent/`
- Companies: 186 rows including subtasks, 58 fields -> `companies/`
- Pipeline: 65 rows including subtasks, 48 fields -> `pipeline/`
- Maps Lite/For sorting: 826 rows including subtasks, 48 fields -> `maps-lite-for-sorting/`
- Service Providers: 573 rows including subtasks, 50 fields -> `service-providers/`

Each list folder contains:
- `fields.json` - full ClickUp field definitions
- `tasks.raw.json` - raw API task payloads
- `tasks.flat.json` - normalized tasks with decoded custom fields
- `tasks.flat.csv` - spreadsheet-friendly export

Notes:
- Export includes closed tasks and subtasks for completeness.
- `task_count_exported` can be higher than ClickUp list counts because ClickUp list counts do not always include subtasks.

Manifest: `manifest.json`
