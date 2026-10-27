// Run with: node src/lib/format.check.ts
import assert from 'node:assert/strict'
import { formatMoney } from './format.ts'

assert.equal(formatMoney(49_900, 'INR'), '₹499')
assert.equal(formatMoney(900, 'USD'), '$9')
assert.equal(formatMoney(150, 'USD'), '$1.50')
console.log('format checks passed')
