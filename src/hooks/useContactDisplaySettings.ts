import { useCallback, useEffect, useState } from 'react'
import {
  CONTACT_DISPLAY_SETTINGS_EVENT,
  getContactDisplaySettings,
  getContactOverrideDisplaySettings,
  getResolvedContactDisplaySettings,
  saveContactDisplaySettings,
  saveContactOverrideDisplaySettings,
  type ContactDisplaySettings,
} from '@/lib/contactDisplaySettings'

export function useContactDisplaySettings(workspaceId?: string | null, contactId?: string | null) {
  const [settings, setSettings] = useState<ContactDisplaySettings>(() => getResolvedContactDisplaySettings(workspaceId, contactId))

  useEffect(() => {
    setSettings(getResolvedContactDisplaySettings(workspaceId, contactId))

    function refresh() {
      setSettings(getResolvedContactDisplaySettings(workspaceId, contactId))
    }

    window.addEventListener('storage', refresh)
    window.addEventListener(CONTACT_DISPLAY_SETTINGS_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener(CONTACT_DISPLAY_SETTINGS_EVENT, refresh)
    }
  }, [workspaceId, contactId])

  const updateSettings = useCallback((updater: (current: ContactDisplaySettings) => ContactDisplaySettings) => {
    if (contactId) {
      const currentOverride = getContactOverrideDisplaySettings(workspaceId, contactId)
      const nextOverride = updater(currentOverride)
      saveContactOverrideDisplaySettings(workspaceId, contactId, nextOverride)
      setSettings(getResolvedContactDisplaySettings(workspaceId, contactId))
      return
    }

    const currentGlobal = getContactDisplaySettings(workspaceId)
    const nextGlobal = updater(currentGlobal)
    saveContactDisplaySettings(workspaceId, nextGlobal)
    setSettings(getResolvedContactDisplaySettings(workspaceId, contactId))
  }, [workspaceId, contactId])

  return [settings, updateSettings] as const
}
