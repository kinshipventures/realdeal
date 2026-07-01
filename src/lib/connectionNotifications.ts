import type { UserConnection } from './connections'

export const CONNECTIONS_CHANGED_EVENT = 'realdeal:connections-changed'

export type ConnectionNotificationState = {
  statuses: Record<string, string>
  acceptedIds: string[]
}

export type ConnectionNotificationSummary = {
  state: ConnectionNotificationState
  pendingReceivedCount: number
  acceptedCount: number
  totalCount: number
  label: string
}

const emptyState: ConnectionNotificationState = {
  statuses: {},
  acceptedIds: [],
}

function storageKey(userId: string) {
  return `realdeal:connection-notifications:${userId}`
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readConnectionNotificationState(userId: string): ConnectionNotificationState {
  if (!canUseLocalStorage()) return emptyState

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return emptyState
    const parsed = JSON.parse(raw) as Partial<ConnectionNotificationState>
    return {
      statuses: parsed.statuses && typeof parsed.statuses === 'object' ? parsed.statuses : {},
      acceptedIds: Array.isArray(parsed.acceptedIds) ? parsed.acceptedIds : [],
    }
  } catch {
    return emptyState
  }
}

export function writeConnectionNotificationState(userId: string, state: ConnectionNotificationState) {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
}

export function summarizeConnectionNotifications(
  connections: UserConnection[],
  previousState: ConnectionNotificationState,
  options: { clearAccepted?: boolean } = {},
): ConnectionNotificationSummary {
  const nextStatuses: Record<string, string> = {}
  const acceptedIds = new Set(previousState.acceptedIds)
  const hasPreviousSnapshot = Object.keys(previousState.statuses).length > 0

  for (const connection of connections) {
    nextStatuses[connection.id] = connection.status

    if (connection.status !== 'accepted') {
      acceptedIds.delete(connection.id)
      continue
    }

    const previousStatus = previousState.statuses[connection.id]
    if (
      hasPreviousSnapshot &&
      connection.direction === 'sent' &&
      previousStatus &&
      previousStatus !== 'accepted'
    ) {
      acceptedIds.add(connection.id)
    }
  }

  if (options.clearAccepted) acceptedIds.clear()

  const pendingReceivedCount = connections.filter(connection => (
    connection.status === 'pending' && connection.direction === 'received'
  )).length
  const acceptedCount = acceptedIds.size
  const totalCount = pendingReceivedCount + acceptedCount
  const label = notificationLabel(pendingReceivedCount, acceptedCount)

  return {
    state: {
      statuses: nextStatuses,
      acceptedIds: [...acceptedIds],
    },
    pendingReceivedCount,
    acceptedCount,
    totalCount,
    label,
  }
}

function notificationLabel(pendingReceivedCount: number, acceptedCount: number) {
  if (pendingReceivedCount > 0 && acceptedCount > 0) {
    return `${pendingReceivedCount} incoming ${pendingReceivedCount === 1 ? 'request' : 'requests'}, ${acceptedCount} accepted ${acceptedCount === 1 ? 'connection' : 'connections'}`
  }
  if (pendingReceivedCount > 0) {
    return `${pendingReceivedCount} incoming ${pendingReceivedCount === 1 ? 'request' : 'requests'}`
  }
  if (acceptedCount > 0) {
    return `${acceptedCount} accepted ${acceptedCount === 1 ? 'connection' : 'connections'}`
  }
  return ''
}
