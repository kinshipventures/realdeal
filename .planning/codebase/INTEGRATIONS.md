# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Airtable (Primary Data Layer):**
- Airtable REST API - All CRUD operations for Contacts, Pods (Lists), Categories, and Interactions
  - SDK/Client: Native `fetch` via `request()` helper in `src/lib/airtable.ts`
  - Auth: Bearer token in Authorization header
  - Base ID: Environment variable `VITE_AIRTABLE_BASE_ID`
  - Token: Environment variable `VITE_AIRTABLE_TOKEN` (Personal Access Token)

## Data Storage

**Databases:**
- Airtable (primary database)
  - Connection: Direct browser-to-Airtable REST API (no backend proxy)
  - Base: "Kinship Brain" with 4 tables:
    - **Pods** (formerly Lists, `tblnsxNUscKApvMsV`) - List/pod definitions with color, owner, cadence, priority flag
    - **Categories** (`tblVAgv23LUXs7Q0p`) - Contact groupings linked to pods
    - **Contacts** (`tbll75mRMMVBGiNpj`) - People in network with metadata (email, phone, company, role, location, etc)
    - **Interactions** (`tblbxLX5EM09Y6xim`) - Logged communications (calls, emails, meetings, intros, notes) with timestamps
  - Client: Raw REST API calls via `src/lib/airtable.ts`

**Client-Side Storage:**
- localStorage - Persists node/orb positions
  - Key: `kinshipbrain:node-positions:v2` (version bump invalidates old positions)
  - Use: React Flow graph state persistence

**File Storage:**
- None - Static files served from Vite build output

**Caching:**
- In-memory caching in `src/lib/airtable.ts` with 5-minute TTL
  - `_contactsCache`, `_categoriesCache`, `_interactionsCache` - Module-level mutable cache
  - Stale-while-revalidate pattern for expired cached data
  - Cache invalidation on mutations (create, update, delete)

## Authentication & Identity

**Auth Provider:**
- Custom token-based (no auth service)
  - Implementation: Bearer token in Airtable API headers
  - Tokens stored in environment variables (`.env.local`)
  - No user authentication layer — single Airtable base for Moj and team

## Monitoring & Observability

**Error Tracking:**
- None deployed

**Logs:**
- Browser console (`console.*` via React StrictMode)
- No persistent logging
- Airtable API errors thrown as Error objects with status code and response text

## CI/CD & Deployment

**Hosting:**
- Static hosting required (Vercel, Netlify, or similar)
- Deployment of `dist/` folder from Vite build

**CI Pipeline:**
- None configured
- Manual build and deploy expected

## Environment Configuration

**Required env vars (in `.env.local`):**
- `VITE_AIRTABLE_TOKEN` - Airtable Personal Access Token (PAT) with read/write access to Kinship Brain base
- `VITE_AIRTABLE_BASE_ID` - Airtable base ID (e.g., `appXXXXXXXXXXXXXX`)

**Secrets location:**
- `.env.local` file (gitignored, never committed)
- Loaded by Vite via `import.meta.env` prefix during build/dev

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## API Request Patterns

**Base URL:**
```
https://api.airtable.com/v0/{VITE_AIRTABLE_BASE_ID}
```

**Helper Functions (src/lib/airtable.ts):**

**`request<T>(path, options?): Promise<T>`**
- Generic fetch wrapper for all HTTP requests
- Handles Authorization header and error responses
- Throws Error with Airtable status and response text on failure

**`fetchAll<T>(table, params?): Promise<AirtableRecord<T>[]>`**
- Paginated fetch handler (uses `offset` parameter)
- Returns all records, handles pagination automatically
- Supports `filterByFormula` and `sort` parameters for filtering/ordering

**Cache Functions:**
- `getPods()`: Fetch all pods (no caching currently)
- `getCategories(listId?)`: Fetch categories with 5-min cache, optional pod filtering
- `getContacts(categoryId?)`: Fetch contacts with 5-min cache, optional category filtering
- `getAllInteractions()`: Fetch interactions from past 90 days (5-min cache) for dashboard scoring
- `getInteractions(contactId)`: Fetch per-contact interaction history (no cache)

**Mutation Functions:**
- `createContact(data)`, `updateContact(id, data)`, `deleteContact(id)`
- `createCategory(name, listId)`
- `createInteraction(data)`, `updateInteraction(id, data)`, `deleteInteraction(id)`
- `logInteraction(contactId, data)` - Creates interaction and updates contact's `last_contacted_at` (side effect)

## Data Access Patterns

**Linked Record Handling:**
- Airtable returns linked fields as arrays of record IDs (strings)
- Client-side filtering for many-to-many relationships (e.g., contacts by category)
- Example: `Categories` linked to `Pods` returns array of Pod record IDs

**Filtering:**
- Airtable formula filtering: `filterByFormula` parameter (e.g., 90-day date range for interactions)
- Client-side filtering: Arrays of IDs matched against record properties

**Sorting:**
- Airtable native sort: `sort[0][field]` and `sort[0][direction]` parameters (e.g., interactions by date descending)

## Data Constraints

**Overdue Detection:**
- `isOverdue(contact, cadence?)`: No `last_contacted_at` OR last contact > cadence duration ago (default monthly)
- Grace period: 14 days after contact creation (no overdue flag for new contacts)

**Interaction 90-Day Window:**
- Dashboard equity scoring only considers interactions from past 90 days
- Airtable formula: `IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days'))`

---

*Integration audit: 2026-03-18*
