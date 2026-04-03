import { useState, useRef, useEffect } from 'react'
import { icons } from 'lucide-react'
import { LucideIcon } from '../LucideIcon'

// Curated set - relevant to a relationship/network CRM
const CURATED_ICONS = [
  // People & social
  'Heart', 'Star', 'Users', 'UserPlus', 'Handshake', 'MessageCircle', 'Crown',
  // Business
  'Briefcase', 'Building2', 'Landmark', 'TrendingUp', 'DollarSign', 'PiggyBank', 'Wallet',
  // Creative & brand
  'Palette', 'Sparkles', 'Gem', 'Feather', 'Camera', 'Music', 'Lightbulb',
  // Tech
  'Code', 'Cpu', 'Globe', 'Wifi', 'Smartphone', 'Monitor', 'Zap',
  // Location
  'MapPin', 'Sun', 'Mountain', 'Compass', 'Plane', 'Ship', 'Car',
  // Communication
  'Megaphone', 'Mail', 'Phone', 'Send', 'Radio', 'Mic', 'Video',
  // Professional
  'Scale', 'GraduationCap', 'BookOpen', 'Award', 'Trophy', 'Target', 'Flag',
  // Nature & lifestyle
  'Coffee', 'Wine', 'Utensils', 'Dumbbell', 'Leaf', 'Flower2', 'TreePine',
  // Objects
  'Rocket', 'Anchor', 'Key', 'Shield', 'Bolt', 'Wrench', 'Scissors',
]

type Props = {
  value: string | null
  onChange: (icon: string | null) => void
  anchorEl: HTMLElement | null
  onClose: () => void
}

export function IconPicker({ value, onChange, anchorEl, onClose }: Props) {
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const filtered = search
    ? Object.keys(icons).filter(name => name.toLowerCase().includes(search.toLowerCase())).slice(0, 63)
    : CURATED_ICONS

  // Position below the anchor element
  const rect = anchorEl?.getBoundingClientRect()
  const style: React.CSSProperties = rect ? {
    position: 'fixed',
    top: rect.bottom + 8,
    left: rect.left + rect.width / 2 - 128,
    zIndex: 9999,
  } : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }

  return (
    <div ref={ref} style={style} className="icon-picker">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="icon-picker-search"
      />
      <div className="icon-picker-grid">
        {value && (
          <button
            className="icon-picker-item icon-picker-remove"
            onClick={() => { onChange(null); onClose() }}
            title="Remove icon"
          >
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>x</span>
          </button>
        )}
        {filtered.map(name => (
          <button
            key={name}
            className={`icon-picker-item${value === name ? ' active' : ''}`}
            onClick={() => { onChange(name); onClose() }}
            title={name}
          >
            <LucideIcon name={name} size={16} color="rgba(0,0,0,0.7)" strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  )
}
