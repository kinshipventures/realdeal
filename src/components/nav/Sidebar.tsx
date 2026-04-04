import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getPods } from '@/lib/supabase-data'
import type { Pod } from '@/lib/types'
import { supabase } from '@/integrations/supabase/client'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onSearch: () => void
  demo: boolean
  onDemoToggle?: () => void
}

export function Sidebar({ collapsed, onToggle, onSearch, demo, onDemoToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [pods, setPods] = useState<Pod[]>([])
  const [podsOpen, setPodsOpen] = useState(() =>
    localStorage.getItem('realdeal:sidebar-pods-open') !== '0'
  )
  const width = collapsed ? 56 : 220

  useEffect(() => {
    getPods().then(setPods)
  }, [])

  const togglePods = () => {
    const next = !podsOpen
    setPodsOpen(next)
    localStorage.setItem('realdeal:sidebar-pods-open', next ? '1' : '0')
  }

  const isPods = location.pathname === '/' || location.pathname === '/pods'
  const isPulse = location.pathname === '/pulse' || location.pathname.startsWith('/pulse/')
  const isContacts = location.pathname === '/contacts' || location.pathname.startsWith('/contact/') || location.pathname.startsWith('/category/')
  const isCompanies = location.pathname === '/companies'
  const isPipelines = location.pathname.startsWith('/pipelines')
  const isProjects = location.pathname.startsWith('/projects')

  const isPod = location.pathname.startsWith('/pod/')
  const activePodId = isPod ? location.pathname.split('/pod/')[1] : null

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width,
        transition: 'width 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--edge-strong)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Collapse toggle - top */}
      <div style={{ padding: '8px 8px 0' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: collapsed ? 40 : 32,
            height: 32,
            margin: collapsed ? '0 auto' : '0 0 0 auto',
            background: 'none',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            transition: 'color 0.12s ease',
          }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Workspace switcher */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Map - primary */}
      <div style={{ padding: '4px 8px' }}>
        <NavItem
          icon={<PodsIcon />}
          label="Pods"
          active={isPods}
          collapsed={collapsed}
          onClick={() => navigate('/pods')}
        />
      </div>

      <Divider />

      {/* Core section */}
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem
          icon={<PulseIcon />}
          label="Pulse"
          active={isPulse}
          collapsed={collapsed}
          onClick={() => navigate('/pulse')}
        />
        <NavItem
          icon={<ContactsIcon />}
          label="Contacts"
          active={isContacts}
          collapsed={collapsed}
          onClick={() => navigate('/contacts')}
        />
        <NavItem
          icon={<CompaniesIcon />}
          label="Companies"
          active={isCompanies}
          collapsed={collapsed}
          onClick={() => navigate('/companies')}
        />
        <NavItem
          icon={<PipelinesIcon />}
          label="Pipelines"
          active={isPipelines}
          collapsed={collapsed}
          onClick={() => navigate('/pipelines')}
        />
        <NavItem
          icon={<ProjectsIcon />}
          label="Projects"
          active={isProjects}
          collapsed={collapsed}
          onClick={() => navigate('/projects')}
        />
      </div>

      <Divider />

      {/* Pods sub-nav */}
      {!collapsed && pods.length > 0 && (
        <div style={{ padding: '4px 8px' }}>
          <button
            type="button"
            onClick={togglePods}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              padding: '6px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              fontFamily: 'inherit',
            }}
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: podsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Pods
          </button>
          {podsOpen && (
            <div style={{ overflowY: 'auto', maxHeight: 200 }}>
              {pods.map(pod => (
                <button
                  key={pod.id}
                  type="button"
                  aria-current={activePodId === pod.id ? 'page' : undefined}
                  onClick={() => navigate(`/pod/${pod.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '6px 8px 6px 16px',
                    background: activePodId === pod.id ? 'var(--tint-hover)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: pod.color || 'var(--color-text-tertiary)',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: activePodId === pod.id ? 600 : 400,
                    color: activePodId === pod.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {pod.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Utilities */}
      <div style={{ padding: '4px 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem
          icon={<SearchIcon />}
          label="Search"
          active={false}
          collapsed={collapsed}
          onClick={onSearch}
          hint={collapsed ? undefined : 'Cmd+K'}
        />
        {onDemoToggle && (
        <NavItem
          icon={
            <div style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: demo ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                transition: 'background 0.15s ease',
              }} />
            </div>
          }
          label={demo ? 'Demo on' : 'Demo off'}
          active={false}
          collapsed={collapsed}
          onClick={onDemoToggle}
          labelStyle={demo ? { color: 'var(--color-brand)', fontWeight: 600 } : undefined}
        />
        )}

        <Divider />

        <NavItem
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          label="Account"
          active={location.pathname === '/account'}
          collapsed={collapsed}
          onClick={() => navigate('/account')}
        />

        <NavItem
          icon={<SignOutIcon />}
          label="Sign out"
          active={false}
          collapsed={collapsed}
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
        />

      </div>
    </nav>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  icon, label, active, collapsed, onClick, hint, labelStyle,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  hint?: string
  labelStyle?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
        width: collapsed ? 40 : '100%',
        height: collapsed ? 40 : undefined,
        margin: collapsed ? '0 auto' : undefined,
        padding: collapsed ? 0 : '8px 16px',
        background: active ? 'var(--tint-hover)' : 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.12s ease',
      }}
    >
      <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {icon}
      </span>
      {!collapsed && (
        <span style={{
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          flex: 1,
          textAlign: 'left',
          ...labelStyle,
        }}>
          {label}
        </span>
      )}
      {hint && !collapsed && (
        <span style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          flexShrink: 0,
        }}>
          {hint}
        </span>
      )}
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--divider)', margin: '4px 12px' }} />
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const iconProps = {
  width: 20, height: 20, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

function PodsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="9"/>
      <line x1="12" y1="15" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="9" y2="12"/>
      <line x1="15" y1="12" x2="21" y2="12"/>
    </svg>
  )
}

function PulseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function ContactsIcon() {
  return (
    <svg {...iconProps}>
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function PipelinesIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="3" width="5" height="18" rx="1"/>
      <rect x="9.5" y="6" width="5" height="15" rx="1"/>
      <rect x="17" y="9" width="5" height="12" rx="1"/>
    </svg>
  )
}

function CompaniesIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <line x1="9" y1="22" x2="9" y2="2"/>
      <line x1="15" y1="22" x2="15" y2="2"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
