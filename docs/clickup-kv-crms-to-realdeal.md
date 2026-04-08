# ClickUp KV CRMs -> realdeal mapping

Source export: `context/imports/clickup-kv-crms/2026-04-08/`

## Bottom line

Do not mirror ClickUp 1:1.

The ClickUp folder is a mixed operational dump, not a coherent app schema. The right move is:
- treat most lists as relationship sources
- treat `Companies` as a noisy company source that needs row classification
- treat `Pipeline` as opportunities + stages, not as the app's entire data model
- preserve unstable leftovers in `custom_fields`

## Source lists -> target models

| ClickUp list | Primary target | Notes |
| --- | --- | --- |
| `Maps` | `contacts` + `contact_pods` | relationship-heavy list, category fields present |
| `Maps Lite/For sorting` | `contacts` + `contact_pods` | mostly lightweight contact records, often duplicate-ish |
| `Talent` | `contacts` + `contact_pods` + `contact_categories` | relationship records with talent-specific metadata |
| `Service Providers` | `contacts` + `contact_pods` + `contact_categories` | relationship records, service taxonomy matters |
| `SPV` | `contacts` + `contact_pods` | investor/contact records with SPV-specific fields |
| `Companies` | `companies` first, then optional linked `contacts` | contains real companies plus action/task rows, so classify before import |
| `Pipeline` | `pipelines`, `pipeline_stages`, `opportunities`, `opportunity_contacts` | rows look like deal/opportunity records with relationship metadata attached |

## Pod mapping

Create or map these pods:
- `Maps`
- `Maps Lite`
- `Talent`
- `Service Providers`
- `SPV`

Suggested ownership defaults:
- `owner`: `moj_mahdara`
- `is_priority`: false
- `enrichment_opt_in`: false

`Companies` should not become a pod. It should feed `companies`.

## Canonical field mapping

### Contact fields

| ClickUp field(s) | realdeal target |
| --- | --- |
| `FIRST NAME` | `contacts.first_name` |
| `LAST NAME` | `contacts.last_name` |
| task `name` | `contacts.name` fallback if first/last missing |
| `💌 Email`, `✉️ Email` | `contacts.email` |
| `Email 2` | `contacts.email_2` |
| `📞 Phone`, `Mobile Number` | `contacts.phone` |
| `🏢 Company` | `contacts.company` |
| `💼 Job Title` | `contacts.role` |
| `🌐 Website` | `contacts.website` |
| `LinkedIn` | `contacts.linkedin` |
| `COUNTRY` | `contacts.country` |
| `🌎 GLOBAL REGION` | `contacts.global_region` after enum normalization |
| `GENDER` | `contacts.gender` after enum normalization |
| `Referred by` | `contacts.recommended_by` |
| `Introduced By` | `contacts.introduced_by` |
| `Relationship Owner` | `contacts.relationship_owner` |
| `Specialization` | `contacts.specialization` |
| `🎂 Birthday`, `🎉 Birthday` | `contacts.birthday` |
| `SPV Investor` | `contacts.spv_investor` |
| `Needs Update`, `Need Update?` | `contacts.needs_review` |
| `Notes` | `contacts.notes` |
| `Summary`, `TLDR`, `Comments`, `✍️ Noteables`, `Assistant Info`, `Job Description` | preserve in `contacts.custom_fields` first, then promote selectively |
| `Main List`, `Additional Lists` | use to create `contact_pods` memberships |
| `Category`, `Maps Category`, `Talent Category`, `Service Category`, `TYPE`, `Type`, `Sector`, `Company Type` | map to categories where stable, else `contacts.custom_fields` |

### Company fields

| ClickUp field(s) | realdeal target |
| --- | --- |
| task `name` or `🏢 Company` | `companies.name` |
| `🌐 Website` | `companies.website` |
| `🏢 Address`, `HQ`, `CITY`, `State`, `COUNTRY` | collapse into `companies.location` |
| `Sector`, `Company Type`, `Type` | `companies.industry` or `companies.custom_fields` depending on value quality |
| `Current Fundraise`, `Investment Stage`, `STAGE` | `companies.stage` if the row is truly a company |
| `Comments`, `Summary`, `TLDR`, `✍️ Noteables`, `Assistant Info` | `companies.notes` or `companies.custom_fields` |
| `🔗 Link`, `Pitch Deck`, `DECK`, `Logo` | `companies.custom_fields` |

### Pipeline fields

| ClickUp field(s) | realdeal target |
| --- | --- |
| `Pipeline` list row name | `opportunities.name` |
| `Status`, `Pipeline Status`, `STAGE`, `KV Status`, `Fundraise Status` | derive `pipeline_stages.name` and `opportunities.status` |
| `Estimated Close Date`, `🔄 Next Contact`, `Current Fundraise`, `Capital Raised to Date`, `Likelihood`, `Pitch Deck`, `Investment Entity` | `opportunities.custom_fields` for now |
| relationship-identifying fields on pipeline rows | use to link `opportunity_contacts` once contacts are normalized |

## What to ignore on first pass

These are ClickUp operational artifacts, not durable app schema:
- `Progress Tracker`
- `Remove`
- `Points Estimate Rolled Up`
- `Date Updated`
- `Date Closed`
- `Latest Comment`
- `Task Content`
- duplicate field variants that only differ by emoji/punctuation unless they carry distinct data

## Row classification rules

### 1. Relationship rows
Use for `contacts` when the row has any of:
- first/last name
- email or phone
- role/title
- person-style task name

### 2. Company rows
Use for `companies` when the row is org-shaped:
- company/site/domain/HQ fields populated
- no obvious person fields
- name looks like an org, vendor, fund, or startup

### 3. Action/task rows
Do not import directly into `companies` or `contacts` on first pass.
Examples:
- `Schedule intro call with Brian Ree / Ester AI - Wed-Fri next week`

These should be parked in a staging file or eventually become notes/interactions/tasks once the app has a better destination.

## Recommended ingestion order

1. Create pod records for the stable lists.
2. Import relationship lists into `contacts` with raw ClickUp metadata preserved in `custom_fields`.
3. Build contact dedupe keys using normalized email, phone, LinkedIn, and name + company.
4. Import `Companies` after row classification.
5. Link contacts to companies by normalized company/domain.
6. Import `Pipeline` into `pipelines` / `pipeline_stages` / `opportunities`.
7. Link opportunities to contacts using email, full name, and company matching.
8. Only after the import is stable, promote recurring custom fields into first-class schema.

## Strong recommendations

- Keep `clickup_task_id`, `clickup_list_id`, `clickup_url`, and raw field payload in `custom_fields` during the first import.
- Treat `Main List` as the primary pod and `Additional Lists` as secondary pod memberships.
- Do not create first-class schema for every weird ClickUp field yet.
- Prefer lossless import plus normalization over fake-clean imports that silently drop data.

## Files to use right now

- `context/imports/clickup-kv-crms/2026-04-08/manifest.json`
- `context/imports/clickup-kv-crms/2026-04-08/*/fields.json`
- `context/imports/clickup-kv-crms/2026-04-08/*/tasks.flat.json`
- `context/imports/clickup-kv-crms/2026-04-08/realdeal-mapping.json`
- `context/imports/clickup-kv-crms/2026-04-08/CLAUDE_CODE_BRIEF.md`
