import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'
import { invalidateAllCaches } from '@/lib/supabase-data'
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
  const width = collapsed ? 56 : 220

  const isPods = location.pathname === '/' || location.pathname === '/pods'
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')
  const isRelationships = location.pathname === '/relationships' || location.pathname === '/contacts' || location.pathname.startsWith('/contact/') || location.pathname.startsWith('/category/') || location.pathname === '/companies'
  const isCampaigns = location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/projects')
  const isLearn = location.pathname === '/learn'
  const isChangelog = location.pathname === '/changelog'

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
        transition: 'width 0.22s cubic-bezier(0.215, 0.61, 0.355, 1)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRight: '1px solid var(--edge)',
        scrollbarWidth: 'none' as any,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflowX: 'hidden',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
      }}
    >
      {/* Pod ambient wash — radial glow from bottom, driven by --pod-wash-color */}
      <div aria-hidden style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'var(--nav-wash)',
        transition: 'background 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 0,
      }} />
      {/* Header: brand + collapse toggle in one row */}
      <div style={{
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        padding: collapsed ? '12px 8px 8px' : '14px 8px 10px',
        gap: collapsed ? 2 : 0,
      }}>
        {/* Logo + wordmark */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: collapsed ? undefined : 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 6px',
          overflow: 'hidden',
        }}>
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="24" cy="24" r="5" fill="var(--color-text-primary)"/>
            <circle cx="42" cy="24" r="2.8" fill="#25B439"/>
            <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A"/>
            <circle cx="15" cy="39.6" r="2.8" fill="#F5A623"/>
            <circle cx="6"  cy="24" r="2.8" fill="#7E57C2"/>
            <circle cx="15" cy="8.4" r="2.8" fill="#E53935"/>
            <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5"/>
          </svg>
          {!collapsed && (
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
            }}>
              realdeal
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            transition: 'color 0.12s ease',
          }}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24"
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

      {/* Team switcher */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Search */}
      <div style={{ padding: '8px 8px 4px' }}>
        <NavItem
          icon={<SearchIcon />}
          label="Search"
          active={false}
          collapsed={collapsed}
          onClick={onSearch}
          hint={collapsed ? undefined : 'Cmd+K'}
        />
      </div>

      <Divider />

      {/* Primary nav */}
      <div style={{ padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem
          icon={<DashboardIcon />}
          label="Dashboard"
          active={isDashboard}
          collapsed={collapsed}
          onClick={() => navigate('/dashboard')}
        />
        <NavItem
          icon={<PodsIcon />}
          label="Pods"
          active={isPods}
          collapsed={collapsed}
          onClick={() => navigate('/pods')}
        />
        <NavItem
          icon={<RelationshipsIcon />}
          label="Relationships"
          active={isRelationships}
          collapsed={collapsed}
          onClick={() => navigate('/relationships')}
        />
        <NavItem
          icon={<CampaignsIcon />}
          label="Campaigns"
          active={isCampaigns}
          collapsed={collapsed}
          onClick={() => navigate('/campaigns')}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Account + utilities */}
      <div style={{ padding: '4px 8px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <NavItem
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          label="Settings"
          active={location.pathname === '/account'}
          collapsed={collapsed}
          onClick={() => navigate('/account')}
        />

        <NavItem
          icon={<LearnIcon />}
          label="Help"
          active={isLearn}
          collapsed={collapsed}
          onClick={() => navigate('/learn')}
        />
        <NavItem
          icon={<ChangelogIcon />}
          label="What's New"
          active={isChangelog}
          collapsed={collapsed}
          onClick={() => {
            localStorage.setItem('realdeal:changelog-seen:0.2', '1')
            navigate('/changelog')
          }}
          badge={!localStorage.getItem('realdeal:changelog-seen:0.2')}
        />
        <NavItem
          icon={<SignOutIcon />}
          label="Sign out"
          active={false}
          collapsed={collapsed}
          onClick={async () => { invalidateAllCaches(); await supabase.auth.signOut(); window.location.href = '/login' }}
          labelStyle={{ color: 'var(--color-text-tertiary)' }}
        />
        {!collapsed && onDemoToggle && (import.meta.env.DEV || demo) && (
          <button
            type="button"
            onClick={onDemoToggle}
            style={{
              background: demo ? 'rgba(37,180,57,0.08)' : 'none',
              border: demo ? '1px solid rgba(37,180,57,0.2)' : '1px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11, color: demo ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
              fontWeight: demo ? 600 : 400,
              padding: '8px', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.12s ease',
              margin: '0 8px',
            }}
          >
            {demo ? 'Demo on' : 'Demo off'}
          </button>
        )}
      </div>
    </nav>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  icon, label, active, collapsed, onClick, hint, labelStyle, badge,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  hint?: string
  labelStyle?: React.CSSProperties
  badge?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handleEnter() {
    if (!collapsed) return
    timerRef.current = setTimeout(() => setShowTooltip(true), 500)
  }

  function handleLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowTooltip(false)
  }

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
        width: collapsed ? 44 : '100%',
        height: collapsed ? 44 : undefined,
        minHeight: collapsed ? undefined : 44,
        margin: collapsed ? '0 auto' : undefined,
        padding: collapsed ? 0 : '8px 16px',
        background: active ? 'var(--nav-active)' : 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: active ? 'var(--color-shell)' : 'var(--color-text-secondary)',
        transition: 'background 0.15s ease, color 0.15s ease',
        position: 'relative',
      }}
    >
      <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {icon}
        {badge && collapsed && (
          <span className="badge-pulse" style={{
            position: 'absolute', top: -2, right: -2,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--color-shell)',
          }} />
        )}
      </span>
      {!collapsed && (
        <span style={{
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? 'var(--color-shell)' : 'var(--color-text-secondary)',
          flex: 1,
          textAlign: 'left',
          ...labelStyle,
        }}>
          {label}
        </span>
      )}
      {badge && !collapsed && (
        <span className="badge-pulse" style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-shell)', flexShrink: 0,
        }} />
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
      {collapsed && showTooltip && (
        <span style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: 8,
          padding: '5px 10px',
          borderRadius: 7,
          background: 'var(--color-text-primary)',
          color: 'var(--bg)',
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'tooltipFadeIn 120ms ease-out',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--divider)', margin: '8px 12px', flexShrink: 0 }} />
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

function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function RelationshipsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function CampaignsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 11l18-5v12L3 13v-2z"/>
      <line x1="11.6" y1="16.8" x2="10.4" y2="21.2"/>
      <line x1="7.6" y1="15.6" x2="6.4" y2="20"/>
    </svg>
  )
}

function LearnIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function ChangelogIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
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
