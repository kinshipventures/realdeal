---
phase: 14-pipelines
plan: 02
subsystem: pipelines
tags: [pipelines, opportunity-detail, timeline, dnd, slide-out]
dependency_graph:
  requires: [14-01]
  provides: [OpportunityDetail slide-out, pipeline timeline writes]
  affects: [src/components/pipelines/, src/lib/airtable.ts]
tech_stack:
  added: []
  patterns: [escape-stack, optimistic-update, undo-toast, .then()-pipeline-event]
key_files:
  created:
    - src/components/pipelines/OpportunityDetail.tsx
  modified:
    - src/components/pipelines/PipelineBoard.tsx
    - src/components/pipelines/OpportunityCard.tsx
    - src/components/pipelines/PipelineStageColumn.tsx
decisions:
  - createInteraction() in .then() callbacks only — avoids double timeline writes on undo
  - onInlineNote prop on OpportunityCard — parent (PipelineBoard) handles updateOpportunity + pipeline_event
  - OpportunityDetail loads stage history by fetching all interactions for linked contacts then filtering client-side
metrics:
  duration: ~18min
  completed: 2026-03-30
  tasks_completed: 2
  files_changed: 4
---

# Phase 14 Plan 02: Opportunity Detail + Timeline Integration Summary

OpportunityDetail slide-out panel (480px, z-index 200) with stage history, linked records navigation, notes/priority/status editing, and full pipeline_event writes to relationship timelines for all mutations.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | OpportunityDetail slide-out panel | 8672b3f | OpportunityDetail.tsx (created), PipelineBoard.tsx, OpportunityCard.tsx |
| 2 | Pipeline event writes on drag + inline note + archive with undo | c9a411a | PipelineBoard.tsx, OpportunityCard.tsx, PipelineStageColumn.tsx |

## What Was Built

**OpportunityDetail.tsx** — slide-out panel following CampaignDetail.tsx pattern:
- Overlay (z-index 199) + panel (z-index 200, 480px width)
- CSS translateX transition (350ms cubic-bezier(0.87, 0, 0.13, 1)) on mount
- useEscape from escapeStack for keyboard dismiss
- Four sections: Linked Records (navigates to /record/:id), Priority & Status (badge cycle + status select), Notes (textarea, save on blur), Stage History (loads pipeline_event interactions for linked contacts, filtered by pipeline name)
- All mutations write pipeline_event via createInteraction() directly — NOT logInteraction() — to avoid bumping last_contacted_at

**PipelineBoard.tsx** — full implementation of stubbed handlers from Plan 01:
- `selectedOpportunity` state + `initialOpenOpportunityId` deep-link support
- `handlePriorityChange`: optimistic update, undo toast, updateOpportunity + pipeline_event in .then()
- `handleArchive`: optimistic remove (status: archived), undo toast restores (status: open), pipeline_event in .then()
- `handleInlineNote`: appends to existing notes, updateOpportunity + note_added pipeline_event in .then()
- `handleOpportunityUpdate`: used by OpportunityDetail for notes/priority/status changes, keeps selectedOpportunity in sync

**OpportunityCard.tsx** — inline note input:
- MessageSquare icon toggle reveals single-line input below card content
- Enter or blur saves, Escape cancels
- `onInlineNote` prop callback — parent owns the API call

**PipelineStageColumn.tsx** — forwards `onInlineNote` prop to OpportunityCard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed react-router-dom import in OpportunityCard.tsx**
- **Found during:** Task 1 (build failure)
- **Issue:** OpportunityCard.tsx imported from `react-router-dom` but project uses `react-router` v7
- **Fix:** Changed import to `react-router`
- **Files modified:** src/components/pipelines/OpportunityCard.tsx
- **Commit:** 8672b3f

## Known Stubs

None — all functionality in this plan is wired end-to-end.

## Self-Check: PASSED
- src/components/pipelines/OpportunityDetail.tsx exists: FOUND
- commit 8672b3f exists: FOUND
- commit c9a411a exists: FOUND
