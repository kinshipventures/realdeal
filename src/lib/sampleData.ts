import type { Pod, Category, Contact, Interaction, InteractionType, HexColor, Campaign, CampaignContact, CampaignType, CampaignContactStatus, GlobalRegion, Gender, ContactFrequency, InteractionSource } from './types'

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
  first_name?: string, last_name?: string, linkedin?: string,
  country?: string, global_region?: GlobalRegion, gender?: Gender,
  introduced_by?: string, intel_notes?: string, relationship_owner?: string,
  contact_frequency?: ContactFrequency, next_follow_up_date?: number,
  next_action?: string, kv_fund_investor?: string[], spv_investor?: string[],
  needs_review?: boolean,
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
  first_name: opts.first_name ?? null,
  last_name: opts.last_name ?? null,
  linkedin: opts.linkedin ?? null,
  country: opts.country ?? null,
  global_region: opts.global_region ?? null,
  gender: opts.gender ?? null,
  introduced_by: opts.introduced_by ?? null,
  intel_notes: opts.intel_notes ?? null,
  relationship_owner: opts.relationship_owner ?? 'Moj',
  contact_frequency: opts.contact_frequency ?? null,
  next_follow_up_date: opts.next_follow_up_date !== undefined ? futureDate(opts.next_follow_up_date) : null,
  next_action: opts.next_action ?? null,
  kv_fund_investor: opts.kv_fund_investor ?? null,
  spv_investor: opts.spv_investor ?? null,
  needs_review: opts.needs_review ?? false,
  created_at: '2026-01-15T00:00:00.000Z',
})

const ix = (id: string, contactId: string, type: InteractionType, daysBack: number, notes?: string, extra?: {
  summary?: string, source?: InteractionSource, email_link?: string, granola_link?: string,
}): Interaction => ({
  id: `demo-ix-${id}`, contact_id: `demo-contact-${contactId}`, type,
  date: daysAgo(daysBack), notes: notes ?? null,
  summary: extra?.summary ?? null,
  source: extra?.source ?? 'Manual',
  email_link: extra?.email_link ?? null,
  granola_link: extra?.granola_link ?? null,
  created_at: daysAgo(daysBack),
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
  contact('1', 'Sarah Chen', { email: 'sarah@acme.vc', company: 'Acme Ventures', role: 'Partner', location: 'San Francisco', podIds: ['maps'], catIds: ['sv'], lastContacted: 3, birthday: futureDate(12), milestones: 'Led Series B for Notion. Keynote at Disrupt 2025.', interests: 'AI infrastructure, climbing, contemporary art', context: 'Met at Founders Fund dinner. Strong connector — introduced us to 3 LPs.', first_name: 'Sarah', last_name: 'Chen', linkedin: 'https://linkedin.com/in/sarahchen', country: 'United States', global_region: 'AMER', gender: 'Female', introduced_by: 'Peter Thiel', intel_notes: 'Strong LP connector. Has co-invested with Sequoia twice. Interested in consumer social.', contact_frequency: 'Weekly', next_follow_up_date: 7, next_action: 'Send Fund III deck', kv_fund_investor: ['Fund I', 'Fund II'] }),
  contact('2', 'Marcus Rivera', { email: 'marcus@kinship.vc', company: 'Kinship Ventures', role: 'Principal', location: 'Palo Alto', podIds: ['maps'], catIds: ['sv'], lastContacted: 1, interests: 'DeFi, running, sci-fi novels', first_name: 'Marcus', last_name: 'Rivera', country: 'United States', global_region: 'AMER', gender: 'Male', relationship_owner: 'Moj', contact_frequency: 'Weekly' }),
  contact('3', 'Priya Patel', { email: 'priya@techstars.com', company: 'Techstars', role: 'MD', location: 'San Jose', podIds: ['maps'], catIds: ['sv'], lastContacted: 18, context: 'Old friend from Stanford. Always has deal flow.', first_name: 'Priya', last_name: 'Patel', linkedin: 'https://linkedin.com/in/priyapatel', country: 'United States', global_region: 'AMER', gender: 'Female', introduced_by: 'Stanford network', intel_notes: 'Deep in hardware + climate. Good pulse on early seed.', contact_frequency: 'Monthly', next_follow_up_date: 3, next_action: 'Catch up call — overdue' }),
  // MAPS — New York
  contact('4', 'David Kim', { email: 'david@bloomberg.net', company: 'Bloomberg Beta', role: 'Partner', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 25, birthday: futureDate(5), milestones: 'Just had twins!', context: 'Warm intro from Sarah. Great taste in consumer brands.', first_name: 'David', last_name: 'Kim', linkedin: 'https://linkedin.com/in/davidkim', country: 'United States', global_region: 'AMER', gender: 'Male', introduced_by: 'Sarah Chen', intel_notes: 'Loves consumer brands. Birthday coming up — send gift for twins.', contact_frequency: 'Monthly', next_follow_up_date: 2, next_action: 'Send baby gift + congrats note' }),
  contact('5', 'Nina Chowdhury', { email: 'nina@firstround.com', company: 'First Round', role: 'VP', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 8, interests: 'Climate tech, ceramics', first_name: 'Nina', last_name: 'Chowdhury', country: 'United States', global_region: 'AMER', gender: 'Female', contact_frequency: 'Monthly' }),
  // MAPS — LA
  contact('6', 'Jordan Hayes', { email: 'jordan@a16z.com', company: 'Andreessen Horowitz', role: 'Partner', location: 'Los Angeles', podIds: ['maps'], catIds: ['la'], lastContacted: 45, context: 'Haven\'t connected since the retreat. Need to re-engage.', first_name: 'Jordan', last_name: 'Hayes', linkedin: 'https://linkedin.com/in/jordanhayes', country: 'United States', global_region: 'AMER', gender: 'Male', intel_notes: 'Went cold after the retreat. Was warm on consumer social thesis. Worth re-engaging.', contact_frequency: 'Monthly', next_action: 'Re-engage — send a relevant deal or article', needs_review: true }),
  // LPs
  contact('7', 'Emily Tran', { email: 'emily@tran.family', company: 'Tran Family Office', role: 'CIO', location: 'San Francisco', podIds: ['lps'], catIds: ['family-office'], lastContacted: 4, milestones: 'Committed $2M to Fund II', interests: 'Impact investing, wine, tennis', first_name: 'Emily', last_name: 'Tran', linkedin: 'https://linkedin.com/in/emilytran', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Committed $2M to Fund II. Strong advocate. Interested in impact metrics.', contact_frequency: 'Monthly', next_follow_up_date: 14, next_action: 'Send Q1 LP update', kv_fund_investor: ['Fund II'], spv_investor: ['SPV-Glossier'] }),
  contact('8', 'Robert Okafor', { email: 'robert@okafor.capital', company: 'Okafor Capital', role: 'Founder', location: 'Chicago', podIds: ['lps'], catIds: ['angels'], lastContacted: 35, context: 'Warm but slow mover. Needs quarterly check-ins.', first_name: 'Robert', last_name: 'Okafor', country: 'United States', global_region: 'AMER', gender: 'Male', intel_notes: 'Slow decision maker but loyal once committed. Prefers quarterly cadence.', contact_frequency: 'Quarterly', next_follow_up_date: 5, next_action: 'Quarterly check-in call', kv_fund_investor: ['Fund I'] }),
  contact('9', 'Aisha Benali', { email: 'aisha@benali.vc', company: 'Benali Ventures', role: 'GP', location: 'Miami', podIds: ['lps'], catIds: ['series-a'], lastContacted: 12, birthday: futureDate(22), first_name: 'Aisha', last_name: 'Benali', linkedin: 'https://linkedin.com/in/aishabenali', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Active GP in Miami. Strong LATAM network. Potential co-invest partner.', contact_frequency: 'Monthly', kv_fund_investor: ['Fund II'] }),
  contact('10', 'James Whitfield', { email: 'james@whitfield.fam', company: 'Whitfield Trust', role: 'Trustee', location: 'Boston', podIds: ['lps'], catIds: ['family-office'], lastContacted: null, first_name: 'James', last_name: 'Whitfield', country: 'United States', global_region: 'AMER', gender: 'Male', introduced_by: 'Sarah Chen', intel_notes: 'Intro from Sarah. Never contacted — need to reach out.', contact_frequency: 'Quarterly', next_action: 'Initial outreach email', needs_review: true }),
  // Companies
  contact('11', 'Luna Park', { email: 'luna@glossier.com', company: 'Glossier', role: 'CEO', location: 'New York', podIds: ['companies'], catIds: ['brand'], lastContacted: 6, interests: 'K-beauty, architecture, podcasts', context: 'Potential co-branding opportunity.', first_name: 'Luna', last_name: 'Park', linkedin: 'https://linkedin.com/in/lunapark', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Exploring co-branding for Fund III event. Strong brand alignment.', contact_frequency: 'Monthly', next_follow_up_date: 10, next_action: 'Follow up on co-brand proposal' }),
  contact('12', 'Alex Moreau', { email: 'alex@figma.com', company: 'Figma', role: 'Head of Partnerships', location: 'San Francisco', podIds: ['companies'], catIds: ['portfolio'], lastContacted: 14, first_name: 'Alex', last_name: 'Moreau', country: 'United States', global_region: 'AMER', gender: 'Male', contact_frequency: 'Monthly' }),
  contact('13', 'Camille Dubois', { email: 'camille@chanel.com', company: 'Chanel', role: 'VP Innovation', location: 'Paris', podIds: ['companies'], catIds: ['brand'], lastContacted: 55, first_name: 'Camille', last_name: 'Dubois', linkedin: 'https://linkedin.com/in/camilledubois', country: 'France', global_region: 'EU', gender: 'Female', intel_notes: 'Met at Paris Fashion Week. Interested in beauty tech innovation.', contact_frequency: 'Quarterly', next_action: 'Send beauty tech landscape deck', needs_review: true }),
  // Talent
  contact('14', 'Zara Mohammed', { email: 'zara@instagram.com', company: 'Instagram', role: 'Creator Partnerships', location: 'Los Angeles', podIds: ['talent'], lastContacted: 9, interests: 'Sustainable fashion, photography', first_name: 'Zara', last_name: 'Mohammed', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Key connector for influencer campaigns. Great taste in creators.', contact_frequency: 'Monthly' }),
  contact('15', 'Kai Nakamura', { email: 'kai@youtube.com', company: 'YouTube', role: 'Talent Manager', location: 'Los Angeles', podIds: ['talent'], lastContacted: 22, first_name: 'Kai', last_name: 'Nakamura', country: 'Japan', global_region: 'APAC', gender: 'Male', intel_notes: 'Based in LA but strong APAC creator network.', contact_frequency: 'Quarterly' }),
  // Services
  contact('16', 'Olivia Grant', { email: 'olivia@pentagram.com', company: 'Pentagram', role: 'Partner', location: 'New York', podIds: ['service'], catIds: ['design'], lastContacted: 7, context: 'Redesigned our deck. Incredible eye.', first_name: 'Olivia', last_name: 'Grant', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Redesigned Fund II deck. Best design partner we have.', contact_frequency: 'As Needed' }),
  contact('17', 'Tom Bradley', { email: 'tom@launchsquad.com', company: 'LaunchSquad', role: 'MD', location: 'San Francisco', podIds: ['service'], catIds: ['pr'], lastContacted: 20, first_name: 'Tom', last_name: 'Bradley', country: 'United States', global_region: 'AMER', gender: 'Male', contact_frequency: 'As Needed' }),
  contact('18', 'Mia Chen', { email: 'mia@cooley.com', company: 'Cooley LLP', role: 'Partner', location: 'Palo Alto', podIds: ['service'], catIds: ['legal'], lastContacted: 30, milestones: 'Handled our Series A docs', first_name: 'Mia', last_name: 'Chen', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Go-to legal counsel. Handled Series A + Fund I docs.', contact_frequency: 'As Needed' }),
  // Friends
  contact('19', 'Gwyneth Paltrow', { email: 'gp@goop.com', company: 'Goop', role: 'Founder', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 2, birthday: futureDate(28), interests: 'Wellness, clean beauty, conscious business', context: 'Close friend. Exploring collab on relationship tools for Goop ecosystem.', first_name: 'Gwyneth', last_name: 'Paltrow', linkedin: 'https://linkedin.com/in/gwynethpaltrow', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Close friend. Exploring Goop x Kinship collab on relationship wellness tools.', contact_frequency: 'Weekly', next_follow_up_date: 5, next_action: 'Share app prototype' }),
  contact('20', 'Briell Santos', { email: 'briell@kinship.vc', company: 'Kinship Ventures', role: 'Operations', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 0, context: 'Right hand. Manages Airtable, contacts, day-to-day ops.', first_name: 'Briell', last_name: 'Santos', country: 'United States', global_region: 'AMER', gender: 'Female', relationship_owner: 'Moj', intel_notes: 'Right hand for everything ops. Manages Airtable and contact data.', contact_frequency: 'Weekly' }),
  contact('21', 'Deepak Chopra', { email: 'deepak@chopra.com', company: 'Chopra Global', role: 'Founder', location: 'San Diego', podIds: ['friends'], catIds: ['mentors'], lastContacted: 40, milestones: 'New book launching Q2', interests: 'Consciousness, meditation, quantum healing', first_name: 'Deepak', last_name: 'Chopra', linkedin: 'https://linkedin.com/in/deepakchopra', country: 'United States', global_region: 'AMER', gender: 'Male', intel_notes: 'Mentor figure. New book Q2 — send congrats when it drops.', contact_frequency: 'Quarterly', next_action: 'Reconnect — been too long', needs_review: true }),
]

// ── Interactions (last 30 days) ──

export const DEMO_INTERACTIONS: Interaction[] = [
  // Sarah Chen — very active
  ix('1', '1', 'meeting', 3, 'Lunch at Nobu. Discussed Fund III strategy.', { summary: 'Discussed Fund III timeline and LP targets. Sarah offered to intro 2 new family offices.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-1' }),
  ix('2', '1', 'email', 7, null!, { summary: 'Sent Fund III one-pager for review.', source: 'Gmail', email_link: 'https://mail.google.com/demo-2' }),
  ix('3', '1', 'call', 12, null!, { summary: 'Quick sync on LP intro timing.', source: 'Manual' }),
  ix('4', '1', 'intro', 15, 'Introduced to James at Whitfield Trust', { summary: 'Sarah connected us with James Whitfield — strong family office prospect.', source: 'Manual' }),
  ix('5', '1', 'text', 20), ix('6', '1', 'meeting', 25, null!, { summary: 'Founders Fund dinner — casual catch-up on market conditions.', source: 'Manual' }),
  // Marcus — daily
  ix('7', '2', 'text', 1), ix('8', '2', 'call', 3, null!, { summary: 'Deal review — 2 new consumer social startups.', source: 'Manual' }),
  ix('9', '2', 'meeting', 5, null!, { summary: 'Weekly team standup.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-9' }),
  ix('10', '2', 'email', 8, null!, { summary: 'Shared competitive analysis doc.', source: 'Gmail', email_link: 'https://mail.google.com/demo-10' }),
  // Priya — cooling
  ix('11', '3', 'email', 18, null!, { summary: 'Catch-up email about Techstars batch.', source: 'Gmail', email_link: 'https://mail.google.com/demo-11' }),
  // David — overdue, birthday soon
  ix('12', '4', 'call', 25, null!, { summary: 'Congrats on the twins. Discussed consumer brand thesis.', source: 'Manual' }),
  ix('13', '4', 'email', 28, null!, { summary: 'Initial intro email via Sarah.', source: 'Gmail', email_link: 'https://mail.google.com/demo-13' }),
  // Nina
  ix('14', '5', 'meeting', 8, null!, { summary: 'Coffee in Soho — talked climate portfolio.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-14' }),
  ix('15', '5', 'text', 10),
  // Jordan — very overdue
  ix('16', '6', 'email', 45, null!, { summary: 'Post-retreat follow-up. No response yet.', source: 'Gmail', email_link: 'https://mail.google.com/demo-16' }),
  // Emily — active LP
  ix('17', '7', 'meeting', 4, 'Fund II commitment call', { summary: 'Emily confirmed $2M commitment to Fund II. Wants impact reporting.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-17' }),
  ix('18', '7', 'email', 6, null!, { summary: 'Sent commitment docs for signature.', source: 'Gmail', email_link: 'https://mail.google.com/demo-18' }),
  ix('19', '7', 'call', 14, null!, { summary: 'Discussed impact metrics framework.', source: 'Manual' }),
  ix('20', '7', 'text', 20),
  // Robert — quiet
  ix('21', '8', 'email', 35, null!, { summary: 'Quarterly update email. Brief reply.', source: 'Gmail', email_link: 'https://mail.google.com/demo-21' }),
  // Aisha
  ix('22', '9', 'call', 12, null!, { summary: 'Explored LATAM co-invest opportunities.', source: 'Manual' }),
  ix('23', '9', 'email', 16, null!, { summary: 'Shared LATAM market research.', source: 'Gmail', email_link: 'https://mail.google.com/demo-23' }),
  // Luna
  ix('24', '11', 'meeting', 6, 'Co-branding brainstorm', { summary: 'Brainstormed Glossier x Kinship co-brand for Fund III event.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-24' }),
  ix('25', '11', 'email', 8, null!, { summary: 'Sent mood board for event concept.', source: 'Gmail', email_link: 'https://mail.google.com/demo-25' }),
  // Alex
  ix('26', '12', 'email', 14, null!, { summary: 'Partnership renewal discussion.', source: 'Gmail', email_link: 'https://mail.google.com/demo-26' }),
  // Zara
  ix('27', '14', 'call', 9, null!, { summary: 'Discussed creator strategy for Fund III launch.', source: 'Manual' }),
  ix('28', '14', 'text', 12),
  // Olivia
  ix('29', '16', 'meeting', 7, 'Reviewed pitch deck designs', { summary: 'Reviewed v3 of Fund III deck. Minor tweaks needed on data viz pages.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-29' }),
  ix('30', '16', 'email', 10, null!, { summary: 'Sent design brief for LP dinner invite.', source: 'Gmail', email_link: 'https://mail.google.com/demo-30' }),
  // Tom
  ix('31', '17', 'email', 20, null!, { summary: 'PR timeline for Fund III announcement.', source: 'Gmail', email_link: 'https://mail.google.com/demo-31' }),
  // Gwyneth — very active
  ix('32', '19', 'text', 2), ix('33', '19', 'meeting', 5, 'Dinner at her place — talked about the app', { summary: 'Showed Gwyneth the app prototype. She loved the relationship equity concept. Wants to explore Goop integration.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-33' }),
  ix('34', '19', 'call', 9, null!, { summary: 'Discussed wellness x relationships angle for Goop.', source: 'Manual' }),
  ix('35', '19', 'text', 14), ix('36', '19', 'intro', 18, 'Introduced to wellness brand founder', { summary: 'GP introduced us to a wellness brand founder — potential portfolio company.', source: 'Manual' }),
  // Briell — daily
  ix('37', '20', 'text', 0), ix('38', '20', 'meeting', 1, null!, { summary: 'Daily sync — reviewed Airtable data cleanup progress.', source: 'Granola', granola_link: 'https://granola.ai/notes/demo-38' }),
  ix('39', '20', 'call', 2, null!, { summary: 'Quick call about import script issues.', source: 'Manual' }),
  ix('40', '20', 'text', 3),
  // Deepak — fading
  ix('41', '21', 'call', 40, null!, { summary: 'Checked in about new book. He mentioned wanting to reconnect more.', source: 'Manual' }),
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
