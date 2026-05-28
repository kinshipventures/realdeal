/**
 * Lightweight vCard (.vcf) parser for Apple Contacts, Outlook, and other vCard exporters.
 * Supports vCard 2.1, 3.0, and 4.0 formats.
 */

export interface VCardContact {
  name: string
  firstName: string | null
  lastName: string | null
  email: string | null
  email2: string | null
  email3: string | null
  phone: string | null
  company: string | null
  role: string | null
  location: string | null
  website: string | null
  birthday: string | null
  notes: string | null
  linkedin: string | null
}

/** Parse a multi-contact .vcf file into an array of VCardContacts. */
export function parseVCard(content: string): VCardContact[] {
  const contacts: VCardContact[] = []
  // Unfold continuation lines (RFC 2425: line starting with space/tab is continuation)
  const unfolded = content.replace(/\r\n[ \t]/g, '').replace(/\r/g, '')
  const blocks = unfolded.split(/(?=BEGIN:VCARD)/i)

  for (const block of blocks) {
    if (!block.trim() || !/BEGIN:VCARD/i.test(block)) continue
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)

    let firstName = ''
    let lastName = ''
    let fullName = ''
    const emails: string[] = []
    const phones: string[] = []
    let company = ''
    let role = ''
    const addresses: string[] = []
    let website = ''
    let birthday = ''
    let notes = ''
    let linkedin = ''

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx < 0) continue
      const propPart = line.substring(0, colonIdx)
      const value = line.substring(colonIdx + 1).trim()
      if (!value) continue

      // Strip parameters to get base property name
      const baseProp = propPart.split(';')[0].toUpperCase()

      switch (baseProp) {
        case 'N': {
          // N:Last;First;Middle;Prefix;Suffix
          const parts = value.split(';')
          lastName = (parts[0] || '').trim()
          firstName = (parts[1] || '').trim()
          break
        }
        case 'FN':
          fullName = value
          break
        case 'EMAIL':
          if (emails.length < 3) emails.push(decodeVCardValue(value))
          break
        case 'TEL':
          if (phones.length < 1) phones.push(decodeVCardValue(value))
          break
        case 'ORG':
          company = value.split(';')[0].trim()
          break
        case 'TITLE':
          role = value
          break
        case 'ADR': {
          // ADR:PO;Ext;Street;City;State;Zip;Country
          const adrParts = value.split(';').map(s => s.trim()).filter(Boolean)
          if (adrParts.length > 0) addresses.push(adrParts.join(', '))
          break
        }
        case 'URL':
          if (/linkedin/i.test(value)) linkedin = value
          else if (!website) website = value
          break
        case 'BDAY':
          birthday = normalizeBirthday(value)
          break
        case 'NOTE':
          notes = decodeVCardValue(value)
          break
        case 'X-SOCIALPROFILE':
        case 'X-SOCIAL':
          if (/linkedin/i.test(propPart) || /linkedin/i.test(value)) {
            linkedin = value.replace(/^x-user=.*?:/, '')
          }
          break
      }
    }

    const name = fullName || [firstName, lastName].filter(Boolean).join(' ')
    if (!name) continue

    contacts.push({
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      email: emails[0] || null,
      email2: emails[1] || null,
      email3: emails[2] || null,
      phone: phones[0] || null,
      company: company || null,
      role: role || null,
      location: addresses[0] || null,
      website: website || null,
      birthday: birthday || null,
      notes: notes || null,
      linkedin: linkedin || null,
    })
  }

  return contacts
}

/** Convert vCard contacts to the CSV-like row format used by importContacts. */
export function vcardToRows(contacts: VCardContact[]): { headers: string[]; rows: Record<string, string>[] } {
  const headers = ['First Name', 'Last Name', 'Email', 'Email 2', 'Email 3', 'Phone', 'Company', 'Role', 'Location', 'Website', 'Birthday', 'Notes', 'LinkedIn']
  const rows = contacts.map(c => ({
    'First Name': c.firstName || c.name,
    'Last Name': c.lastName || '',
    'Email': c.email || '',
    'Email 2': c.email2 || '',
    'Email 3': c.email3 || '',
    'Phone': c.phone || '',
    'Company': c.company || '',
    'Role': c.role || '',
    'Location': c.location || '',
    'Website': c.website || '',
    'Birthday': c.birthday || '',
    'Notes': c.notes || '',
    'LinkedIn': c.linkedin || '',
  }))
  return { headers, rows }
}

function decodeVCardValue(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function normalizeBirthday(raw: string): string {
  // Handle formats: YYYY-MM-DD, YYYYMMDD, --MMDD (no year)
  const cleaned = raw.replace(/[^\d-]/g, '')
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
  }
  if (/^--\d{4}$/.test(cleaned)) {
    return `--${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`
  }
  return raw
}

/** Detect if file content is a vCard format. */
export function isVCard(content: string): boolean {
  return /BEGIN:VCARD/i.test(content.slice(0, 200))
}
