import { supabase } from '@/integrations/supabase/client'
import type { Cadence, HexColor, Owner } from './types'

export type BaselineSubPodSpec = {
  name: string
  color: HexColor
}

export type BaselinePodSpec = {
  name: string
  color: HexColor
  owner: Owner | null
  is_priority: boolean
  cadence: Cadence
  description: string
  capacity: number | null
  subPods: BaselineSubPodSpec[]
}

export const BASELINE_WORKSPACE_PODS: BaselinePodSpec[] = [
  {
    name: 'MAPS',
    color: '#E53935',
    owner: 'moj_mahdara',
    is_priority: true,
    cadence: 'monthly',
    description: 'Strategic map relationships and high-context network nodes.',
    capacity: null,
    subPods: [
      { name: 'Music', color: '#E53935' },
      { name: 'Hospitality', color: '#E53935' },
      { name: 'Silicon Valley / Tech', color: '#E53935' },
      { name: 'Philanthropy', color: '#E53935' },
      { name: 'Beauty', color: '#E53935' },
      { name: 'Fashion', color: '#E53935' },
      { name: 'Family & Friends', color: '#E53935' },
      { name: 'Art', color: '#E53935' },
      { name: 'VCs/Investment Exec', color: '#E53935' },
    ],
  },
  {
    name: 'LPs',
    color: '#FF6B8A',
    owner: 'moj_mahdara',
    is_priority: true,
    cadence: 'monthly',
    description: 'Limited partners and fundraising relationships.',
    capacity: null,
    subPods: [
      { name: 'LP Internal', color: '#FF6B8A' },
      { name: 'LP PR', color: '#FF6B8A' },
      { name: 'LP ABG', color: '#FF6B8A' },
    ],
  },
  {
    name: 'Companies',
    color: '#7E57C2',
    owner: 'moj_mahdara',
    is_priority: false,
    cadence: 'monthly',
    description: 'Portfolio companies, partners, and company relationships.',
    capacity: null,
    subPods: [
      { name: 'Brand Partners', color: '#7E57C2' },
      { name: 'Portfolio', color: '#7E57C2' },
      { name: 'Pipeline', color: '#7E57C2' },
    ],
  },
  {
    name: 'Services for Founders',
    color: '#F5A623',
    owner: 'moj_mahdara',
    is_priority: false,
    cadence: 'monthly',
    description: 'Service providers who support founders and portfolio companies.',
    capacity: null,
    subPods: [
      { name: 'Design', color: '#F5A623' },
      { name: 'Development', color: '#F5A623' },
      { name: 'PR & Comms', color: '#F5A623' },
      { name: 'Legal', color: '#F5A623' },
      { name: 'Branding', color: '#F5A623' },
      { name: 'Web Design + Dev', color: '#F5A623' },
      { name: 'Virtual Event + Video Production', color: '#F5A623' },
      { name: 'Virtual Assistants', color: '#F5A623' },
      { name: 'Venues (NY Events)', color: '#F5A623' },
      { name: 'Swag Providers', color: '#F5A623' },
      { name: 'SEO', color: '#F5A623' },
      { name: 'Sales', color: '#F5A623' },
      { name: 'Recruiting', color: '#F5A623' },
      { name: 'Product Design', color: '#F5A623' },
      { name: 'Pricing Strategy', color: '#F5A623' },
      { name: 'PR', color: '#F5A623' },
      { name: 'Performance & Growth Marketing', color: '#F5A623' },
      { name: 'HR + Benefits', color: '#F5A623' },
      { name: 'Freelance/Gig Workers (Startup/VC)', color: '#F5A623' },
      { name: 'Finance', color: '#F5A623' },
      { name: 'Executive Coaching', color: '#F5A623' },
      { name: 'Digital Marketing', color: '#F5A623' },
      { name: 'Dev Shops', color: '#F5A623' },
      { name: 'Customer Support', color: '#F5A623' },
      { name: 'Copywriters', color: '#F5A623' },
    ],
  },
  {
    name: 'Maps Lite',
    color: '#1F2329',
    owner: 'moj_mahdara',
    is_priority: false,
    cadence: 'monthly',
    description: 'Lightweight map relationships without sub-pods.',
    capacity: null,
    subPods: [],
  },
  {
    name: 'Talent & Influencers',
    color: '#25B439',
    owner: 'moj_mahdara',
    is_priority: false,
    cadence: 'quarterly',
    description: 'Talent, creators, influencers, and public-facing relationship nodes.',
    capacity: null,
    subPods: [
      { name: 'Execs/ thought leaders', color: '#25B439' },
      { name: 'Celebrities', color: '#25B439' },
    ],
  },
]

export async function ensureWorkspaceBaseline(userId: string, workspaceId: string): Promise<void> {
  if (!userId || !workspaceId) return

  const { data: existingPods, error: existingError } = await supabase
    .from('pods')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (existingError) throw existingError
  if ((existingPods ?? []).length > 0) return

  const { data: createdPods, error: podError } = await supabase
    .from('pods')
    .insert(BASELINE_WORKSPACE_PODS.map(pod => ({
      user_id: userId,
      workspace_id: workspaceId,
      name: pod.name,
      color: pod.color,
      owner: pod.owner,
      is_priority: pod.is_priority,
      cadence: pod.cadence,
      description: pod.description,
      capacity: pod.capacity,
      enrichment_opt_in: false,
    })))
    .select('id, name')

  if (podError) throw podError

  const podIdByName = new Map((createdPods ?? []).map(pod => [pod.name, pod.id]))
  const categoryRows = BASELINE_WORKSPACE_PODS.flatMap(pod => {
    const podId = podIdByName.get(pod.name)
    if (!podId) return []
    return pod.subPods.map(subPod => ({
      user_id: userId,
      workspace_id: workspaceId,
      pod_id: podId,
      name: subPod.name,
      color: subPod.color,
    }))
  })

  if (categoryRows.length === 0) return

  const { error: categoryError } = await supabase.from('categories').insert(categoryRows)
  if (categoryError) throw categoryError
}
