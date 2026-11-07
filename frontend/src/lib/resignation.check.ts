// Run with: node src/lib/resignation.check.ts
import assert from 'node:assert/strict'
import {
  formatDay,
  lastWorkingDay,
  resignationLetter,
  resignationTitle,
  todayLocal,
} from './resignation.ts'
import type { ResignationInput } from './resignation.ts'

// Plain days, across a month end, a year end and a leap day.
assert.equal(lastWorkingDay('2026-11-07', 30), '2026-12-07')
assert.equal(lastWorkingDay('2026-11-07', 60), '2027-01-06')
assert.equal(lastWorkingDay('2028-02-10', 30), '2028-03-11')
assert.equal(lastWorkingDay('2027-02-10', 30), '2027-03-12')
assert.equal(lastWorkingDay('2026-10-20', 14), '2026-11-03')

// Daylight saving must not move the date (the US clocks change on 1 Nov 2026).
assert.equal(lastWorkingDay('2026-10-30', 14), '2026-11-13')

// A buyout shortens what is served, and can't go below the day of resigning.
assert.equal(lastWorkingDay('2026-11-07', 60, 30), '2026-12-07')
assert.equal(lastWorkingDay('2026-11-07', 30, 45), '2026-11-07')
assert.equal(lastWorkingDay('2026-11-07', 30, -5), '2026-12-07')

assert.equal(lastWorkingDay('', 30), '')
assert.equal(lastWorkingDay('not a date', 30), '')

assert.equal(formatDay('2026-11-07', 'india'), '7 November 2026')
assert.equal(formatDay('2026-11-07', 'other'), 'November 7, 2026')
assert.equal(formatDay('', 'india'), '[Date]')

assert.equal(todayLocal(new Date(2026, 0, 5, 23, 30)), '2026-01-05')

const india: ResignationInput = {
  region: 'india',
  tone: 'formal',
  name: 'Neha Kulkarni',
  role: 'Marketing Associate',
  company: 'Example Traders',
  manager: 'Ms. Rao',
  resignDate: '2026-11-07',
  noticeDays: 60,
  buyoutDays: 0,
  reason: '',
  handover: true,
  exitDocuments: true,
}

const letter = resignationLetter(india)
assert.ok(letter.startsWith('7 November 2026\n\nDear Ms. Rao,'))
assert.ok(letter.includes('my last working day will be 6 January 2027'))
assert.ok(letter.includes('full handover'))
assert.ok(letter.includes('relieving letter'))
assert.ok(letter.endsWith('Yours sincerely,\nNeha Kulkarni'))
assert.ok(!letter.includes('\n\n\n'), 'empty parts leave no gaps')

const bought = resignationLetter({ ...india, buyoutDays: 30 })
assert.ok(bought.includes('buy out 30 of those days'))
assert.ok(bought.includes('last working day 7 December 2026'))

const us = resignationLetter({
  ...india,
  region: 'other',
  noticeDays: 14,
  buyoutDays: 30,
})
assert.ok(us.includes('My last day will be November 21, 2026, two weeks from'))
assert.ok(!us.includes('buy out'), 'a buyout only applies in India')
assert.ok(!us.includes('relieving letter'))
assert.ok(us.endsWith('Sincerely,\nNeha Kulkarni'))

const brief = resignationLetter({
  ...india,
  tone: 'brief',
  reason: 'I have accepted a new role',
  handover: false,
  exitDocuments: false,
})
assert.ok(brief.includes('\n\nI have accepted a new role.\n\n'))
assert.ok(!brief.includes('handover'))
assert.ok(brief.endsWith('Regards,\nNeha Kulkarni'))

const blank = resignationLetter({ ...india, name: '', role: '', company: '' })
for (const placeholder of ['[Your name]', '[Your role]', '[Company]']) {
  assert.ok(blank.includes(placeholder))
}

assert.equal(resignationTitle(india), 'Resignation letter: Example Traders')
assert.equal(resignationTitle({ ...india, company: ' ' }), 'Resignation letter')

console.log('resignation checks passed')
