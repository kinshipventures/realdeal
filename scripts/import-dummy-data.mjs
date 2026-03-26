#!/usr/bin/env node
/**
 * Import 25 dummy contacts and 45 interactions into Airtable.
 * Run: node scripts/import-dummy-data.mjs
 */

import { readFileSync } from 'fs'

// Load env
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => {
  const [k, ...v] = l.split('=')
  return [k.trim(), v.join('=').trim()]
}))

const TOKEN = env.VITE_AIRTABLE_TOKEN
const BASE_ID = env.VITE_AIRTABLE_BASE_ID
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`

// Table IDs
const CONTACTS_TABLE = 'tbll75mRMMVBGiNpj'
const INTERACTIONS_TABLE = 'tblbxLX5EM09Y6xim'

// Pod record IDs
const PODS = {
  LPs: 'recqkgZAzBab2icWP',
  MAPS: 'recR2WivtqJEc5oB2',
  MAPSLite: 'recA46JFn7fAMPO1x',
  Talent: 'recMuRc6bROyXnir1',
  Services: 'recNqFuuXDQU25KKr',
  Unsorted: 'recGR6AQTq1ceL1yq',
}

// Field IDs for Contacts
const CF = {
  Name: 'fldAK1J20N637jyCz',
  FirstName: 'fldz5LidpUpBqvKFn',
  LastName: 'fldrcyg9Nvtm7h8s1',
  Email: 'fldDBOCjvGQExILz0',
  Phone: 'fld23E0ijDS5h2PNW',
  Company: 'fldkAYQbiZAtE9lJQ',
  Role: 'fld6gUSh5cIZMlxYL',
  LinkedIn: 'fldoxdeD9icdUKjuv',
  Location: 'fld1ZRCBXTV2aCfii',
  Country: 'fldcfSEZhnld1hyZc',
  GlobalRegion: 'fldyVR54hwoFuRkES',
  Gender: 'fldMK86E9lyR5pL3J',
  Birthday: 'fld8DRqB8mwF8R8he',
  IntroducedBy: 'fldw5WDmcYyB1o8eC',
  IntelNotes: 'fldmkr2hLoZSI8qSf',
  RelOwner: 'fldUCa573POD3HVc4',
  ContactFreq: 'fldcffhsIzVJlPehB',
  NextFollowUp: 'fld8r5i9AFd7uhmdY',
  NextAction: 'fld0P74x7D999l62l',
  KVFund: 'fldcz1ZLNerhl239H',
  SPVInvestor: 'fldqIbYhTQIeE0aEc',
  NeedsReview: 'fldEMBpjfHlqYanTL',
  Lists: 'fld8zgCP6wNoGt1N9',
  LastContacted: 'fldBDyK3GWVKXjSyo',
}

// Field IDs for Interactions
const IF = {
  Contact: 'fldRWV0lts0mrxK1n',
  Type: 'fldF7NfwFm6ggDo7N',
  Date: 'fldrrmc0ZxQbjgCqx',
  Summary: 'fldw3A7IEufUJVICK',
  Source: 'fldW4D4hYRCk4lTJg',
  EmailLink: 'fldY7wY6EGkyhX2sX',
  GranulaLink: 'fldQSLWaBeNC17y79',
}

async function airtableRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable ${res.status}: ${text}`)
  }
  return res.json()
}

async function createRecordsBatch(tableId, records) {
  // Airtable max 10 per request
  const results = []
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10)
    const resp = await airtableRequest(tableId, {
      method: 'POST',
      body: JSON.stringify({ records: batch, typecast: true }),
    })
    results.push(...resp.records)
    if (i + 10 < records.length) await sleep(250) // rate limit
  }
  return results
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── CONTACTS DATA ──────────────────────────────────────────────────────────

const contacts = [
  // LPs (5)
  {
    [CF.Name]: 'Serena Voss', [CF.FirstName]: 'Serena', [CF.LastName]: 'Voss',
    [CF.Email]: 'serena.voss@vosscapital-demo.com', [CF.Phone]: '+1 (415) 555-0201',
    [CF.Company]: 'Voss Capital Partners', [CF.Role]: 'Managing Director',
    [CF.LinkedIn]: 'https://linkedin.com/in/serenavoss-demo', [CF.Location]: 'San Francisco',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Nov 12', [CF.IntroducedBy]: 'Charles Whitmore',
    [CF.IntelNotes]: 'Family office with strong conviction in women-led consumer brands. Committed early to Fund I.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.KVFund]: 'Fund I', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.LPs], [CF.LastContacted]: '2026-01-14',
  },
  {
    [CF.Name]: 'Damien Okafor', [CF.FirstName]: 'Damien', [CF.LastName]: 'Okafor',
    [CF.Email]: 'd.okafor@horizonendo-demo.com', [CF.Phone]: '+1 (212) 555-0202',
    [CF.Company]: 'Horizon Endowment', [CF.Role]: 'Partner',
    [CF.LinkedIn]: 'https://linkedin.com/in/damienokafor-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Aug 7', [CF.IntroducedBy]: 'Trina Spear',
    [CF.IntelNotes]: 'University endowment fund. Prefers quarterly updates over frequent touchpoints.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NextFollowUp]: '2026-03-27', [CF.NextAction]: 'Send updated LP deck with Q1 portfolio snapshot',
    [CF.KVFund]: 'Fund I', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.LPs], [CF.LastContacted]: '2026-03-01',
  },
  {
    [CF.Name]: 'Priya Mehta', [CF.FirstName]: 'Priya', [CF.LastName]: 'Mehta',
    [CF.Email]: 'priya@meridianprivate-demo.com', [CF.Phone]: '+1 (310) 555-0203',
    [CF.Company]: 'Meridian Private Office', [CF.Role]: 'Co-Founder',
    [CF.LinkedIn]: 'https://linkedin.com/in/priyamehta-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Apr 3', [CF.IntroducedBy]: 'Doug Hirsch',
    [CF.IntelNotes]: 'Strong fit. Cross-border interest in consumer brands with India distribution.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NextFollowUp]: '2026-03-28', [CF.NextAction]: 'Follow up on updated financials she requested',
    [CF.KVFund]: 'Fund I', [CF.SPVInvestor]: 'Lovable', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.LPs], [CF.LastContacted]: '2026-03-18',
  },
  {
    [CF.Name]: 'Charles Whitmore', [CF.FirstName]: 'Charles', [CF.LastName]: 'Whitmore',
    [CF.Email]: 'c.whitmore@whitmorewm-demo.com', [CF.Phone]: '+44 20 5555 0204',
    [CF.Company]: 'Whitmore Wealth Management', [CF.Role]: 'Principal',
    [CF.LinkedIn]: 'https://linkedin.com/in/charleswhitmore-demo', [CF.Location]: 'London',
    [CF.Country]: 'United Kingdom', [CF.GlobalRegion]: 'EU', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Mar 2', [CF.IntroducedBy]: 'Gwyneth Paltrow',
    [CF.IntelNotes]: 'Ultra-HNW UK family office. Needs white-glove communication.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.KVFund]: 'Fund I', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.LPs], [CF.LastContacted]: '2026-02-20',
  },
  {
    [CF.Name]: 'Layla Hassan', [CF.FirstName]: 'Layla', [CF.LastName]: 'Hassan',
    [CF.Email]: 'layla.hassan@gulfhorizon-demo.com', [CF.Phone]: '+971 4 555 0205',
    [CF.Company]: 'Gulf Horizon Partners', [CF.Role]: 'Director of Investments',
    [CF.LinkedIn]: 'https://linkedin.com/in/laylahassan-demo', [CF.Location]: 'Dubai',
    [CF.Country]: 'United Arab Emirates', [CF.GlobalRegion]: 'ME', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Jun 29', [CF.IntroducedBy]: 'Princess Reema Network',
    [CF.IntelNotes]: 'Sovereign-adjacent family office. Strong MENA dealflow.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.KVFund]: 'Fund I', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.LPs], [CF.LastContacted]: '2025-12-05',
  },

  // MAPS (5)
  {
    [CF.Name]: 'Alex Fontaine', [CF.FirstName]: 'Alex', [CF.LastName]: 'Fontaine',
    [CF.Email]: 'alex@luminaryvc-demo.com', [CF.Phone]: '+1 (310) 555-0301',
    [CF.Company]: 'Luminary Ventures', [CF.Role]: 'Co-Founder & CEO',
    [CF.LinkedIn]: 'https://linkedin.com/in/alexfontaine-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Non-binary',
    [CF.Birthday]: 'Apr 8',
    [CF.IntelNotes]: "One of Moj's closest collaborators. Key connector in consumer tech.",
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Weekly',
    [CF.SPVInvestor]: 'Moonpay', [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPS], [CF.LastContacted]: '2026-03-24',
  },
  {
    [CF.Name]: 'Coco Beaumont', [CF.FirstName]: 'Coco', [CF.LastName]: 'Beaumont',
    [CF.Email]: 'coco@beaumontgroup-demo.com', [CF.Phone]: '+1 (917) 555-0302',
    [CF.Company]: 'The Beaumont Group', [CF.Role]: 'Founder',
    [CF.LinkedIn]: 'https://linkedin.com/in/cocobeaumont-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Jan 30', [CF.IntroducedBy]: 'Trina Spear',
    [CF.IntelNotes]: 'Luxury brand strategist. Great taste, slow decision maker.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPS], [CF.LastContacted]: '2026-03-15',
  },
  {
    [CF.Name]: 'Tariq Nasser', [CF.FirstName]: 'Tariq', [CF.LastName]: 'Nasser',
    [CF.Email]: 't.nasser@nasserglobal-demo.com', [CF.Phone]: '+971 50 555 0303',
    [CF.Company]: 'Nasser Global', [CF.Role]: 'Managing Partner',
    [CF.LinkedIn]: 'https://linkedin.com/in/tariqnasser-demo', [CF.Location]: 'Dubai',
    [CF.Country]: 'United Arab Emirates', [CF.GlobalRegion]: 'ME', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Dec 11', [CF.IntroducedBy]: 'Layla Hassan',
    [CF.IntelNotes]: 'Cross-border deal flow. Interested in AI and climate.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPS], [CF.LastContacted]: '2026-02-10',
  },
  {
    [CF.Name]: 'Simone Adler', [CF.FirstName]: 'Simone', [CF.LastName]: 'Adler',
    [CF.Email]: 'simone@adlercapital-demo.com', [CF.Phone]: '+1 (415) 555-0304',
    [CF.Company]: 'Adler Capital', [CF.Role]: 'Chief Investment Officer',
    [CF.LinkedIn]: 'https://linkedin.com/in/simoneadler-demo', [CF.Location]: 'San Francisco',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'May 14', [CF.IntroducedBy]: 'Alex Fontaine',
    [CF.IntelNotes]: 'Former Goldman. European dealflow queen. Great co-investor for Series A.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPS], [CF.LastContacted]: '2026-02-05',
  },
  {
    [CF.Name]: 'Juno Park', [CF.FirstName]: 'Juno', [CF.LastName]: 'Park',
    [CF.Email]: 'juno@brightfuturesmedia-demo.com', [CF.Phone]: '+1 (323) 555-0305',
    [CF.Company]: 'Bright Futures Media', [CF.Role]: 'Founder & CEO',
    [CF.LinkedIn]: 'https://linkedin.com/in/junopark-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Sep 19', [CF.IntroducedBy]: 'Coco Beaumont',
    [CF.IntelNotes]: 'Media and content operator. Rising talent in LA media scene.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Weekly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPS], [CF.LastContacted]: '2026-03-20',
  },

  // MAPS Lite (4)
  {
    [CF.Name]: 'Marco Delgado', [CF.FirstName]: 'Marco', [CF.LastName]: 'Delgado',
    [CF.Email]: 'marco@verdefoods-demo.com', [CF.Phone]: '+1 (305) 555-0401',
    [CF.Company]: 'Verde Foods', [CF.Role]: 'CEO',
    [CF.LinkedIn]: 'https://linkedin.com/in/marcodelgado-demo', [CF.Location]: 'Miami',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Jul 4', [CF.IntroducedBy]: 'Coco Beaumont',
    [CF.IntelNotes]: 'Building a premium plant-based F&B brand. Series A coming up.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NextFollowUp]: '2026-03-26', [CF.NextAction]: 'Check in on Series A timeline',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPSLite], [CF.LastContacted]: '2026-01-20',
  },
  {
    [CF.Name]: 'Nadia Bloom', [CF.FirstName]: 'Nadia', [CF.LastName]: 'Bloom',
    [CF.Email]: 'nadia@soleilbeauty-demo.com', [CF.Phone]: '+1 (212) 555-0402',
    [CF.Company]: 'Soleil Beauty', [CF.Role]: 'Founder',
    [CF.LinkedIn]: 'https://linkedin.com/in/nadiabloom-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Apr 18', [CF.IntroducedBy]: 'Juno Park',
    [CF.IntelNotes]: 'Clean beauty founder. Juno Park connection.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPSLite], [CF.LastContacted]: '2026-03-05',
  },
  {
    [CF.Name]: 'Felix Strand', [CF.FirstName]: 'Felix', [CF.LastName]: 'Strand',
    [CF.Email]: 'felix@strandassoc-demo.com', [CF.Phone]: '+44 7700 555 0403',
    [CF.Company]: 'Strand & Associates', [CF.Role]: 'Partner',
    [CF.LinkedIn]: 'https://linkedin.com/in/felixstrand-demo', [CF.Location]: 'London',
    [CF.Country]: 'United Kingdom', [CF.GlobalRegion]: 'EU', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Feb 22', [CF.IntroducedBy]: 'Charles Whitmore',
    [CF.IntelNotes]: 'European strategic investor. Rising star in London VC.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPSLite], [CF.LastContacted]: '2025-11-15',
  },
  {
    [CF.Name]: 'Amara Diallo', [CF.FirstName]: 'Amara', [CF.LastName]: 'Diallo',
    [CF.Email]: 'amara@kinetichealth-demo.com', [CF.Phone]: '+1 (404) 555-0404',
    [CF.Company]: 'Kinetic Health', [CF.Role]: 'CEO',
    [CF.LinkedIn]: 'https://linkedin.com/in/amaradiallo-demo', [CF.Location]: 'Atlanta',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Oct 3', [CF.IntroducedBy]: 'Devon Chase',
    [CF.IntelNotes]: 'Digital health startup. Africa-focused impact overlap.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.MAPSLite], [CF.LastContacted]: '2026-03-08',
  },

  // Talent (4)
  {
    [CF.Name]: 'Devon Chase', [CF.FirstName]: 'Devon', [CF.LastName]: 'Chase',
    [CF.Email]: 'devon@devonchase-demo.com', [CF.Phone]: '+1 (310) 555-0501',
    [CF.Company]: '(Formerly Goop)', [CF.Role]: 'VP of Operations',
    [CF.LinkedIn]: 'https://linkedin.com/in/devonchase-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Feb 9', [CF.IntroducedBy]: 'Moj Mahdara',
    [CF.IntelNotes]: 'Outstanding operator. Former Goop. Looking for next role.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NextFollowUp]: '2026-03-26', [CF.NextAction]: 'Intro to Amara Diallo at Kinetic Health',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Talent], [CF.LastContacted]: '2026-03-10',
  },
  {
    [CF.Name]: 'Isla Montes', [CF.FirstName]: 'Isla', [CF.LastName]: 'Montes',
    [CF.Email]: 'isla@islamontes-demo.com', [CF.Phone]: '+1 (917) 555-0502',
    [CF.Company]: 'Freelance', [CF.Role]: 'Head of Brand (Available)',
    [CF.LinkedIn]: 'https://linkedin.com/in/islamontes-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Jul 17', [CF.IntroducedBy]: 'Coco Beaumont',
    [CF.IntelNotes]: 'Luxury brand background. Available for fractional work.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'As Needed',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Talent], [CF.LastContacted]: '2026-02-28',
  },
  {
    [CF.Name]: 'Remy Laurent', [CF.FirstName]: 'Remy', [CF.LastName]: 'Laurent',
    [CF.Email]: 'remy@laurentfinancial-demo.com', [CF.Phone]: '+1 (415) 555-0503',
    [CF.Company]: 'Laurent Financial', [CF.Role]: 'Fractional CFO',
    [CF.LinkedIn]: 'https://linkedin.com/in/remylaurent-demo', [CF.Location]: 'San Francisco',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Dec 30', [CF.IntroducedBy]: 'Simone Adler',
    [CF.IntelNotes]: 'Excellent fractional CFO. Handles fund financials.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Talent], [CF.LastContacted]: '2026-02-15',
  },
  {
    [CF.Name]: 'Zoe Winters', [CF.FirstName]: 'Zoe', [CF.LastName]: 'Winters',
    [CF.Email]: 'zoe@zoewinters-demo.com', [CF.Phone]: '+1 (323) 555-0504',
    [CF.Company]: 'Freelance', [CF.Role]: 'Director of Partnerships (Available)',
    [CF.LinkedIn]: 'https://linkedin.com/in/zoewinters-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Mar 31', [CF.IntroducedBy]: 'Juno Park',
    [CF.IntelNotes]: 'Media and brand partnerships. Available for project work.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'As Needed',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Talent], [CF.LastContacted]: '2026-01-30',
  },

  // Service Providers (4)
  {
    [CF.Name]: 'Brennan Cole', [CF.FirstName]: 'Brennan', [CF.LastName]: 'Cole',
    [CF.Email]: 'brennan@studiocole-demo.com', [CF.Phone]: '+1 (310) 555-0601',
    [CF.Company]: 'Studio Cole', [CF.Role]: 'Creative Director',
    [CF.LinkedIn]: 'https://linkedin.com/in/brennancole-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Jun 5', [CF.IntroducedBy]: 'Moj Mahdara',
    [CF.IntelNotes]: "Go-to creative for Moj's personal brand. Reliable.",
    [CF.RelOwner]: 'Briell Huddleston', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Services], [CF.LastContacted]: '2026-03-19',
  },
  {
    [CF.Name]: 'Petra Kwan', [CF.FirstName]: 'Petra', [CF.LastName]: 'Kwan',
    [CF.Email]: 'pkwan@kwanpartners-demo.com', [CF.Phone]: '+1 (212) 555-0602',
    [CF.Company]: 'Kwan & Partners LLP', [CF.Role]: 'Lead Counsel',
    [CF.LinkedIn]: 'https://linkedin.com/in/petrakwan-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Sep 22', [CF.IntroducedBy]: 'Charles Whitmore',
    [CF.IntelNotes]: 'Fund formation and LP docs specialist.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'Quarterly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Services], [CF.LastContacted]: '2026-03-01',
  },
  {
    [CF.Name]: 'Asha Obi', [CF.FirstName]: 'Asha', [CF.LastName]: 'Obi',
    [CF.Email]: 'asha@obicreative-demo.com', [CF.Phone]: '+1 (646) 555-0603',
    [CF.Company]: 'Obi Creative', [CF.Role]: 'Brand Strategist',
    [CF.LinkedIn]: 'https://linkedin.com/in/ashaobi-demo', [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.Birthday]: 'Apr 25', [CF.IntroducedBy]: 'Coco Beaumont',
    [CF.IntelNotes]: 'Brand strategy and positioning specialist.',
    [CF.RelOwner]: 'Briell Huddleston', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Services], [CF.LastContacted]: '2026-02-22',
  },
  {
    [CF.Name]: 'Theo Nakamura', [CF.FirstName]: 'Theo', [CF.LastName]: 'Nakamura',
    [CF.Email]: 'theo@nakamuralabs-demo.com', [CF.Phone]: '+1 (323) 555-0604',
    [CF.Company]: 'Nakamura Labs', [CF.Role]: 'Head of Technology',
    [CF.LinkedIn]: 'https://linkedin.com/in/theonakamura-demo', [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.Birthday]: 'Jan 18', [CF.IntroducedBy]: 'Gabe Murray',
    [CF.IntelNotes]: 'Technical advisor and build partner. Reliable.',
    [CF.RelOwner]: 'Briell Huddleston', [CF.ContactFreq]: 'Monthly',
    [CF.NeedsReview]: false,
    [CF.Lists]: [PODS.Services], [CF.LastContacted]: '2026-03-15',
  },

  // Unsorted (3)
  {
    [CF.Name]: 'Diana Chen', [CF.FirstName]: 'Diana', [CF.LastName]: 'Chen',
    [CF.Email]: 'diana.chen@anthropic-demo.com',
    [CF.Company]: 'Anthropic', [CF.Role]: 'Head of Partnerships',
    [CF.Location]: 'San Francisco',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.IntelNotes]: 'Met at TED. Moj wants to pitch AI Fellowship partnership.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'As Needed',
    [CF.NextFollowUp]: '2026-03-27', [CF.NextAction]: 'Send Anthropic partnership pitch email',
    [CF.NeedsReview]: true,
    [CF.Lists]: [PODS.Unsorted],
  },
  {
    [CF.Name]: 'William Barr', [CF.FirstName]: 'William', [CF.LastName]: 'Barr',
    [CF.Email]: 'william@wbconsulting-demo.com', [CF.Phone]: '+1 (212) 555-0702',
    [CF.Company]: 'WB Consulting', [CF.Role]: 'Principal',
    [CF.Location]: 'New York',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Male',
    [CF.IntelNotes]: 'Monday call at 4pm confirmed. Assess fit for LP management support.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'As Needed',
    [CF.NextFollowUp]: '2026-03-28', [CF.NextAction]: 'Monday 4pm call — assess fit for LP mgmt support',
    [CF.NeedsReview]: true,
    [CF.Lists]: [PODS.Unsorted],
  },
  {
    [CF.Name]: 'Rosa Chen', [CF.FirstName]: 'Rosa', [CF.LastName]: 'Chen',
    [CF.Email]: 'rosa@bloomplus-demo.com',
    [CF.Company]: 'Bloom+', [CF.Role]: 'Founder & CEO',
    [CF.Location]: 'Los Angeles',
    [CF.Country]: 'United States', [CF.GlobalRegion]: 'AMER', [CF.Gender]: 'Female',
    [CF.IntroducedBy]: 'Doug Hirsch',
    [CF.IntelNotes]: 'Doug intro at Upfront Summit. Looks interesting.',
    [CF.RelOwner]: 'Moj Mahdara', [CF.ContactFreq]: 'As Needed',
    [CF.NeedsReview]: true,
    [CF.Lists]: [PODS.Unsorted],
  },
]

// ── INTERACTIONS DATA ──────────────────────────────────────────────────────

function buildInteractions(contactMap) {
  const c = (name) => {
    const id = contactMap[name]
    if (!id) throw new Error(`Contact not found: ${name}`)
    return id
  }

  return [
    // Serena Voss (3)
    { [IF.Contact]: [c('Serena Voss')], [IF.Type]: 'email', [IF.Date]: '2026-01-14', [IF.Summary]: 'Sent fund update and Q4 portfolio summary. She replied positively.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Serena Voss')], [IF.Type]: 'call', [IF.Date]: '2025-12-03', [IF.Summary]: '30-min year-end check-in. Confirmed interest in co-investing next round.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Serena Voss')], [IF.Type]: 'meeting', [IF.Date]: '2025-11-10', [IF.Summary]: 'Coffee at Four Seasons SF. Discussed Fund II thesis.', [IF.Source]: 'Manual' },

    // Damien Okafor (3)
    { [IF.Contact]: [c('Damien Okafor')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-01', [IF.Summary]: 'Zoom with Damien and his associate Maria. Reviewed Q4 performance.', [IF.Source]: 'Granola' },
    { [IF.Contact]: [c('Damien Okafor')], [IF.Type]: 'email', [IF.Date]: '2026-01-22', [IF.Summary]: 'Sent Q4 LP update. He forwarded to his investment committee.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Damien Okafor')], [IF.Type]: 'intro', [IF.Date]: '2025-12-15', [IF.Summary]: 'Trina Spear email intro connected us initially.', [IF.Source]: 'Gmail' },

    // Priya Mehta (3)
    { [IF.Contact]: [c('Priya Mehta')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-18', [IF.Summary]: 'Coffee in Brentwood. Discussed India consumer market expansion.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Priya Mehta')], [IF.Type]: 'email', [IF.Date]: '2026-02-26', [IF.Summary]: 'Intro thread from Doug Hirsch. Shared Olipop case study.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Priya Mehta')], [IF.Type]: 'note', [IF.Date]: '2026-03-10', [IF.Summary]: 'Doug flagged separately that Priya may increase allocation.', [IF.Source]: 'Manual' },

    // Charles Whitmore (3)
    { [IF.Contact]: [c('Charles Whitmore')], [IF.Type]: 'call', [IF.Date]: '2026-02-20', [IF.Summary]: 'Quarterly check-in via Zoom. Discussed European market outlook.', [IF.Source]: 'Granola' },
    { [IF.Contact]: [c('Charles Whitmore')], [IF.Type]: 'meeting', [IF.Date]: '2025-11-18', [IF.Summary]: 'Dinner at Mayfair club. White-glove treatment required.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Charles Whitmore')], [IF.Type]: 'intro', [IF.Date]: '2025-10-05', [IF.Summary]: 'Gwyneth connected via email. Old money network.', [IF.Source]: 'Gmail' },

    // Layla Hassan (3)
    { [IF.Contact]: [c('Layla Hassan')], [IF.Type]: 'email', [IF.Date]: '2025-12-05', [IF.Summary]: 'Sent holiday greetings and year-end fund summary.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Layla Hassan')], [IF.Type]: 'meeting', [IF.Date]: '2025-10-20', [IF.Summary]: 'Zoom intro call. Explored MENA co-investment opportunities.', [IF.Source]: 'Granola' },
    { [IF.Contact]: [c('Layla Hassan')], [IF.Type]: 'intro', [IF.Date]: '2025-09-15', [IF.Summary]: 'Princess Reema network intro at LP summit.', [IF.Source]: 'Manual' },

    // Alex Fontaine (3)
    { [IF.Contact]: [c('Alex Fontaine')], [IF.Type]: 'call', [IF.Date]: '2026-03-24', [IF.Summary]: 'Quick 20-min check-in on consumer AI landscape.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Alex Fontaine')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-10', [IF.Summary]: 'Lunch at Nobu Malibu. Shared 3 new deals.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Alex Fontaine')], [IF.Type]: 'email', [IF.Date]: '2026-02-18', [IF.Summary]: 'Alex forwarded a Substack piece on consumer AI trends.', [IF.Source]: 'Gmail' },

    // Coco Beaumont (3)
    { [IF.Contact]: [c('Coco Beaumont')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-15', [IF.Summary]: 'Dinner in Tribeca. LVMH venture arm update.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Coco Beaumont')], [IF.Type]: 'call', [IF.Date]: '2026-02-20', [IF.Summary]: '30 min catch-up on luxury-tech thesis.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Coco Beaumont')], [IF.Type]: 'email', [IF.Date]: '2026-01-28', [IF.Summary]: "Coco sent over her annual 'brands to watch' list.", [IF.Source]: 'Gmail' },

    // Simone Adler (3)
    { [IF.Contact]: [c('Simone Adler')], [IF.Type]: 'email', [IF.Date]: '2026-02-05', [IF.Summary]: 'Sent the Q4 portfolio update and co-investment memo.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Simone Adler')], [IF.Type]: 'meeting', [IF.Date]: '2026-01-15', [IF.Summary]: 'Coffee in Hayes Valley. Great energy on European expansion.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Simone Adler')], [IF.Type]: 'intro', [IF.Date]: '2025-12-10', [IF.Summary]: 'Alex Fontaine connected via email.', [IF.Source]: 'Gmail' },

    // Juno Park (3)
    { [IF.Contact]: [c('Juno Park')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-20', [IF.Summary]: 'Cowork morning at Kinship HQ. Impressive media strategy.', [IF.Source]: 'Granola' },
    { [IF.Contact]: [c('Juno Park')], [IF.Type]: 'call', [IF.Date]: '2026-03-08', [IF.Summary]: 'Juno called to flag a partnership opportunity.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Juno Park')], [IF.Type]: 'email', [IF.Date]: '2026-02-14', [IF.Summary]: "Valentine's Day note. Shared content collab ideas.", [IF.Source]: 'Gmail' },

    // Marco Delgado (2)
    { [IF.Contact]: [c('Marco Delgado')], [IF.Type]: 'call', [IF.Date]: '2026-01-20', [IF.Summary]: 'Quarterly check-in. Series A timeline discussed.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Marco Delgado')], [IF.Type]: 'meeting', [IF.Date]: '2025-10-15', [IF.Summary]: "Coco's dinner in Miami. First real conversation.", [IF.Source]: 'Manual' },

    // Nadia Bloom (2)
    { [IF.Contact]: [c('Nadia Bloom')], [IF.Type]: 'email', [IF.Date]: '2026-03-05', [IF.Summary]: 'Nadia sent over the Soleil Beauty press kit.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Nadia Bloom')], [IF.Type]: 'intro', [IF.Date]: '2026-02-10', [IF.Summary]: 'Juno Park email intro connected us.', [IF.Source]: 'Gmail' },

    // Felix Strand (2)
    { [IF.Contact]: [c('Felix Strand')], [IF.Type]: 'call', [IF.Date]: '2025-11-15', [IF.Summary]: 'First proper call after the Mayfair dinner intro.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Felix Strand')], [IF.Type]: 'intro', [IF.Date]: '2025-10-22', [IF.Summary]: 'Charles Whitmore intro at a Mayfair dinner.', [IF.Source]: 'Manual' },

    // Devon Chase (2)
    { [IF.Contact]: [c('Devon Chase')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-10', [IF.Summary]: 'Coffee at Erewhon. Discussed next career move.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Devon Chase')], [IF.Type]: 'call', [IF.Date]: '2026-02-18', [IF.Summary]: 'Devon reached out with a question about Kinetic Health.', [IF.Source]: 'Gmail' },

    // Remy Laurent (2)
    { [IF.Contact]: [c('Remy Laurent')], [IF.Type]: 'email', [IF.Date]: '2026-02-15', [IF.Summary]: 'Remy sent his updated rates and availability.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Remy Laurent')], [IF.Type]: 'intro', [IF.Date]: '2026-01-08', [IF.Summary]: 'Simone Adler intro via email.', [IF.Source]: 'Gmail' },

    // Brennan Cole (2)
    { [IF.Contact]: [c('Brennan Cole')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-19', [IF.Summary]: 'Design review for AI Fellowship visual identity.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Brennan Cole')], [IF.Type]: 'email', [IF.Date]: '2026-03-05', [IF.Summary]: 'Brennan sent three concepts for review.', [IF.Source]: 'Gmail' },

    // Petra Kwan (2)
    { [IF.Contact]: [c('Petra Kwan')], [IF.Type]: 'call', [IF.Date]: '2026-03-01', [IF.Summary]: 'Quick sync on NDA variations for Fund II.', [IF.Source]: 'Manual' },
    { [IF.Contact]: [c('Petra Kwan')], [IF.Type]: 'meeting', [IF.Date]: '2025-12-20', [IF.Summary]: 'Year-end debrief on Fund I legal status.', [IF.Source]: 'Granola' },

    // Asha Obi (2)
    { [IF.Contact]: [c('Asha Obi')], [IF.Type]: 'email', [IF.Date]: '2026-02-22', [IF.Summary]: 'Asha sent a pitch for a brand positioning project.', [IF.Source]: 'Gmail' },
    { [IF.Contact]: [c('Asha Obi')], [IF.Type]: 'call', [IF.Date]: '2026-01-10', [IF.Summary]: 'Catch-up call. Discussed potential brand refresh scope.', [IF.Source]: 'Manual' },

    // Theo Nakamura (2)
    { [IF.Contact]: [c('Theo Nakamura')], [IF.Type]: 'meeting', [IF.Date]: '2026-03-15', [IF.Summary]: 'Kinship Brain technical sync. Build partner.', [IF.Source]: 'Granola' },
    { [IF.Contact]: [c('Theo Nakamura')], [IF.Type]: 'call', [IF.Date]: '2026-03-01', [IF.Summary]: 'Intro call via Gabe. Discussed technical roadmap.', [IF.Source]: 'Manual' },
  ]
}

// ── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Importing 25 contacts ===')

  // Build records array (strip undefined values)
  const contactRecords = contacts.map(fields => {
    const clean = {}
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null && v !== false) clean[k] = v
    }
    return { fields: clean }
  })

  const createdContacts = await createRecordsBatch(CONTACTS_TABLE, contactRecords)
  console.log(`Created ${createdContacts.length} contacts`)

  // Build name → ID map
  const contactMap = {}
  for (const rec of createdContacts) {
    contactMap[rec.fields[CF.Name] || rec.fields.Name] = rec.id
  }
  console.log('Contact map:', Object.keys(contactMap).join(', '))

  console.log('\n=== Importing 45 interactions ===')
  const interactions = buildInteractions(contactMap)
  console.log(`Prepared ${interactions.length} interactions`)

  const interactionRecords = interactions.map(fields => ({ fields }))
  const createdInteractions = await createRecordsBatch(INTERACTIONS_TABLE, interactionRecords)
  console.log(`Created ${createdInteractions.length} interactions`)

  // Output results
  console.log('\n=== RESULTS ===')
  console.log(`Contacts: ${createdContacts.length}`)
  console.log(`Interactions: ${createdInteractions.length}`)
  console.log('\nContact IDs:')
  for (const [name, id] of Object.entries(contactMap)) {
    console.log(`  ${name}: ${id}`)
  }
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
