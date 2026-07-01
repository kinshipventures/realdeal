import { describe, expect, it } from 'vitest'
import {
  summarizeConnectionNotifications,
  type ConnectionNotificationState,
} from './connectionNotifications'
import type { UserConnection } from './connections'

function connection(overrides: Partial<UserConnection>): UserConnection {
  return {
    id: 'connection-1',
    requester_id: 'user-1',
    recipient_id: 'user-2',
    status: 'pending',
    created_at: '2026-06-30T00:00:00.000Z',
    responded_at: null,
    removed_at: null,
    direction: 'received',
    connected_user_id: 'user-1',
    connected_display_name: 'Requester',
    connected_email: 'requester@example.com',
    requester_display_name: 'Requester',
    requester_email: 'requester@example.com',
    recipient_display_name: 'Recipient',
    recipient_email: 'recipient@example.com',
    ...overrides,
  }
}

describe('connection notification summaries', () => {
  it('counts incoming pending requests until they are resolved', () => {
    const summary = summarizeConnectionNotifications(
      [connection({ status: 'pending', direction: 'received' })],
      { statuses: {}, acceptedIds: [] },
    )

    expect(summary.pendingReceivedCount).toBe(1)
    expect(summary.totalCount).toBe(1)
    expect(summary.label).toBe('1 incoming request')
  })

  it('marks sent requests as accepted notifications when the status changes', () => {
    const previousState: ConnectionNotificationState = {
      statuses: { 'connection-1': 'pending' },
      acceptedIds: [],
    }

    const summary = summarizeConnectionNotifications(
      [connection({ status: 'accepted', direction: 'sent' })],
      previousState,
    )

    expect(summary.acceptedCount).toBe(1)
    expect(summary.totalCount).toBe(1)
    expect(summary.label).toBe('1 accepted connection')
  })

  it('does not flag old accepted connections on the first snapshot', () => {
    const summary = summarizeConnectionNotifications(
      [connection({ status: 'accepted', direction: 'sent' })],
      { statuses: {}, acceptedIds: [] },
    )

    expect(summary.acceptedCount).toBe(0)
    expect(summary.totalCount).toBe(0)
  })

  it('clears accepted notifications when the user views shared contacts', () => {
    const summary = summarizeConnectionNotifications(
      [connection({ status: 'accepted', direction: 'sent' })],
      { statuses: { 'connection-1': 'pending' }, acceptedIds: ['connection-1'] },
      { clearAccepted: true },
    )

    expect(summary.acceptedCount).toBe(0)
    expect(summary.totalCount).toBe(0)
  })

  it('keeps incoming requests and accepted sent requests in one badge label', () => {
    const summary = summarizeConnectionNotifications(
      [
        connection({ id: 'connection-incoming', status: 'pending', direction: 'received' }),
        connection({ id: 'connection-accepted', status: 'accepted', direction: 'sent' }),
      ],
      { statuses: { 'connection-accepted': 'pending' }, acceptedIds: [] },
    )

    expect(summary.pendingReceivedCount).toBe(1)
    expect(summary.acceptedCount).toBe(1)
    expect(summary.totalCount).toBe(2)
    expect(summary.label).toBe('1 incoming request, 1 accepted connection')
  })

  it('removes stale accepted notifications when a connection is removed', () => {
    const summary = summarizeConnectionNotifications(
      [connection({ status: 'removed', direction: 'sent' })],
      { statuses: { 'connection-1': 'accepted' }, acceptedIds: ['connection-1'] },
    )

    expect(summary.acceptedCount).toBe(0)
    expect(summary.totalCount).toBe(0)
    expect(summary.state.acceptedIds).toEqual([])
  })
})
