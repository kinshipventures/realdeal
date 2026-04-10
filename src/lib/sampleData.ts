import type { Pod, Category, Contact, Interaction, InteractionType, HexColor, Campaign, CampaignContact, CampaignStage, CampaignType, CampaignContactStatus, GlobalRegion, Gender, ContactFrequency, InteractionSource, Pipeline, PipelineStage, Opportunity, Project, PipelineStatus, OpportunityStatus, OpportunityPriority, Company } from './types'

const DEMO_KEY = 'realdeal:demo-mode'

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_KEY) === 'true'
}

export function setDemoMode(on: boolean) {
  localStorage.setItem(DEMO_KEY, on ? 'true' : 'false')
}

// Stable IDs so relationships stay consistent
const pod = (id: string, name: string, color: HexColor, priority: boolean, cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly', description: string | null = null, capacity: number | null = null): Pod => ({
  id: `demo-pod-${id}`, name, color, owner: 'moj_mahdara', is_priority: priority, cadence, description, capacity, enrichment_opt_in: false, created_at: '2026-01-15T00:00:00.000Z',
})

const cat = (id: string, podId: string, name: string, color: HexColor | null = null, icon: string | null = null): Category => ({
  id: `demo-cat-${id}`, list_id: `demo-pod-${podId}`, name, color, icon, created_at: '2026-01-15T00:00:00.000Z',
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
  email?: string, email_2?: string, email_3?: string,
  company?: string, role?: string, location?: string,
  podIds: string[], catIds?: string[], lastContacted?: number | null,
  birthday?: string, milestones?: string, interests?: string, context?: string,
  first_name?: string, last_name?: string, linkedin?: string,
  country?: string, global_region?: GlobalRegion, gender?: Gender,
  introduced_by?: string, intel_notes?: string, relationship_owner?: string,
  contact_frequency?: ContactFrequency, next_follow_up_date?: number,
  next_action?: string, kv_fund_investor?: string[], spv_investor?: string[],
  needs_review?: boolean,
  // v2 fields
  type?: 'Contact' | 'Company', status?: 'Active' | 'Pending' | 'Archived',
  company_record_id?: string | null, industry?: string | null,
  stage?: string | null, ticker?: string | null, domain?: string | null,
  primary_pod?: string, cadence_override?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
}): Contact => ({
  id: `demo-contact-${id}`, name, email: opts.email ?? null,
  email_2: opts.email_2 ?? null, email_3: opts.email_3 ?? null,
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
  type: opts.type ?? 'Contact',
  status: opts.status ?? 'Active',
  company_record_id: opts.company_record_id ?? null,
  industry: opts.industry ?? null,
  stage: opts.stage ?? null,
  ticker: opts.ticker ?? null,
  domain: opts.domain ?? null,
  communication_preferences: null,
  custom_fields: {},
  primary_list_id: opts.primary_pod ? `demo-pod-${opts.primary_pod}` : null,
  cadence_override: opts.cadence_override ?? null,
  created_at: '2026-01-15T00:00:00.000Z',
})

const ix = (id: string, contactId: string, type: InteractionType, daysBack: number, notes?: string, extra?: {
  summary?: string, source?: InteractionSource, email_link?: string, granola_link?: string,
  event_detail?: string, actor?: string,
}): Interaction => ({
  id: `demo-ix-${id}`, contact_id: `demo-contact-${contactId}`, type,
  date: daysAgo(daysBack), notes: notes ?? null,
  summary: extra?.summary ?? null,
  source: extra?.source ?? (type === 'pod_change' || type === 'field_update' || type === 'categorization' || type === 'pipeline_event' ? null : 'Manual'),
  email_link: extra?.email_link ?? null,
  granola_link: extra?.granola_link ?? null,
  event_detail: extra?.event_detail ?? null,
  actor: extra?.actor ?? null,
  created_at: daysAgo(daysBack),
})

// ── Pods ──

export const DEMO_PODS: Pod[] = [
  pod('maps', 'MAPS', '#E53935', true, 'biweekly', 'Key investors, partners, and strategic relationships across major markets', 25),
  pod('lps', 'LPs', '#FF6B8A', true, 'monthly', 'Limited partners — current and prospective Fund III investors', 15),
  pod('companies', 'Companies', '#7E57C2', false, 'monthly', 'Brand partners, portfolio companies, and corporate relationships'),
  pod('talent', 'Talent & Influencers', '#25B439', false, 'quarterly', 'Creator partners, talent managers, and influencer relationships', 20),
  pod('service', 'Services for Founders', '#F5A623', false, 'monthly', 'Design, legal, PR, and dev partners who support portfolio companies'),
  pod('friends', 'Family & Friends', '#DAA520', true, 'biweekly', 'Inner circle, mentors, and close personal relationships', 10),
]

// ── Categories ──

export const DEMO_CATEGORIES: Category[] = [
  cat('sv', 'maps', 'Silicon Valley', '#E57373', 'Cpu'),
  cat('ny', 'maps', 'New York', '#EF5350', 'Building2'),
  cat('la', 'maps', 'Los Angeles', '#F44336', 'Sun'),
  cat('series-a', 'lps', 'Series A', '#F48FB1', 'TrendingUp'),
  cat('angels', 'lps', 'Angels', '#FF80AB', 'Heart'),
  cat('family-office', 'lps', 'Family Office', '#FF4081', 'Landmark'),
  cat('design', 'service', 'Design', '#FFB74D', 'Palette'),
  cat('dev', 'service', 'Development', '#FFA726', 'Code'),
  cat('pr', 'service', 'PR & Comms', '#FF9800', 'Megaphone'),
  cat('legal', 'service', 'Legal', '#FB8C00', 'Scale'),
  cat('brand', 'companies', 'Brand Partners', '#9575CD', 'Sparkles'),
  cat('portfolio', 'companies', 'Portfolio', '#7E57C2', 'Briefcase'),
  cat('inner', 'friends', 'Inner Circle', '#DAA520', 'Star'),
  cat('mentors', 'friends', 'Mentors', '#C49B1A', 'GraduationCap'),
]

// ── Contacts ──

export const DEMO_CONTACTS: Contact[] = [
  // MAPS — Silicon Valley
  contact('1', 'Sarah Chen', { email: 'sarah@acme.vc', email_2: 'sarah.chen@gmail.com', company: 'Acme Ventures', role: 'Partner', location: 'San Francisco', podIds: ['maps'], catIds: ['sv'], lastContacted: 3, birthday: futureDate(12), milestones: 'Led Series B for Notion. Keynote at Disrupt 2025.', interests: 'AI infrastructure, climbing, contemporary art', context: 'Met at Founders Fund dinner. Strong connector — introduced us to 3 LPs.', first_name: 'Sarah', last_name: 'Chen', linkedin: 'https://linkedin.com/in/sarahchen', country: 'United States', global_region: 'AMER', gender: 'Female', introduced_by: 'Peter Thiel', intel_notes: 'Strong LP connector. Has co-invested with Sequoia twice. Interested in consumer social.', contact_frequency: 'Weekly', next_follow_up_date: 7, next_action: 'Send Fund III deck', kv_fund_investor: ['Fund I', 'Fund II'], primary_pod: 'maps' }),
  contact('2', 'Marcus Rivera', { email: 'marcus@kinship.vc', company: 'Kinship Ventures', role: 'Principal', location: 'Palo Alto', podIds: ['maps'], catIds: ['sv'], lastContacted: 1, interests: 'DeFi, running, sci-fi novels', first_name: 'Marcus', last_name: 'Rivera', country: 'United States', global_region: 'AMER', gender: 'Male', relationship_owner: 'Moj', contact_frequency: 'Weekly' }),
  contact('3', 'Priya Patel', { email: 'priya@techstars.com', company: 'Techstars', role: 'MD', location: 'San Jose', podIds: ['maps'], catIds: ['sv'], lastContacted: 18, context: 'Old friend from Stanford. Always has deal flow.', first_name: 'Priya', last_name: 'Patel', linkedin: 'https://linkedin.com/in/priyapatel', country: 'United States', global_region: 'AMER', gender: 'Female', introduced_by: 'Stanford network', intel_notes: 'Deep in hardware + climate. Good pulse on early seed.', contact_frequency: 'Monthly', next_follow_up_date: 3, next_action: 'Catch up call — overdue' }),
  // MAPS — New York
  contact('4', 'David Kim', { email: 'david@bloomberg.net', company: 'Bloomberg Beta', role: 'Partner', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 25, birthday: futureDate(5), milestones: 'Just had twins!', context: 'Warm intro from Sarah. Great taste in consumer brands.', first_name: 'David', last_name: 'Kim', linkedin: 'https://linkedin.com/in/davidkim', country: 'United States', global_region: 'AMER', gender: 'Male', introduced_by: 'Sarah Chen', intel_notes: 'Loves consumer brands. Birthday coming up — send gift for twins.', contact_frequency: 'Monthly', next_follow_up_date: 2, next_action: 'Send baby gift + congrats note' }),
  contact('5', 'Nina Chowdhury', { email: 'nina@firstround.com', company: 'First Round', role: 'VP', location: 'New York', podIds: ['maps'], catIds: ['ny'], lastContacted: 8, interests: 'Climate tech, ceramics', first_name: 'Nina', last_name: 'Chowdhury', country: 'United States', global_region: 'AMER', gender: 'Female', contact_frequency: 'Monthly' }),
  // MAPS — LA
  contact('6', 'Jordan Hayes', { email: 'jordan@a16z.com', company: 'Andreessen Horowitz', role: 'Partner', location: 'Los Angeles', podIds: ['maps'], catIds: ['la'], lastContacted: 45, context: 'Haven\'t connected since the retreat. Need to re-engage.', first_name: 'Jordan', last_name: 'Hayes', linkedin: 'https://linkedin.com/in/jordanhayes', country: 'United States', global_region: 'AMER', gender: 'Male', intel_notes: 'Went cold after the retreat. Was warm on consumer social thesis. Worth re-engaging.', contact_frequency: 'Monthly', next_action: 'Re-engage — send a relevant deal or article', needs_review: true }),
  // LPs
  contact('7', 'Emily Tran', { email: 'emily@tran.family', email_2: 'emily.tran@personal.com', company: 'Tran Family Office', role: 'CIO', location: 'San Francisco', podIds: ['lps'], catIds: ['family-office'], lastContacted: 4, milestones: 'Committed $2M to Fund II', interests: 'Impact investing, wine, tennis', first_name: 'Emily', last_name: 'Tran', linkedin: 'https://linkedin.com/in/emilytran', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Committed $2M to Fund II. Strong advocate. Interested in impact metrics.', contact_frequency: 'Monthly', next_follow_up_date: 14, next_action: 'Send Q1 LP update', kv_fund_investor: ['Fund II'], spv_investor: ['SPV-Glossier'], primary_pod: 'lps', cadence_override: 'biweekly' }),
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
  contact('16', 'Olivia Grant', { email: 'olivia@pentagram.com', company: 'Pentagram', role: 'Partner', location: 'New York', podIds: ['service'], catIds: ['design'], lastContacted: 7, context: 'Redesigned our deck. Incredible eye.', first_name: 'Olivia', last_name: 'Grant', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Redesigned Fund II deck. Best design partner we have.', contact_frequency: 'As Needed', primary_pod: 'service' }),
  contact('17', 'Tom Bradley', { email: 'tom@launchsquad.com', company: 'LaunchSquad', role: 'MD', location: 'San Francisco', podIds: ['service'], catIds: ['pr'], lastContacted: 20, first_name: 'Tom', last_name: 'Bradley', country: 'United States', global_region: 'AMER', gender: 'Male', contact_frequency: 'As Needed' }),
  contact('18', 'Mia Chen', { email: 'mia@cooley.com', company: 'Cooley LLP', role: 'Partner', location: 'Palo Alto', podIds: ['service'], catIds: ['legal'], lastContacted: 30, milestones: 'Handled our Series A docs', first_name: 'Mia', last_name: 'Chen', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Go-to legal counsel. Handled Series A + Fund I docs.', contact_frequency: 'As Needed' }),
  // Friends
  contact('19', 'Gwyneth Paltrow', { email: 'gp@goop.com', company: 'Goop', role: 'Founder', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 2, birthday: futureDate(28), interests: 'Wellness, clean beauty, conscious business', context: 'Close friend. Exploring collab on relationship tools for Goop ecosystem.', first_name: 'Gwyneth', last_name: 'Paltrow', linkedin: 'https://linkedin.com/in/gwynethpaltrow', country: 'United States', global_region: 'AMER', gender: 'Female', intel_notes: 'Close friend. Exploring Goop x Kinship collab on relationship wellness tools.', contact_frequency: 'Weekly', next_follow_up_date: 5, next_action: 'Share app prototype', primary_pod: 'friends', cadence_override: 'weekly' }),
  contact('20', 'Briell Santos', { email: 'briell@kinship.vc', company: 'Kinship Ventures', role: 'Operations', location: 'Los Angeles', podIds: ['friends'], catIds: ['inner'], lastContacted: 0, context: 'Right hand. Manages Airtable, contacts, day-to-day ops.', first_name: 'Briell', last_name: 'Santos', country: 'United States', global_region: 'AMER', gender: 'Female', relationship_owner: 'Moj', intel_notes: 'Right hand for everything ops. Manages Airtable and contact data.', contact_frequency: 'Weekly' }),
  contact('21', 'Deepak Chopra', { email: 'deepak@chopra.com', company: 'Chopra Global', role: 'Founder', location: 'San Diego', podIds: ['friends'], catIds: ['mentors'], lastContacted: 40, milestones: 'New book launching Q2', interests: 'Consciousness, meditation, quantum healing', first_name: 'Deepak', last_name: 'Chopra', linkedin: 'https://linkedin.com/in/deepakchopra', country: 'United States', global_region: 'AMER', gender: 'Male', intel_notes: 'Mentor figure. New book Q2 — send congrats when it drops.', contact_frequency: 'Quarterly', next_action: 'Reconnect — been too long', needs_review: true }),
  // Company records (type='Company')
  contact('company_1', 'Andreessen Horowitz', { podIds: ['companies'], catIds: ['brand'], type: 'Company', status: 'Active', industry: 'Venture Capital', stage: 'Growth', domain: 'a16z.com', lastContacted: null }),
  contact('company_2', 'Sequoia Capital', { podIds: ['companies'], catIds: ['portfolio'], type: 'Company', status: 'Active', industry: 'Venture Capital', stage: 'Growth', domain: 'sequoiacap.com', lastContacted: null }),
  // Pending contacts — uncategorized, show in pending tray + categorization queue
  contact('pending_1', 'Rina Takahashi', { email: 'rina@softbank.com', company: 'SoftBank Vision Fund', role: 'Associate', location: 'Tokyo', podIds: [], status: 'Pending', first_name: 'Rina', last_name: 'Takahashi', country: 'Japan', global_region: 'APAC', gender: 'Female', lastContacted: null }),
  contact('pending_2', 'Marco Bellini', { email: 'marco@lvmh.com', company: 'LVMH', role: 'VP Digital Strategy', location: 'Milan', podIds: [], status: 'Pending', first_name: 'Marco', last_name: 'Bellini', country: 'Italy', global_region: 'EU', gender: 'Male', lastContacted: null, intel_notes: 'Met at Milan Design Week. Interested in luxury x tech.' }),
  contact('pending_3', 'Amara Osei', { email: 'amara@stripe.com', company: 'Stripe', role: 'Head of Partnerships', location: 'San Francisco', podIds: [], status: 'Pending', first_name: 'Amara', last_name: 'Osei', country: 'United States', global_region: 'AMER', gender: 'Female', lastContacted: null }),
  contact('pending_4', 'Yuki Tanaka', { email: 'yuki@uniqlo.com', company: 'Uniqlo', role: 'Innovation Lead', location: 'Tokyo', podIds: [], status: 'Pending', first_name: 'Yuki', last_name: 'Tanaka', country: 'Japan', global_region: 'APAC', gender: 'Female', lastContacted: null, context: 'Warm intro from Kai — interested in creator economy.' }),
  contact('pending_5', 'Omar Hassan', { email: 'omar@checkout.com', company: 'Checkout.com', role: 'CTO', location: 'London', podIds: [], status: 'Pending', first_name: 'Omar', last_name: 'Hassan', country: 'United Kingdom', global_region: 'EU', gender: 'Male', lastContacted: null }),
  contact('pending_6', 'Sofia Reyes', { email: 'sofia@kavak.com', company: 'Kavak', role: 'Co-founder', location: 'Mexico City', podIds: [], status: 'Pending', first_name: 'Sofia', last_name: 'Reyes', country: 'Mexico', global_region: 'LATAM', gender: 'Female', lastContacted: null, intel_notes: 'LATAM unicorn founder. Potential LP or portfolio connection.' }),
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
  // System events — interleaved across contacts
  ix('42', '7', 'categorization', 5, 'Categorized into: LPs. Primary: LPs.', { event_detail: '{"pods":["demo-pod-lps"],"primaryPod":"demo-pod-lps","answeredFields":[]}', actor: 'You' }),
  ix('43', '1', 'pod_change', 10, 'Added to MAPS pod', { event_detail: '{"action":"added","pod":"MAPS"}', actor: 'You' }),
  ix('44', '4', 'field_update', 22, 'Updated industry to "Venture Capital"', { event_detail: '{"field":"industry","oldValue":null,"newValue":"Venture Capital"}', actor: 'You' }),
  ix('45', '9', 'pipeline_event', 13, 'Stage changed to Due Diligence', { event_detail: '{"pipeline":"LP Fundraising","stage":"Due Diligence"}', actor: 'You' }),
  ix('46', '19', 'field_update', 4, 'Updated next follow-up to 7 days', { event_detail: '{"field":"next_follow_up_date","oldValue":null,"newValue":"2026-04-05"}', actor: 'You' }),
]

// ── Campaigns ──

const campaign = (id: string, name: string, type: CampaignType, status: 'active' | 'completed', contactIds: string[], deadline?: number): Campaign => ({
  id: `demo-campaign-${id}`, name, type, status, backing: 'outreach',
  deadline: deadline !== undefined ? futureDate(deadline) : null,
  contact_ids: contactIds.map(c => `demo-contact-${c}`),
  created_at: daysAgo(14),
})

const cc = (id: string, campaignId: string, contactId: string, status: CampaignContactStatus, stageId: string, movedDaysAgo = 3): CampaignContact => ({
  id: `demo-cc-${id}`, campaign_id: `demo-campaign-${campaignId}`, contact_id: `demo-contact-${contactId}`,
  status, stage_id: `demo-cs-${stageId}`, notes: null, owner: null, next_step: null, next_step_due: null, moved_at: daysAgo(movedDaysAgo), created_at: daysAgo(10),
})

export const DEMO_CAMPAIGNS: Campaign[] = [
  campaign('1', 'Fund III Launch Dinner', 'event', 'active', ['1', '4', '7', '8', '9'], 18),
  campaign('2', 'Brand Partnership Outreach', 'outreach', 'active', ['11', '13', '14'], 30),
  campaign('3', 'Q1 LP Check-ins', 'investment', 'completed', ['7', '8', '9', '10']),
]

// Campaign 1: Event stages
// Campaign 2: Outreach stages
// Campaign 3: Investment stages
export const DEMO_CAMPAIGN_STAGES: CampaignStage[] = [
  { id: 'demo-cs-1a', campaign_id: 'demo-campaign-1', name: 'Invited', color: '#718096', order: 0, created_at: daysAgo(14) },
  { id: 'demo-cs-1b', campaign_id: 'demo-campaign-1', name: "RSVP'd", color: '#4299E1', order: 1, created_at: daysAgo(14) },
  { id: 'demo-cs-1c', campaign_id: 'demo-campaign-1', name: 'Confirmed', color: '#ECC94B', order: 2, created_at: daysAgo(14) },
  { id: 'demo-cs-1d', campaign_id: 'demo-campaign-1', name: 'Attended', color: '#48BB78', order: 3, created_at: daysAgo(14) },

  { id: 'demo-cs-2a', campaign_id: 'demo-campaign-2', name: 'Identified', color: '#718096', order: 0, created_at: daysAgo(14) },
  { id: 'demo-cs-2b', campaign_id: 'demo-campaign-2', name: 'Contacted', color: '#4299E1', order: 1, created_at: daysAgo(14) },
  { id: 'demo-cs-2c', campaign_id: 'demo-campaign-2', name: 'Responded', color: '#ECC94B', order: 2, created_at: daysAgo(14) },
  { id: 'demo-cs-2d', campaign_id: 'demo-campaign-2', name: 'Closed', color: '#48BB78', order: 3, created_at: daysAgo(14) },

  { id: 'demo-cs-3a', campaign_id: 'demo-campaign-3', name: 'Researching', color: '#718096', order: 0, created_at: daysAgo(30) },
  { id: 'demo-cs-3b', campaign_id: 'demo-campaign-3', name: 'Outreach', color: '#4299E1', order: 1, created_at: daysAgo(30) },
  { id: 'demo-cs-3c', campaign_id: 'demo-campaign-3', name: 'In Diligence', color: '#ECC94B', order: 2, created_at: daysAgo(30) },
  { id: 'demo-cs-3d', campaign_id: 'demo-campaign-3', name: 'Committed', color: '#48BB78', order: 3, created_at: daysAgo(30) },
]

export const DEMO_CAMPAIGN_CONTACTS: CampaignContact[] = [
  // Fund III Launch Dinner — spread across event stages
  cc('1', '1', '1', 'confirmed', '1d', 1),   // Sarah — Attended
  cc('2', '1', '4', 'responded', '1c', 2),   // David — Confirmed
  cc('3', '1', '7', 'confirmed', '1d', 1),   // Emily — Attended
  cc('4', '1', '8', 'reached', '1b', 9),     // Robert — RSVP'd (stalled 9 days)
  cc('5', '1', '9', 'pending', '1a', 3),     // Aisha — Invited
  // Brand Partnership Outreach — early stage
  cc('6', '2', '11', 'responded', '2c', 2),  // Luna — Responded
  cc('7', '2', '13', 'pending', '2a', 5),    // Camille — Identified
  cc('8', '2', '14', 'reached', '2b', 10),   // Zara — Contacted (stalled 10 days)
  // Q1 LP Check-ins — all in final stage
  cc('9', '3', '7', 'confirmed', '3d', 1),
  cc('10', '3', '8', 'confirmed', '3d', 1),
  cc('11', '3', '9', 'confirmed', '3d', 2),
  cc('12', '3', '10', 'responded', '3c', 8), // stalled
]

// ── Pipelines ──

export const DEMO_PIPELINES: Pipeline[] = [
  { id: 'rec_demo_pipe_1', name: 'LP Fundraising', status: 'active' as PipelineStatus, created_at: '2026-01-15T00:00:00.000Z' },
  { id: 'rec_demo_pipe_2', name: 'Deal Flow', status: 'active' as PipelineStatus, created_at: '2026-02-01T00:00:00.000Z' },
  { id: 'rec_demo_pipe_3', name: 'Talent Pipeline', status: 'hidden' as PipelineStatus, created_at: '2026-02-15T00:00:00.000Z' },
]

// ── Pipeline Stages ──

export const DEMO_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'rec_demo_stage_1', pipeline_id: 'rec_demo_pipe_1', name: 'Identified', color: '#718096', order: 1, created_at: '2026-01-15T00:00:00.000Z' },
  { id: 'rec_demo_stage_2', pipeline_id: 'rec_demo_pipe_1', name: 'Outreach', color: '#4299E1', order: 2, created_at: '2026-01-15T00:00:00.000Z' },
  { id: 'rec_demo_stage_3', pipeline_id: 'rec_demo_pipe_1', name: 'In Diligence', color: '#ECC94B', order: 3, created_at: '2026-01-15T00:00:00.000Z' },
  { id: 'rec_demo_stage_4', pipeline_id: 'rec_demo_pipe_1', name: 'Committed', color: '#48BB78', order: 4, created_at: '2026-01-15T00:00:00.000Z' },
  { id: 'rec_demo_stage_5', pipeline_id: 'rec_demo_pipe_2', name: 'Sourced', color: '#718096', order: 1, created_at: '2026-02-01T00:00:00.000Z' },
  { id: 'rec_demo_stage_6', pipeline_id: 'rec_demo_pipe_2', name: 'Reviewing', color: '#ECC94B', order: 2, created_at: '2026-02-01T00:00:00.000Z' },
]

// ── Opportunities ──

export const DEMO_OPPORTUNITIES: Opportunity[] = [
  { id: 'rec_demo_opp_1', name: 'Series A - Fund III', stage_id: 'rec_demo_stage_3', relationship_ids: ['demo-contact-1'], notes: 'Strong interest, awaiting IC review', priority: 'high' as OpportunityPriority, status: 'open' as OpportunityStatus, created_at: '2026-02-10T00:00:00.000Z' },
  { id: 'rec_demo_opp_2', name: 'Co-invest Opportunity', stage_id: 'rec_demo_stage_2', relationship_ids: ['demo-contact-2'], notes: null, priority: 'medium' as OpportunityPriority, status: 'open' as OpportunityStatus, created_at: '2026-02-20T00:00:00.000Z' },
  { id: 'rec_demo_opp_3', name: 'LP Commit - $500K', stage_id: 'rec_demo_stage_4', relationship_ids: ['demo-contact-3'], notes: 'Verbal commit received', priority: 'high' as OpportunityPriority, status: 'won' as OpportunityStatus, created_at: '2026-01-20T00:00:00.000Z' },
  { id: 'rec_demo_opp_4', name: 'Seed Deal Review', stage_id: 'rec_demo_stage_6', relationship_ids: ['demo-contact-4', 'demo-contact-company_1'], notes: 'Intro from a16z partner', priority: 'low' as OpportunityPriority, status: 'open' as OpportunityStatus, created_at: '2026-03-01T00:00:00.000Z' },
]

// ── Projects ──

export const DEMO_PROJECTS: Project[] = [
  { id: 'rec_demo_proj_1', name: 'Fund III Launch', description: 'Fundraising campaign for Fund III', owner: 'moj_mahdara', relationship_ids: ['demo-contact-1', 'demo-contact-3'], opportunity_ids: ['rec_demo_opp_1', 'rec_demo_opp_3'], notes: null, created_at: '2026-01-10T00:00:00.000Z' },
  { id: 'rec_demo_proj_2', name: 'Podcast Outreach S2', description: 'Season 2 guest pipeline', owner: 'moj_mahdara', relationship_ids: ['demo-contact-5', 'demo-contact-6'], opportunity_ids: [], notes: 'Targeting 12 episodes', created_at: '2026-02-15T00:00:00.000Z' },
]

// Project interactions in main array
;[
  ix('proj-1', '1', 'project_event' as InteractionType, 79, '', { event_detail: JSON.stringify({ project_name: 'Fund III Launch', project_id: 'rec_demo_proj_1', action: 'added_to_project' }) }),
  ix('proj-2', '3', 'project_event' as InteractionType, 79, '', { event_detail: JSON.stringify({ project_name: 'Fund III Launch', project_id: 'rec_demo_proj_1', action: 'added_to_project' }) }),
  ix('proj-3', '5', 'project_event' as InteractionType, 43, '', { event_detail: JSON.stringify({ project_name: 'Podcast Outreach S2', project_id: 'rec_demo_proj_2', action: 'added_to_project' }) }),
  ix('proj-4', '6', 'project_event' as InteractionType, 43, '', { event_detail: JSON.stringify({ project_name: 'Podcast Outreach S2', project_id: 'rec_demo_proj_2', action: 'added_to_project' }) }),
].forEach(i => DEMO_INTERACTIONS.push(i))

// ── Field Configs ──
// Note: FieldConfig type is defined in fieldConfig.ts — using inline type here to avoid circular dep

interface FieldConfigShape {
  id: string
  name: string
  airtable_field_id: string
  field_type: 'text' | 'multiline' | 'number' | 'select' | 'date' | 'checkbox'
  scope_type: 'Contact' | 'Company' | 'Both'
  scope_pod_id: string | null
  required: boolean
  display_order: number
}

const now = new Date().toISOString()
export const DEMO_COMPANIES: Company[] = [
  { id: 'demo-co-1', name: 'Acme Ventures', website: 'https://acmeventures.com', domain: 'acmeventures.com', ticker: null, location: 'San Francisco', stage: 'Growth', industry: 'Venture Capital', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-2', name: 'Kinship Ventures', website: 'https://kinship.vc', domain: 'kinship.vc', ticker: null, location: 'Palo Alto', stage: 'Growth', industry: 'Venture Capital', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-3', name: 'Goop', website: 'https://goop.com', domain: 'goop.com', ticker: null, location: 'Los Angeles', stage: 'Growth', industry: 'Wellness & Lifestyle', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-4', name: 'First Round', website: 'https://firstround.com', domain: 'firstround.com', ticker: null, location: 'New York', stage: 'Growth', industry: 'Venture Capital', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-5', name: 'Figma', website: 'https://figma.com', domain: 'figma.com', ticker: null, location: 'San Francisco', stage: 'Late', industry: 'Design Tools', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-6', name: 'Instagram', website: 'https://instagram.com', domain: 'instagram.com', ticker: 'META', location: 'Menlo Park', stage: 'Public', industry: 'Social Media', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-7', name: 'Andreessen Horowitz', website: 'https://a16z.com', domain: 'a16z.com', ticker: null, location: 'Menlo Park', stage: 'Growth', industry: 'Venture Capital', notes: null, custom_fields: {}, created_at: now, updated_at: now },
  { id: 'demo-co-8', name: 'Blackstone', website: 'https://blackstone.com', domain: 'blackstone.com', ticker: 'BX', location: 'New York', stage: 'Public', industry: 'Private Equity', notes: null, custom_fields: {}, created_at: now, updated_at: now },
]

export const DEMO_FIELD_CONFIGS: FieldConfigShape[] = [
  { id: 'demo-fc-1', name: 'Commit Amount', airtable_field_id: 'fld_demo_1', field_type: 'number', scope_type: 'Both', scope_pod_id: 'demo-pod-lps', required: true, display_order: 1 },
  { id: 'demo-fc-2', name: 'Fund Name', airtable_field_id: 'fld_demo_2', field_type: 'text', scope_type: 'Company', scope_pod_id: 'demo-pod-lps', required: false, display_order: 2 },
  { id: 'demo-fc-3', name: 'Sector Focus', airtable_field_id: 'fld_demo_3', field_type: 'select', scope_type: 'Both', scope_pod_id: null, required: false, display_order: 3 },
  { id: 'demo-fc-4', name: 'Notes on Intro', airtable_field_id: 'fld_demo_4', field_type: 'multiline', scope_type: 'Contact', scope_pod_id: null, required: false, display_order: 4 },
]
