/**
 * Deterministic ICAO 9303 MRZ parsing with check-digit validation.
 * This is data extraction only — a valid check digit does not mean the document is authentic.
 */

export type ParsedMrzFields = {
  document_type: 'passport' | 'national_id' | ''
  issuing_country: string
  last_name: string
  first_name: string
  document_number: string
  nationality: string
  birth_date: string
  gender: string
  document_expiry_date: string
  personal_number: string
  checkDigitsOk: boolean
  format: 'TD1' | 'TD2' | 'TD3' | ''
}

const EMPTY: ParsedMrzFields = {
  document_type: '',
  issuing_country: '',
  last_name: '',
  first_name: '',
  document_number: '',
  nationality: '',
  birth_date: '',
  gender: '',
  document_expiry_date: '',
  personal_number: '',
  checkDigitsOk: false,
  format: '',
}

const ISO3: Record<string, string> = {
  AFG: 'Afghanistan',
  ALB: 'Albania',
  DZA: 'Algeria',
  AND: 'Andorra',
  AGO: 'Angola',
  ARG: 'Argentina',
  ARM: 'Armenia',
  AUS: 'Australia',
  AUT: 'Austria',
  AZE: 'Azerbaijan',
  BHR: 'Bahrain',
  BGD: 'Bangladesh',
  BLR: 'Belarus',
  BEL: 'Belgium',
  BEN: 'Benin',
  BOL: 'Bolivia',
  BIH: 'Bosnia and Herzegovina',
  BRA: 'Brazil',
  BRN: 'Brunei',
  BGR: 'Bulgaria',
  BFA: 'Burkina Faso',
  KHM: 'Cambodia',
  CMR: 'Cameroon',
  CAN: 'Canada',
  CHL: 'Chile',
  CHN: 'China',
  COL: 'Colombia',
  COD: 'Congo',
  COG: 'Congo',
  CRI: 'Costa Rica',
  HRV: 'Croatia',
  CUB: 'Cuba',
  CYP: 'Cyprus',
  CZE: 'Czechia',
  DNK: 'Denmark',
  DOM: 'Dominican Republic',
  ECU: 'Ecuador',
  EGY: 'Egypt',
  SLV: 'El Salvador',
  EST: 'Estonia',
  ETH: 'Ethiopia',
  FIN: 'Finland',
  FRA: 'France',
  GAB: 'Gabon',
  GEO: 'Georgia',
  DEU: 'Germany',
  GHA: 'Ghana',
  GRC: 'Greece',
  GTM: 'Guatemala',
  GIN: 'Guinea',
  HTI: 'Haiti',
  HND: 'Honduras',
  HKG: 'Hong Kong',
  HUN: 'Hungary',
  ISL: 'Iceland',
  IND: 'India',
  IDN: 'Indonesia',
  IRN: 'Iran',
  IRQ: 'Iraq',
  IRL: 'Ireland',
  ISR: 'Israel',
  ITA: 'Italy',
  CIV: 'Ivory Coast',
  JAM: 'Jamaica',
  JPN: 'Japan',
  JOR: 'Jordan',
  KAZ: 'Kazakhstan',
  KEN: 'Kenya',
  KWT: 'Kuwait',
  KGZ: 'Kyrgyzstan',
  LAO: 'Laos',
  LVA: 'Latvia',
  LBN: 'Lebanon',
  LBY: 'Libya',
  LIE: 'Liechtenstein',
  LTU: 'Lithuania',
  LUX: 'Luxembourg',
  MAC: 'Macao',
  MDG: 'Madagascar',
  MYS: 'Malaysia',
  MLI: 'Mali',
  MLT: 'Malta',
  MRT: 'Mauritania',
  MUS: 'Mauritius',
  MEX: 'Mexico',
  MDA: 'Moldova',
  MCO: 'Monaco',
  MNG: 'Mongolia',
  MNE: 'Montenegro',
  MAR: 'Morocco',
  MOZ: 'Mozambique',
  MMR: 'Myanmar',
  NAM: 'Namibia',
  NPL: 'Nepal',
  NLD: 'Netherlands',
  NZL: 'New Zealand',
  NIC: 'Nicaragua',
  NER: 'Niger',
  NGA: 'Nigeria',
  MKD: 'North Macedonia',
  NOR: 'Norway',
  OMN: 'Oman',
  PAK: 'Pakistan',
  PAN: 'Panama',
  PRY: 'Paraguay',
  PER: 'Peru',
  PHL: 'Philippines',
  POL: 'Poland',
  PRT: 'Portugal',
  QAT: 'Qatar',
  ROU: 'Romania',
  RUS: 'Russia',
  RWA: 'Rwanda',
  SAU: 'Saudi Arabia',
  SEN: 'Senegal',
  SRB: 'Serbia',
  SGP: 'Singapore',
  SVK: 'Slovakia',
  SVN: 'Slovenia',
  SOM: 'Somalia',
  ZAF: 'South Africa',
  KOR: 'South Korea',
  ESP: 'Spain',
  LKA: 'Sri Lanka',
  SDN: 'Sudan',
  SWE: 'Sweden',
  CHE: 'Switzerland',
  SYR: 'Syria',
  TWN: 'Taiwan',
  TJK: 'Tajikistan',
  TZA: 'Tanzania',
  THA: 'Thailand',
  TGO: 'Togo',
  TUN: 'Tunisia',
  TUR: 'Turkey',
  TKM: 'Turkmenistan',
  UGA: 'Uganda',
  UKR: 'Ukraine',
  ARE: 'United Arab Emirates',
  GBR: 'United Kingdom',
  USA: 'United States',
  URY: 'Uruguay',
  UZB: 'Uzbekistan',
  VEN: 'Venezuela',
  VNM: 'Vietnam',
  YEM: 'Yemen',
  ZMB: 'Zambia',
  ZWE: 'Zimbabwe',
  UTO: 'Utopia',
  D: 'Germany',
  E: 'Spain',
}

function mrzCharValue(c: string): number {
  if (c >= '0' && c <= '9') return Number(c)
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55
  if (c === '<') return 0
  return -1
}

export function mrzCheckDigit(data: string): number {
  const weights = [7, 3, 1]
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = mrzCharValue(data[i] ?? '<')
    if (v < 0) return -1
    sum += v * (weights[i % 3] ?? 7)
  }
  return sum % 10
}

export function mrzCheckDigitValid(data: string, digit: string): boolean {
  if (!/^\d$/.test(digit)) return false
  const expected = mrzCheckDigit(data)
  return expected >= 0 && expected === Number(digit)
}

function cleanLine(raw: string, width: number): string {
  const up = raw
    .toUpperCase()
    .replace(/[\s\r\n]/g, '')
    .replace(/[^A-Z0-9<]/g, '<')
  if (up.length === width) return up
  if (up.length > width) return up.slice(0, width)
  return up.padEnd(width, '<')
}

function detectLines(raw: string): string[] {
  const text = String(raw || '')
    .replace(/\u003c/gi, '<')
    .replace(/[«»]/g, '<')
  const candidates = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => /[A-Z0-9<]{20,}/i.test(l.replace(/\s/g, '')))
  if (candidates.length >= 2) return candidates
  const compact = text.toUpperCase().replace(/[^A-Z0-9<]/g, '')
  if (compact.length >= 88) return [compact.slice(0, 44), compact.slice(44, 88)]
  if (compact.length >= 90) {
    return [compact.slice(0, 30), compact.slice(30, 60), compact.slice(60, 90)]
  }
  if (compact.length >= 72) return [compact.slice(0, 36), compact.slice(36, 72)]
  return candidates
}

function iso3ToName(code: string): string {
  const c = code.replace(/</g, '').toUpperCase()
  if (!c) return ''
  return ISO3[c] ?? c
}

function titleCaseName(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function parseNames(raw: string): { last_name: string; first_name: string } {
  const parts = raw.replace(/<+$/g, '').split('<<')
  const last = (parts[0] || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim()
  const first = (parts[1] || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim()
  return { last_name: titleCaseName(last), first_name: titleCaseName(first) }
}

function mrzDateToIso(yymmdd: string, kind: 'past' | 'future'): string {
  if (!/^\d{6}$/.test(yymmdd)) return ''
  const yy = Number(yymmdd.slice(0, 2))
  const mm = Number(yymmdd.slice(2, 4))
  const dd = Number(yymmdd.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return ''
  const now = new Date()
  const currentYY = now.getFullYear() % 100
  const century = Math.floor(now.getFullYear() / 100) * 100
  let year: number
  if (kind === 'past') {
    year = yy > currentYY + 15 ? century - 100 + yy : century + yy
  } else {
    year = century + yy
    if (year > now.getFullYear() + 20) year -= 100
  }
  const iso = `${String(year).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return ''
  return iso
}

function genderFromMrz(ch: string): string {
  if (ch === 'M') return 'Male'
  if (ch === 'F') return 'Female'
  return ''
}

function documentTypeFromCode(code: string): 'passport' | 'national_id' | '' {
  const c = code.replace(/</g, '')
  if (!c) return ''
  if (c.startsWith('P')) return 'passport'
  if (c.startsWith('I') || c.startsWith('A') || c.startsWith('C')) return 'national_id'
  return ''
}

function personalNumberFromOptional(optional: string, checkDigit: string): string {
  const data = optional.replace(/[^A-Z0-9<]/g, '<')
  if (!data.replace(/</g, '').trim()) return ''
  if (!mrzCheckDigitValid(data, checkDigit)) return ''
  return data.replace(/</g, '').trim()
}

function parseTd3(line1: string, line2: string): ParsedMrzFields {
  const l1 = cleanLine(line1, 44)
  const l2 = cleanLine(line2, 44)
  const names = parseNames(l1.slice(5))
  const docNum = l2.slice(0, 9)
  const docCheck = l2[9] ?? ''
  const nationality = l2.slice(10, 13)
  const birth = l2.slice(13, 19)
  const birthCheck = l2[19] ?? ''
  const gender = genderFromMrz(l2[20] ?? '')
  const expiry = l2.slice(21, 27)
  const expiryCheck = l2[27] ?? ''
  const optional = l2.slice(28, 42)
  const optionalCheck = l2[42] ?? ''
  const composite = `${docNum}${docCheck}${birth}${birthCheck}${expiry}${expiryCheck}${optional}${optionalCheck}`
  const compositeCheck = l2[43] ?? ''
  const checkDigitsOk =
    mrzCheckDigitValid(docNum, docCheck) &&
    mrzCheckDigitValid(birth, birthCheck) &&
    mrzCheckDigitValid(expiry, expiryCheck) &&
    mrzCheckDigitValid(composite, compositeCheck)
  return {
    document_type: documentTypeFromCode(l1.slice(0, 2)) || 'passport',
    issuing_country: iso3ToName(l1.slice(2, 5)),
    last_name: names.last_name,
    first_name: names.first_name,
    document_number: docNum.replace(/</g, '').trim(),
    nationality: iso3ToName(nationality),
    birth_date: mrzDateToIso(birth, 'past'),
    gender,
    document_expiry_date: mrzDateToIso(expiry, 'future'),
    personal_number: personalNumberFromOptional(optional, optionalCheck),
    checkDigitsOk,
    format: 'TD3',
  }
}

function parseTd1(line1: string, line2: string, line3: string): ParsedMrzFields {
  const l1 = cleanLine(line1, 30)
  const l2 = cleanLine(line2, 30)
  const l3 = cleanLine(line3, 30)
  const docNum = l1.slice(5, 14)
  const docCheck = l1[14] ?? ''
  const birth = l2.slice(0, 6)
  const birthCheck = l2[6] ?? ''
  const gender = genderFromMrz(l2[7] ?? '')
  const expiry = l2.slice(8, 14)
  const expiryCheck = l2[14] ?? ''
  const nationality = l2.slice(15, 18)
  const names = parseNames(l3)
  const checkDigitsOk =
    mrzCheckDigitValid(docNum, docCheck) &&
    mrzCheckDigitValid(birth, birthCheck) &&
    mrzCheckDigitValid(expiry, expiryCheck)
  return {
    document_type: documentTypeFromCode(l1.slice(0, 2)) || 'national_id',
    issuing_country: iso3ToName(l1.slice(2, 5)),
    last_name: names.last_name,
    first_name: names.first_name,
    document_number: docNum.replace(/</g, '').trim(),
    nationality: iso3ToName(nationality),
    birth_date: mrzDateToIso(birth, 'past'),
    gender,
    document_expiry_date: mrzDateToIso(expiry, 'future'),
    personal_number: '',
    checkDigitsOk,
    format: 'TD1',
  }
}

function parseTd2(line1: string, line2: string): ParsedMrzFields {
  const l1 = cleanLine(line1, 36)
  const l2 = cleanLine(line2, 36)
  const names = parseNames(l1.slice(5))
  const docNum = l2.slice(0, 9)
  const docCheck = l2[9] ?? ''
  const nationality = l2.slice(10, 13)
  const birth = l2.slice(13, 19)
  const birthCheck = l2[19] ?? ''
  const gender = genderFromMrz(l2[20] ?? '')
  const expiry = l2.slice(21, 27)
  const expiryCheck = l2[27] ?? ''
  const checkDigitsOk =
    mrzCheckDigitValid(docNum, docCheck) &&
    mrzCheckDigitValid(birth, birthCheck) &&
    mrzCheckDigitValid(expiry, expiryCheck)
  return {
    document_type: documentTypeFromCode(l1.slice(0, 2)) || 'national_id',
    issuing_country: iso3ToName(l1.slice(2, 5)),
    last_name: names.last_name,
    first_name: names.first_name,
    document_number: docNum.replace(/</g, '').trim(),
    nationality: iso3ToName(nationality),
    birth_date: mrzDateToIso(birth, 'past'),
    gender,
    document_expiry_date: mrzDateToIso(expiry, 'future'),
    personal_number: '',
    checkDigitsOk,
    format: 'TD2',
  }
}

export function parseMrz(raw: string | string[] | null | undefined): ParsedMrzFields {
  const joined = Array.isArray(raw) ? raw.join('\n') : String(raw || '')
  if (!joined.trim()) return { ...EMPTY }
  const lines = detectLines(joined)
  if (lines.length >= 3) {
    const td1 = parseTd1(lines[0]!, lines[1]!, lines[2]!)
    if (td1.document_number || td1.last_name) return td1
  }
  if (lines.length >= 2) {
    const a = (lines[0] || '').replace(/\s/g, '')
    const b = (lines[1] || '').replace(/\s/g, '')
    if (a.length >= 40 || b.length >= 40) return parseTd3(lines[0]!, lines[1]!)
    return parseTd2(lines[0]!, lines[1]!)
  }
  return { ...EMPTY }
}

export function mergeMrzIntoOcr<T extends Record<string, unknown>>(
  ocr: T,
  mrz: ParsedMrzFields,
): T {
  if (!mrz.checkDigitsOk && !mrz.document_number && !mrz.last_name) return ocr
  const out = { ...ocr }
  const fill = (key: string, value: string) => {
    if (!value) return
    const current = String(out[key] ?? '').trim()
    if (!current) (out as Record<string, unknown>)[key] = value
  }
  const preferMrz = mrz.checkDigitsOk
  const set = (key: string, value: string) => {
    if (!value) return
    if (preferMrz || !String(out[key] ?? '').trim()) {
      ;(out as Record<string, unknown>)[key] = value
    }
  }
  set('document_type', mrz.document_type)
  set('issuing_country', mrz.issuing_country)
  set('last_name', mrz.last_name)
  set('first_name', mrz.first_name)
  set('document_number', mrz.document_number)
  set('nationality', mrz.nationality)
  set('birth_date', mrz.birth_date)
  set('gender', mrz.gender)
  set('document_expiry_date', mrz.document_expiry_date)
  if (mrz.checkDigitsOk && mrz.personal_number) {
    set('personal_number', mrz.personal_number)
  }
  fill('document_type', mrz.document_type)
  return out
}
