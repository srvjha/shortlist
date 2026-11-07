export type Region = 'india' | 'other'
export type Tone = 'formal' | 'warm' | 'brief'

export type ResignationInput = {
  region: Region
  tone: Tone
  name: string
  role: string
  company: string
  manager: string
  // YYYY-MM-DD
  resignDate: string
  noticeDays: number
  // India only: notice days paid off instead of served.
  buyoutDays: number
  reason: string
  handover: boolean
  // India only: asks for the relieving letter, experience letter and full and final settlement.
  exitDocuments: boolean
}

export const defaultNoticeDays: Record<Region, number> = {
  india: 30,
  other: 14,
}

// Counted in calendar days from the day after resigning. Contracts differ (some count the day you resign, some end
// on a working day), so the form says to check it.
export function lastWorkingDay(
  resignDate: string,
  noticeDays: number,
  buyoutDays = 0,
) {
  const start = Date.parse(`${resignDate}T00:00:00Z`)
  if (Number.isNaN(start)) return ''
  const served = Math.max(0, noticeDays - Math.max(0, buyoutDays))
  return new Date(start + served * 86_400_000).toISOString().slice(0, 10)
}

// "7 November 2026" in India, "November 7, 2026" elsewhere.
export function formatDay(date: string, region: Region) {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) return '[Date]'
  return new Intl.DateTimeFormat(region === 'india' ? 'en-IN' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(time)
}

export function todayLocal(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const opening: Record<Tone, (role: string, company: string) => string> = {
  formal: (role, company) =>
    `Please accept this letter as formal notice of my resignation from my position as ${role} at ${company}.`,
  warm: (role, company) =>
    `After a lot of thought, I have decided to resign from my role as ${role} at ${company}.`,
  brief: (role, company) =>
    `I am resigning from my position as ${role} at ${company}.`,
}

const thanks: Record<Tone, string> = {
  formal:
    'I would like to thank you for the opportunities I have been given during my time here.',
  warm: 'I am grateful for everything I have learned here and for the people I have worked with. Thank you for your support.',
  brief: 'Thank you for the opportunity.',
}

function noticeLine(input: ResignationInput, lastDay: string) {
  const day = formatDay(lastDay, input.region)
  if (input.region === 'other') {
    const span =
      input.noticeDays === 14 ? 'two weeks' : `${input.noticeDays} days`
    return `My last day will be ${day}, ${span} from the date of this letter.`
  }
  if (input.buyoutDays > 0) {
    return `My notice period is ${input.noticeDays} days. I request to buy out ${input.buyoutDays} of those days, which would make my last working day ${day}, subject to your approval.`
  }
  return `In line with my notice period of ${input.noticeDays} days, my last working day will be ${day}.`
}

export function resignationLetter(input: ResignationInput) {
  const role = input.role.trim() || '[Your role]'
  const company = input.company.trim() || '[Company]'
  const manager = input.manager.trim()
  const reason = input.reason.trim().replace(/([^.!?])$/, '$1.')
  const buyout = input.region === 'india' ? input.buyoutDays : 0
  const lastDay = lastWorkingDay(input.resignDate, input.noticeDays, buyout)

  const first = [
    opening[input.tone](role, company),
    noticeLine({ ...input, buyoutDays: buyout }, lastDay),
  ].join(' ')
  const handover = input.handover
    ? 'I will complete a full handover of my work and help with the transition before I leave.'
    : ''
  const exit =
    input.region === 'india' && input.exitDocuments
      ? 'Please let me know the exit formalities, and share my relieving letter, experience letter and full and final settlement details after my last working day.'
      : ''

  const closing =
    input.tone === 'brief'
      ? 'Regards,'
      : input.region === 'india'
        ? 'Yours sincerely,'
        : 'Sincerely,'

  return [
    formatDay(input.resignDate, input.region),
    `Dear ${manager || 'Manager'},`,
    first,
    reason,
    [handover, exit].filter(Boolean).join(' '),
    thanks[input.tone],
    `${closing}\n${input.name.trim() || '[Your name]'}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function resignationTitle(input: ResignationInput) {
  const company = input.company.trim()
  return company ? `Resignation letter: ${company}` : 'Resignation letter'
}
