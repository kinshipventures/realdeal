import { describe, expect, it } from 'vitest'
import {
  buildActivityChanges,
  describeWorkspaceActivity,
  summarizeActivityChanges,
  type WorkspaceActivityEvent,
} from './workspaceActivity'

function event(overrides: Partial<WorkspaceActivityEvent>): WorkspaceActivityEvent {
  return {
    id: 'event-1',
    workspace_id: 'workspace-1',
    actor_user_id: 'user-1',
    actor_label: 'Briell',
    actor_email: 'briell@example.com',
    action: 'updated',
    entity_type: 'contact',
    entity_id: 'contact-1',
    entity_label: 'Jane Doe',
    related_type: null,
    related_id: null,
    related_label: null,
    changes: {},
    metadata: {},
    created_at: '2026-07-03T10:00:00.000Z',
    ...overrides,
  }
}

describe('workspace activity helpers', () => {
  it('describes team member edits in plain English', () => {
    expect(describeWorkspaceActivity(event({}))).toBe('Briell updated Jane Doe.')
    expect(describeWorkspaceActivity(event({
      action: 'contacted',
      entity_type: 'interaction',
      entity_label: 'Jane Doe',
    }))).toBe('Briell contacted Jane Doe.')
  })

  it('summarizes changed fields without exposing huge payloads', () => {
    const changes = buildActivityChanges({
      email: 'jane@example.com',
      category_ids: ['sub-1', 'sub-2'],
      custom_fields: { private: 'value' },
    })

    expect(summarizeActivityChanges(event({ changes }))).toBe('Email: jane@example.com | Sub-pods: 2 selected | Custom fields: [updated]')
  })
})
