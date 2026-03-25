import type { Pod, Category, Contact, Interaction, InteractionType, HexColor, Campaign, CampaignContact, CampaignType, CampaignContactStatus } from './types'

const DEMO_KEY = 'kinshipbrain:demo-mode'

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_KEY) === 'true'
}

export function setDemoMode(on: boolean) {
  localStorage.setItem(DEMO_KEY, on ? 'true' : 'false')
}

// Stable IDs so relationships stay consistent
const pod = (id: string, name: string, color: HexColor, priority: boolean, cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'): Pod => ({
  id: `demo-pod-${id}`, name, color, owner: 'moj_mahdara', is_priority: priority, cadence, created_at: '2026-01-15T00:00:00.000Z',
})

const cat = (id: string, podId: string, name: string, color: HexColor | null = null): Category => ({
  id: `demo-cat-${id}`, list_id: `demo-pod-${podId}`, name, color, created_at: '2026-01-15T00:00:00.000Z',
})

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function futureDate(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const contact = (id: string, name: string, opts: {
  email?: string, company?: string, role?: string, location?: string,
  podIds: string[], catIds?: string[], lastContacted?: number | null,
  birthday?: string, milestones?: string, interests?: string, context?: string,
}): Contact => ({
  id: `demo-contact-${id}`, name, email: opts.email ?? null,
  phone: null, company: opts.company ?? null, role: opts.role ?? null,
  location: opts.location ?? null, website: null, notes: null,
  recommended_by: null, specialization: null, past_clients: null,
  birthday: opts.birthday ?? null, milestones: opts.milestones ?? null,
  interests: opts.interests ?? null, relationship_context: opts.context ?? null,
  last_contacted_at: opts.lastContacted === null ? null : daysAgo(opts.lastContacted ?? 5),
  list_ids: opts.podIds.map(p => `demo-pod-${p}`),
  category_ids: (opts.catIds ?? []).map(c => `demo-cat-${c}`),
  created_at: '2026-01-15T00:00:00.000Z',
})

const ix = (id: string, contactId: string, type: InteractionType, daysBack: number, notes?: string): Interaction => ({
  id: `demo-ix-${id}`, contact_id: `demo-contact-${contactId}`, type,
  date: daysAgo(daysBack), notes: notes ?? null, created_at: daysAgo(daysBack),
})

// ── Pods ──

export const DEMO_PODS: Pod[] = [
  pod('maps', 'MAPS', '#E53935', true, 'biweekly'),
  pod('lps', 'LPs', '#FF6B8A', true, 'monthly'),
  pod('companies', 'Companies', '#7E57C2', false, 'monthly'),
  pod('talent', 'Talent & Influencers', '#25B439', false, 'quarterly'),
  pod('service', 'Services for Founders', '#F5A623', false, 'monthly'),
  pod('friends', 'Family & Friends', '#DAA520', true, 'biweekly'),
]

// ── Categories ──

export const DEMO_CATEGORIES: Category[] = [
  cat('sv', 'maps', 'Silicon Valley', '#E57373'),
  cat('ny', 'maps', 'New York', '#EF5350'),
  cat('la', 'maps', 'Los Angeles', '#F44336'),
  cat('series-a', 'lps', 'Series A', '#F48FB1'),
  cat('angels', 'lps', 'Angels', '#FF80AB'),
  cat('family-office', 'lps', 'Family Office', '#FF4081'),
  cat('design', 'service', 'Design', '#FFB74D'),
  cat('dev', 'service', 'Development', '#FFA726'),
  cat('pr', 'service', 'PR & Comms', '#FF9800'),
  cat('legal', 'service', 'Legal', '#FB8C00'),
  cat('brand', 'companies', 'Brand Partners', '#9575CD'),
  cat('portfolio', 'companies', 'Portfolio', '#7E57C2'),
  cat('inner', 'friends', 'Inner Circle', '#DAA520'),
  cat('mentors', 'friends', 'Mentors', '#C49B1A'),
]

// ── Contacts ──

export const DEMO_CONTACTS: Contact[] = [
  // MAPS — Silicon Valley
  contact('1', 'Sarah Chen', { email: 'sarah@acme.vc', company: 'Acme Ventures', role: 'Partner', location: 'San Francisco', podIds: ['maps'], catIds: ['sv'], lastContacted: 3, birthday: futureDate(12), milestones: 'Led Series B for Notion. Keynote at Disrupt 2025.', interests: 'AI infrastructure, climbing, contemporary art', context: 'Met at Founders Fund dinner. Strong connector — introduced us to 3 LPs.' }),
  contact('2', 'Marcus Rivera', { email: 'marcus@kinship.vc', company: 'Kinship Ventures', role: 'Principal', location: 'Palo Alto', podIds: ['maps'], catIds: ['sv'], lastContacted: 1, interests: 'DeFi, running, sci-fi novels' }),
  contact('3', 'Priya Patel', { email: 'priya@techstars.com', company: 'Techstars', role: 'MD', location: 'San Jose', podIds: ['maps'], catIds: ['sv'], lastContacted: 18, context: 'Old friend from Stanford. Always has deal flow.' }),
  // MAPS — New York
  contact('4', 'David Kim', { email: 'david@bloomberg.net', company: 'Bloomberg Beta', role: 'Partner', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 25, birthday: futureDate(5), milestones: 'Just had twins!', context: 'Warm intro from Sarah. Great taste in consumer brands.' }),
  contact('5', 'Nina Chowdhury', { email: 'nina@firstround.com', company: 'First Round', role: 'VP', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 8, interests: 'Climate tech, ceramics' }),
  // MAPS — LA
  contact('6', 'Jordan Hayes', { email: 'jordan@a16z.com', company: 'Andreessen Horowitz', role: 'Partner', location: 'Los Angeles', podIds: ['maps'], catIds: ['la'], lastContacted: 45, context: 'Haven\'t connected since the retreat. Need to re-engage.' }),
  // LPs
  contact('7', 'Emily Tran', { email: 'emily@tran.family', company: 'Tran Family Office', role: 'CIO', location: 'San Francisco', podIds: ['lps'], catIds: ['family-office'], lastContacted: 4, milestones: 'Committed $2M to Fund II', interests: 'Impact investing, wine, tennis' }),
  contact('8', 'Robert Okafor', { email: 'robert@okafor.capital', company: 'Okafor Capital', role: 'Founder', location: 'Chicago', podIds: ['lps'], catIds: ['angels'], lastContacted: 35, context: 'Warm but slow mover. Needs quarterly check-ins.' }),
  contact('9', 'Aisha Benali', { email: 'aisha@benali.vc', company: 'Benali Ventures', role: 'GP', location: 'Miami', podIds: ['lps'], catIds: ['series-a'], lastContacted: 12, birthday: futureDate(22) }),
  contact('10', 'James Whitfield', { email: 'james@whitfield.fam', company: 'Whitfield Trust', role: 'Trustee', location: 'Boston', podIds: ['lps'], catIds: ['family-office'], lastContacted: null }),
  // Companies
  contact('11', 'Luna Park', { email: 'luna@glossier.com', company: 'Glossier', role: 'CEO', location: 'New York', podIds: ['companies'], catIds: ['brand'], lastContacted: 6, interests: 'K-beauty, architecture, podcasts', context: 'Potential co-branding opportunity.' }),
  contact('12', 'Alex Moreau', { email: 'alex@figma.com', company: 'Figma', role: 'Head of Partnerships', location: 'San Francisco', podIds: ['companies'], catIds: ['portfolio'], lastContacted: 14 }),
  contact('13', 'Camille Dubois', { email: 'camille@chanel.com', company: 'Chanel', role: 'VP Innovation', location: 'Paris', podIds: ['companies'], catIds: ['brand'], lastContacted: 55 }),
  // Talent
  contact('14', 'Zara Mohammed', { email: 'zara@instagram.com', company: 'Instagram', role: 'Creator Partnerships', location: 'Los Angeles', podIds: ['talent'], lastContacted: 9, interests: 'Sustainable fashion, photography' }),
  contact('15', 'Kai Nakamura', { email: 'kai@youtube.com', company: 'YouTube', role: 'Talent Manager', location: 'Los Angeles', podIds: ['talent'], lastContacted: 22 }),
  // Services
  contact('16', 'Olivia Grant', { email: 'olivia@pentagram.com', company: 'Pentagram', role: 'Partner', location: 'New York', podIds: ['service'], catIds: ['design'], lastContacted: 7, context: 'Redesigned our deck. Incredible eye.' }),
  contact('17', 'Tom Bradley', { email: 'tom@launchsquad.com', company: 'LaunchSquad', role: 'MD', location: 'San Francisco', podIds: ['service'], catIds: ['pr'], lastContacted: 20 }),
  contact('18', 'Mia Chen', { email: 'mia@cooley.com', company: 'Cooley LLP', role: 'Partner', location: 'Palo Alto', podIds: ['service'], catIds: ['legal'], lastContacted: 30, milestones: 'Handled our Series A docs' }),
  // Friends
  contact('19', 'Gwyneth Paltrow', { email: 'gp@goop.com', company: 'Goop', role: 'Founder', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 2, birthday: futureDate(28), interests: 'Wellness, clean beauty, conscious business', context: 'Close friend. Exploring collab on relationship tools for Goop ecosystem.' }),
  contact('20', 'Briell Santos', { email: 'briell@kinship.vc', company: 'Kinship Ventures', role: 'Operations', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 0, context: 'Right hand. Manages Airtable, contacts, day-to-day ops.' }),
  contact('21', 'Deepak Chopra', { email: 'deepak@chopra.com', company: 'Chopra Global', role: 'Founder', location: 'San Diego', podIds: ['friends'], catIds: ['mentors'], lastContacted: 40, milestones: 'New book launching Q2', interests: 'Consciousness, meditation, quantum healing' }),
]

// ── Interactions (last 30 days) ──

export const DEMO_INTERACTIONS: Interaction[] = [
  // Sarah Chen — very active
  ix('1', '1', 'meeting', 3, 'Lunch at Nobu. Discussed Fund III strategy.'),
  ix('2', '1', 'email', 7), ix('3', '1', 'call', 12), ix('4', '1', 'intro', 15, 'Introduced to James at Whitfield Trust'),
  ix('5', '1', 'text', 20), ix('6', '1', 'meeting', 25),
  // Marcus — daily
  ix('7', '2', 'text', 1), ix('8', '2', 'call', 3), ix('9', '2', 'meeting', 5), ix('10', '2', 'email', 8),
  // Priya — cooling
  ix('11', '3', 'email', 18),
  // David — overdue, birthday soon
  ix('12', '4', 'call', 25), ix('13', '4', 'email', 28),
  // Nina
  ix('14', '5', 'meeting', 8), ix('15', '5', 'text', 10),
  // Jordan — very overdue
  ix('16', '6', 'email', 45),
  // Emily — active LP
  ix('17', '7', 'meeting', 4, 'Fund II commitment call'), ix('18', '7', 'email', 6), ix('19', '7', 'call', 14), ix('20', '7', 'text', 20),
  // Robert — quiet
  ix('21', '8', 'email', 35),
  // Aisha
  ix('22', '9', 'call', 12), ix('23', '9', 'email', 16),
  // Luna
  ix('24', '11', 'meeting', 6, 'Co-branding brainstorm'), ix('25', '11', 'email', 8),
  // Alex
  ix('26', '12', 'email', 14),
  // Zara
  ix('27', '14', 'call', 9), ix('28', '14', 'text', 12),
  // Olivia
  ix('29', '16', 'meeting', 7, 'Reviewed pitch deck designs'), ix('30', '16', 'email', 10),
  // Tom
  ix('31', '17', 'email', 20),
  // Gwyneth — very active
  ix('32', '19', 'text', 2), ix('33', '19', 'meeting', 5, 'Dinner at her place — talked about the app'),
  ix('34', '19', 'call', 9), ix('35', '19', 'text', 14), ix('36', '19', 'intro', 18, 'Introduced to wellness brand founder'),
  // Briell — daily
  ix('37', '20', 'text', 0), ix('38', '20', 'meeting', 1), ix('39', '20', 'call', 2), ix('40', '20', 'text', 3),
  // Deepak — fading
  ix('41', '21', 'call', 40),
]

// ── Campaigns ──

const campaign = (id: string, name: string, type: CampaignType, status: 'active' | 'completed', contactIds: string[], deadline?: number): Campaign => ({
  id: `demo-campaign-${id}`, name, type, status,
  deadline: deadline !== undefined ? futureDate(deadline) : null,
  contact_ids: contactIds.map(c => `demo-contact-${c}`),
  created_at: daysAgo(14),
})

const cc = (id: string, campaignId: string, contactId: string, status: CampaignContactStatus): CampaignContact => ({
  id: `demo-cc-${id}`, campaign_id: `demo-campaign-${campaignId}`, contact_id: `demo-contact-${contactId}`,
  status, notes: null, created_at: daysAgo(10),
})

export const DEMO_CAMPAIGNS: Campaign[] = [
  campaign('1', 'Fund III Launch Dinner', 'event', 'active', ['1', '4', '7', '8', '9'], 18),
  campaign('2', 'Brand Partnership Outreach', 'outreach', 'active', ['11', '13', '14'], 30),
  campaign('3', 'Q1 LP Check-ins', 'investment', 'completed', ['7', '8', '9', '10']),
]

export const DEMO_CAMPAIGN_CONTACTS: CampaignContact[] = [
  // Fund III Launch Dinner — mix of statuses
  cc('1', '1', '1', 'confirmed'),   // Sarah — confirmed
  cc('2', '1', '4', 'responded'),   // David — responded
  cc('3', '1', '7', 'confirmed'),   // Emily — confirmed
  cc('4', '1', '8', 'reached'),     // Robert — reached
  cc('5', '1', '9', 'pending'),     // Aisha — pending
  // Brand Partnership Outreach — early stage
  cc('6', '2', '11', 'responded'),  // Luna — responded
  cc('7', '2', '13', 'pending'),    // Camille — pending
  cc('8', '2', '14', 'reached'),    // Zara — reached
  // Q1 LP Check-ins — all done
  cc('9', '3', '7', 'confirmed'),
  cc('10', '3', '8', 'confirmed'),
  cc('11', '3', '9', 'confirmed'),
  cc('12', '3', '10', 'responded'),
]
