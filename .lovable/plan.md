

# Add Communication Preferences Field

## What

Add a `communication_preferences` free-text field to contacts (e.g. "bullet points only, text only", "prefers WhatsApp", "no calls before 10am"). Displayed in the Details widget for Contact-type records, between "Contact Frequency" and the shared email fields.

## Changes

### 1. Database migration
- Add `communication_preferences text` column to `contacts` table (nullable, no default)

### 2. `src/lib/types.ts`
- Add `communication_preferences: string | null` to `Contact` interface (after `contact_frequency`)

### 3. `src/lib/supabase-data.ts`
- Include `communication_preferences` in contact read/write mappings (should flow automatically if using `select('*')`, but verify create/update pass it through)

### 4. `src/components/records/DetailsWidget.tsx`
- Add `{field('communication_preferences', 'Comm Preferences', true)}` in the Contact section after `contact_frequency`
- Uses `multi = true` so it renders as a textarea for longer notes

### 5. `src/lib/sampleData.ts`
- Add `communication_preferences: null` default to demo contact helper; add a couple example values like "Text only - bullet points preferred" on key demo contacts

### 6. Touch-up call sites
- Any `createContact` call sites that build a full `Omit<Contact, 'id' | 'created_at'>` need `communication_preferences: null` added (CreateRecordModal, AddContactModal, csvImport, etc.)

## Files modified
- `src/lib/types.ts`
- `src/lib/supabase-data.ts`
- `src/lib/sampleData.ts`
- `src/components/records/DetailsWidget.tsx`
- `src/components/contacts/AddContactModal.tsx`
- `src/components/records/CreateRecordModal.tsx`

