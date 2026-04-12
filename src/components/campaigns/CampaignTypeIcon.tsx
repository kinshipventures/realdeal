import {
  CalendarDays, TrendingUp, Send, GitBranch,
  PiggyBank, Users, Handshake, Folder,
} from 'lucide-react'
import type { CampaignType } from '../../lib/types'
import { TYPE_COLORS } from './campaignUtils'

const ICON_MAP: Record<CampaignType, React.ComponentType<any>> = {
  event: CalendarDays,
  investment: TrendingUp,
  outreach: Send,
  deal_flow: GitBranch,
  fundraise: PiggyBank,
  talent: Users,
  partnerships: Handshake,
  other: Folder,
}

interface Props {
  type: CampaignType
  size?: number
  colored?: boolean
}

export function CampaignTypeIcon({ type, size = 14, colored = true }: Props) {
  const Icon = ICON_MAP[type] ?? Folder
  return <Icon size={size} color={colored ? TYPE_COLORS[type] : 'currentColor'} strokeWidth={1.8} />
}
