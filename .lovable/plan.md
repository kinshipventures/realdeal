

# Add Companies Page with Dedicated Sidebar Nav

## What

A new `/companies` route with its own sidebar nav item, showing a table of Company-type records. Separate from the Contacts list, giving companies their own workspace.

## Current state

- Companies exist as rows in `contacts` table with `type = 'Company'`
- There's also a `companies` table in the DB (from migration), but the app uses the `contacts` table for both types
- `RecordsList` already has a `type` filter that can show only Companies
- Company records use the same `Contact` type interface and CRUD functions

## Plan

### 1. Create `CompaniesPage` component

New file: `src/components/companies/CompaniesPage.tsx`

- Reuse the same data loading pattern as `RecordsList` (calls `getContacts()`, `getPods()`, etc.)
- Pre-filter to `type === 'Company'` only
- Simplified table with company-relevant columns: Name, Industry, Stage, Domain, Location, Equity, Last Contact
- Search, sort, click-to-navigate to `/contact/:id` (existing record page handles Company type)
- Bulk actions: archive, add to pipeline/project

### 2. Add route in `App.tsx`

- Add `<Route path="companies" element={<CompaniesPage />} />`

### 3. Add sidebar nav item

In `Sidebar.tsx`:
- Add "Companies" nav item between Contacts and Pipelines
- Add `isCompanies` route detection for `/companies`
- Add a `CompaniesIcon` (building icon)

### 4. Add breadcrumb support

Company record pages (`/contact/:id` where type is Company) should show `Companies > [Name]` breadcrumb instead of `Contacts > [Name]` in `RecordHeader.tsx`.

## Files modified

- `src/components/companies/CompaniesPage.tsx` (new) - dedicated companies table
- `src/App.tsx` - add `/companies` route
- `src/components/nav/Sidebar.tsx` - add Companies nav item + icon
- `src/components/records/RecordHeader.tsx` - conditional breadcrumb based on contact type

