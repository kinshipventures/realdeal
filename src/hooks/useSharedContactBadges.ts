import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  getCollaborationAccessGrants,
  getSharedContactsWithMe,
  type CollaborationAccessGrant,
  type CollaborationFieldScope,
  type CollaborationPermissionLevel,
  type SharedContactAccessSnapshot,
} from '@/lib/collaboration'
import type { Campaign, Contact } from '@/lib/types'

export type SharedContactBadgeMeta = {
  direction: 'shared_with_me' | 'shared_by_me'
  grantId: string
  sourceLabel: string
  sharedWith: string
  permissionLevel: CollaborationPermissionLevel
  permissionLabel: string
  fieldScopes: CollaborationFieldScope[]
  visibleFieldIds?: readonly string[]
  status: 'active' | 'expired' | 'revoked'
}

type Options = {
  contacts: Contact[]
  campaigns?: Pick<Campaign, 'id' | 'contact_ids'>[]
}

function permissionLabel(value: CollaborationPermissionLevel): string {
  if (value === 'view') return 'Reader'
  if (value === 'comment') return 'Commenter'
  if (value === 'suggest') return 'Contributor'
  if (value === 'edit') return 'Editor'
  if (value === 'approve') return 'Approver'
  if (value === 'admin') return 'Admin'
  return 'Reader'
}

function accessStatus(expiresAt: string | null, revokedAt?: string | null): SharedContactBadgeMeta['status'] {
  if (revokedAt) return 'revoked'
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

export function primarySharedContactMeta(items: readonly SharedContactBadgeMeta[] | undefined): SharedContactBadgeMeta | null {
  return items?.find(item => item.direction === 'shared_with_me')
    ?? items?.find(item => item.direction === 'shared_by_me')
    ?? null
}

export function sharedContactBadgeMetaToAccess(meta: SharedContactBadgeMeta | null | undefined) {
  if (!meta) return undefined
  return {
    direction: meta.direction,
    grantId: meta.grantId,
    sourceLabel: meta.sourceLabel,
    sharedWith: meta.sharedWith,
    permissionLevel: meta.permissionLevel,
    permissionLabel: meta.permissionLabel,
    fieldScopes: meta.fieldScopes,
    visibleFieldIds: meta.visibleFieldIds,
  }
}

export function useSharedContactBadges({ contacts, campaigns = [] }: Options) {
  const { activeWorkspace } = useWorkspace()
  const { session } = useAuth()
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [incomingSharedContacts, setIncomingSharedContacts] = useState<SharedContactAccessSnapshot[]>([])

  useEffect(() => {
    let stale = false
    const workspaceId = activeWorkspace?.id

    async function loadSharedAccess() {
      const [allGrants, incoming] = await Promise.all([
        workspaceId ? getCollaborationAccessGrants(workspaceId) : Promise.resolve([]),
        getSharedContactsWithMe(),
      ])
      if (stale) return
      setGrants(allGrants)
      setIncomingSharedContacts(incoming)
    }

    loadSharedAccess().catch(error => {
      console.error('Shared contact badges load error:', error)
      if (!stale) {
        setGrants([])
        setIncomingSharedContacts([])
      }
    })

    return () => { stale = true }
  }, [activeWorkspace?.id, session?.user?.id])

  return useMemo(() => {
    const contactMap = new Map(contacts.map(contact => [contact.id, contact]))
    const campaignMap = new Map(campaigns.map(campaign => [campaign.id, campaign]))
    const currentUserId = session?.user?.id ?? null
    const next = new Map<string, SharedContactBadgeMeta[]>()

    function addMeta(contactId: string, meta: SharedContactBadgeMeta) {
      const existing = next.get(contactId) ?? []
      if (!existing.some(item => item.grantId === meta.grantId && item.direction === meta.direction)) {
        next.set(contactId, [...existing, meta])
      }
    }

    function contactIdsForGrant(grant: CollaborationAccessGrant): string[] {
      const resourceId = grant.resource_id
      if (!resourceId) return []

      if (grant.resource_type === 'contact') {
        return contactMap.has(resourceId) ? [resourceId] : []
      }

      if (grant.resource_type === 'pod') {
        const podContacts = contacts.filter(contact => (
          Array.isArray(contact.list_ids) && contact.list_ids.includes(resourceId)
        ))
        const subPodContacts = contacts.filter(contact => (
          Array.isArray(contact.category_ids) && contact.category_ids.includes(resourceId)
        ))
        return (podContacts.length > 0 ? podContacts : subPodContacts).map(contact => contact.id)
      }

      if (grant.resource_type === 'campaign') {
        return (campaignMap.get(resourceId)?.contact_ids ?? []).filter(contactId => contactMap.has(contactId))
      }

      if (grant.resource_type === 'company') {
        return contacts
          .filter(contact => (
            contact.id === resourceId ||
            contact.company_record_id === resourceId ||
            (Array.isArray(contact.company_ids) && contact.company_ids.includes(resourceId))
          ))
          .map(contact => contact.id)
      }

      return []
    }

    for (const grant of grants) {
      const status = accessStatus(grant.expires_at, grant.revoked_at)
      if (status !== 'active') continue

      const directions: SharedContactBadgeMeta['direction'][] = []
      if (currentUserId && grant.subject_type === 'user' && grant.subject_id === currentUserId) directions.push('shared_with_me')
      if (currentUserId && grant.created_by === currentUserId) directions.push('shared_by_me')
      if (directions.length === 0) continue

      const contactIds = contactIdsForGrant(grant)
      for (const direction of directions) {
        const meta: SharedContactBadgeMeta = {
          direction,
          grantId: grant.id,
          sourceLabel: grant.resource_label,
          sharedWith: grant.subject_label,
          permissionLevel: grant.permission_level,
          permissionLabel: permissionLabel(grant.permission_level),
          fieldScopes: grant.field_scopes,
          visibleFieldIds: grant.visible_field_ids,
          status,
        }
        contactIds.forEach(contactId => addMeta(contactId, meta))
      }
    }

    for (const snapshot of incomingSharedContacts) {
      const status = accessStatus(snapshot.expires_at)
      if (status !== 'active') continue

      const contactIds = contacts
        .filter(contact => (
          contact.id === snapshot.contact.id ||
          contact.custom_fields?.shared_contact_grant_id === snapshot.grant_id
        ))
        .map(contact => contact.id)
      const targetContactIds = contactIds.length > 0 ? contactIds : [snapshot.contact.id]
      const meta = {
        direction: 'shared_with_me',
        grantId: snapshot.grant_id,
        sourceLabel: snapshot.resource_label,
        sharedWith: snapshot.created_by_label || snapshot.created_by_email || 'Shared contact owner',
        permissionLevel: snapshot.permission_level,
        permissionLabel: permissionLabel(snapshot.permission_level),
        fieldScopes: snapshot.field_scopes,
        visibleFieldIds: snapshot.visible_field_ids,
        status,
      } satisfies SharedContactBadgeMeta
      targetContactIds.forEach(contactId => addMeta(contactId, meta))
    }

    return next
  }, [campaigns, contacts, grants, incomingSharedContacts, session?.user?.id])
}
