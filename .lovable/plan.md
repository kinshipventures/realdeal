

## Updated Campaign UX Plan

### 1. Stage column coloring (board view)
- Replace the thin 3px color bar with a full-column tinted background using the stage color at ~8% opacity
- Add a colored top border (3px) to the column header area using the full stage color
- Contact cards remain white/neutral - only the column container gets tinted
- Drop highlight adjusts to blend with the stage color

### 2. Board view sorting
- Add a sort dropdown in the board action bar (next to view toggle)
- Sort options: Name (A-Z), Company, Date added (moved_at), Next step due
- Sorting applies to cards within each column (not column order)
- Persist sort preference per campaign in `localStorage`

### 3. Campaign description below title
- Show `campaign.description` below the `<h1>` title in `CampaignDetailRoute.tsx`
- Render as a subtle secondary text line; if empty, show nothing (no placeholder)
- Already editable via the settings panel - this is read-only display

### 4. Configurable card fields (board view)
- "Card fields" dropdown in the action bar to pick which fields show on kanban cards
- Available fields: company, email, role, owner, next_step, next_step_due, notes, custom_fields (LP Type)
- Default visible: company, next_step
- Persist per campaign in `localStorage`

### 5. Contact slide-out panel
- New `CampaignContactPanel.tsx` - right-side panel (~400px), backdrop blur
- Two sections: Campaign data (stage, owner, next_step, notes, custom_fields - editable) and Contact details (name, email, company, role - read-only with "Open full record" link)
- Triggered by clicking a card in board or row in table view
- Uses `useEscape` for dismiss

### 6. Table column visibility
- Already implemented via "Fields" button. No changes needed.

### Files changed
- `CampaignStageColumn.tsx` - full-column tinting from stage color, remove thin bar
- `CampaignDetailRoute.tsx` - description display, sort state, card fields state, panel state
- `CampaignBoard.tsx` - sort logic, pass card fields + panel callback
- `CampaignContactCard.tsx` - accept `visibleCardFields`, render extra fields
- `CampaignContactPanel.tsx` (new) - slide-out detail panel
- `CampaignTableView.tsx` - use panel callback on row click

