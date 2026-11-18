// Run with: node src/lib/savable-content.check.ts
import assert from 'node:assert/strict'
import type { ResumeContent } from './api/types'
import { saveProblem, savable } from './savable-content.ts'

const content = {
  basics: {
    name: 'A',
    email: ' ',
    links: [
      { label: 'LinkedIn', url: 'linkedin.com/in/a' },
      { label: '', url: '' },
      { label: 'Site', url: 'https://a.dev' },
      { label: 'Mail', url: 'a@b.co' },
    ],
  },
  sections: [
    {
      id: 'p',
      type: 'projects',
      title: 'Projects',
      entries: [{ id: 'e', name: 'X', url: '', links: [], bullets: [] }],
    },
  ],
} as unknown as ResumeContent

const saved = savable(content) as unknown as {
  basics: { links: { url: string }[] }
  sections: { entries: object[] }[]
}
assert.equal('email' in saved.basics, false)
assert.deepEqual(
  saved.basics.links.map((link) => link.url),
  ['https://linkedin.com/in/a', 'https://a.dev', 'mailto:a@b.co'],
)
assert.equal('url' in saved.sections[0].entries[0], false)
// The editor's own copy is left as it is.
assert.equal(content.basics.links.length, 4)

const invalid = (path: string) => ({
  code: 'VALIDATION_ERROR',
  details: [{ location: 'body', path, message: 'x' }],
})
assert.equal(
  saveProblem(invalid('content.basics.email')),
  'finish your email address',
)
assert.equal(
  saveProblem(invalid('content.sections.0.title')),
  'a section needs a title',
)
assert.equal(saveProblem({ code: 'VERSION_CONFLICT' }), null)
assert.equal(saveProblem(null), null)
console.log('savable-content checks passed')
