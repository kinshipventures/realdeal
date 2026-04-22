import { useState } from 'react'
import { ConfirmSheet } from '@/components/ui'
import { PRESET_CONFIGS, type Preset } from '@/components/dashboard/useDashboardConfig'

// ── localStorage keys ────────────────────────────────────────────────
const CADENCE_KEY = 'realdeal:default-cadence'
const VIEW_KEY = 'realdeal:pods-view-mode'
const DASH_KEY = 'realdeal:dashboard-config:v5'
const SIDEBAR_KEY = 'realdeal:sidebar-collapsed'
const NUDGE_KEY = 'realdeal:show-nudges'
const THEME_KEY = 'realdeal:theme'

type CadenceOption = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
type ViewMode = 'map' | 'list'

function read(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* silent */ }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true' || v === '1'
  } catch { return fallback }
}

function writeBool(key: string, value: boolean) {
  write(key, value ? 'true' : 'false')
}

function readDashPreset(): Preset {
  try {
    const raw = localStorage.getItem(DASH_KEY)
    if (!raw) return 'full'
    const parsed = JSON.parse(raw)
    return parsed.preset === 'focus' ? 'focus' : 'full'
  } catch { return 'full' }
}

function writeDashPreset(preset: Preset) {
  try {
    const raw = localStorage.getItem(DASH_KEY)
    const existing = raw ? JSON.parse(raw) : {}
    existing.preset = preset
    existing.visible = PRESET_CONFIGS[preset]
    localStorage.setItem(DASH_KEY, JSON.stringify(existing))
  } catch { /* silent */ }
}

// ── Styles ───────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
  display: 'block', marginBottom: 4,
} as const

const descStyle = {
  fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 10px', lineHeight: 1.4,
} as const

const rowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 0', borderBottom: '1px solid var(--divider)',
} as const

// ── Segmented Picker ─────────────────────────────────────────────────
function SegmentedPicker<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{
      display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--edge)',
    }}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: active ? 600 : 400,
              fontFamily: 'inherit', cursor: 'pointer', minHeight: 34,
              border: 'none', borderRight: '1px solid var(--edge)',
              background: active ? 'var(--color-brand)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Toggle Switch ────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 28, borderRadius: 14, padding: 2,
        border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? 'var(--color-brand)' : 'var(--edge-strong)',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 12,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 0.2s',
      }} />
    </button>
  )
}

// ── Main Component ───────────────────────────────────────────────────
export function PreferencesTab() {
  const [cadence, setCadence] = useState<CadenceOption>(() => read(CADENCE_KEY, 'monthly') as CadenceOption)
  const [viewMode, setViewMode] = useState<ViewMode>(() => read(VIEW_KEY, 'map') as ViewMode)
  const [dashPreset, setDashPreset] = useState<Preset>(readDashPreset)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readBool(SIDEBAR_KEY, false))
  const [showNudges, setShowNudges] = useState(() => readBool(NUDGE_KEY, true))
  const [confirmReset, setConfirmReset] = useState(false)
  const [darkMode, setDarkMode] = useState(() => read(THEME_KEY, 'system') === 'dark')

  function handleThemeToggle(dark: boolean) {
    setDarkMode(dark)
    const theme = dark ? 'dark' : 'light'
    write(THEME_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div>
      {/* Default pod cadence */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Default pod cadence</span>
          <p style={descStyle}>How often new pods default to expecting contact.</p>
        </div>
        <SegmentedPicker
          options={[
            { value: 'weekly' as CadenceOption, label: 'Weekly' },
            { value: 'biweekly' as CadenceOption, label: 'Biweekly' },
            { value: 'monthly' as CadenceOption, label: 'Monthly' },
            { value: 'quarterly' as CadenceOption, label: 'Quarterly' },
          ]}
          value={cadence}
          onChange={v => { setCadence(v); write(CADENCE_KEY, v) }}
        />
      </div>

      {/* Pods view mode */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Pods view</span>
          <p style={descStyle}>Choose the default layout for the pods screen.</p>
        </div>
        <SegmentedPicker
          options={[
            { value: 'map' as ViewMode, label: 'Map' },
            { value: 'list' as ViewMode, label: 'List' },
          ]}
          value={viewMode}
          onChange={v => { setViewMode(v); write(VIEW_KEY, v) }}
        />
      </div>

      {/* Dashboard preset */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Dashboard layout</span>
          <p style={descStyle}>Full shows all widgets. Focus shows only action items.</p>
        </div>
        <SegmentedPicker
          options={[
            { value: 'full' as Preset, label: 'Full' },
            { value: 'focus' as Preset, label: 'Focus' },
          ]}
          value={dashPreset}
          onChange={v => { setDashPreset(v); writeDashPreset(v) }}
        />
      </div>

      {/* Sidebar collapsed */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Compact sidebar</span>
          <p style={descStyle}>Collapse the sidebar to show only icons.</p>
        </div>
        <Toggle checked={sidebarCollapsed} onChange={v => { setSidebarCollapsed(v); writeBool(SIDEBAR_KEY, v) }} />
      </div>

      {/* Dark mode */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Dark mode</span>
          <p style={descStyle}>Override your system appearance setting.</p>
        </div>
        <Toggle checked={darkMode} onChange={handleThemeToggle} />
      </div>

      {/* Overdue nudges */}
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Overdue nudges</span>
          <p style={descStyle}>Show badges and reminders for overdue contacts.</p>
        </div>
        <Toggle checked={showNudges} onChange={v => { setShowNudges(v); writeBool(NUDGE_KEY, v) }} />
      </div>

      {/* Reset onboarding */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <span style={labelStyle}>Reset onboarding</span>
          <p style={descStyle}>Re-run the getting started guide from scratch.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 500,
            border: '1px solid var(--edge)', borderRadius: 8,
            background: 'transparent', color: 'var(--color-text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 34,
          }}
        >
          Reset
        </button>
      </div>

      <ConfirmSheet
        open={confirmReset}
        title="Reset onboarding?"
        message="This will re-show the getting started guide next time you open the app."
        confirmLabel="Reset"
        destructive={false}
        onConfirm={() => {
          setConfirmReset(false)
          try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('realdeal:onboarding-complete'))
            keys.forEach(k => localStorage.removeItem(k))
            localStorage.removeItem('realdeal:onboarding-step')
          } catch { /* silent */ }
          window.location.reload()
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
