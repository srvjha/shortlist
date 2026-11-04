// Run with: node src/lib/save-flush.check.ts
import assert from 'node:assert/strict'
import { flushStep } from './save-flush.ts'

const step = (unsaved: boolean, saving: boolean, failed = false) =>
  flushStep({ unsaved, saving, failed })

assert.equal(step(false, false), 'done')
assert.equal(step(true, false), 'save')
// A save in flight may be for an older draft, so it is never treated as finished.
assert.equal(step(false, true), 'wait')
assert.equal(step(true, true), 'wait')
assert.equal(step(true, false, true), 'fail')
console.log('save-flush checks passed')
