import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkArchitecture } from './check-fsd.mjs'

function check(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-fsd-'))
  try {
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(root, name)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, content)
    }
    return checkArchitecture(root)
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
    assert(path.basename(root).startsWith('invoice-fsd-'))
    fs.rmSync(root, { recursive: true, force: true })
  }
}
const valid = {
  'app/main.ts': "import { Page } from '@/pages/home'",
  'pages/home/index.ts': "export { Page } from './ui/Page'",
  'pages/home/ui/Page.ts': "export const Page = 'home'",
  'entities/payment/index.ts': 'export const payment = {}',
  'shared/api/index.ts': 'export const api = () => {}',
}
test('accepts page-first FSD without artificial empty layers', () =>
  assert.deepEqual(check(valid), []))
for (const statement of [
  "import '@/pages/home'",
  "export { Page } from '@/pages/home'",
  "void import('@/pages/home')",
  "type Page = import('@/pages/home').Page",
])
  test(`catches upward dependency: ${statement}`, () =>
    assert(
      check({ ...valid, 'entities/payment/model/value.ts': statement }).some((error) =>
        error.includes('forbidden dependency'),
      ),
    ))
test('checks Vue SFC imports including multiline side effects', () => {
  assert(
    check({
      ...valid,
      'entities/payment/ui/Value.vue':
        '<script setup lang="ts">\nimport\n "@/pages/home"\n</script><template><div /></template>',
    }).some((error) => error.includes('forbidden dependency')),
  )
})
test('rejects deep imports and unresolved paths', () => {
  const errors = check({
    ...valid,
    'app/main.ts': "import '@/pages/home/ui/Page'; import '@/entities/missing'",
  })
  assert(errors.some((error) => error.includes('public API')))
  assert(errors.some((error) => error.includes('unresolved')))
})
test('rejects cross-slice relative imports and missing public APIs', () => {
  const errors = check({ ...valid, 'pages/other/ui/Other.ts': "import '../../home'" })
  assert(errors.some((error) => error.includes('forbidden dependency')))
  assert(errors.some((error) => error.includes('slice must expose')))
})
test('detects own-barrel cycles and ignores fake imports in comments', () => {
  assert.deepEqual(check({ ...valid, 'app/main.ts': '// import "@/missing"' }), [])
  const errors = check({
    ...valid,
    'pages/home/ui/Page.ts': "import { Page as Other } from '..'; export const Page = Other",
  })
  assert(errors.some((error) => error.includes('own public API')))
  assert(errors.some((error) => error.includes('Circular dependency')))
})
test('requires explicit public exports', () => {
  assert(
    check({ ...valid, 'pages/home/index.ts': "export * from './ui/Page'" }).some((error) =>
      error.includes('explicit exports'),
    ),
  )
})
test('does not treat erased type references as runtime dependency cycles', () => {
  assert.deepEqual(
    check({
      ...valid,
      'shared/lib/a.ts': "import { type B } from './b'; export interface A { b?: B }",
      'shared/lib/b.ts': "import type { A } from './a'; export interface B { a?: A }",
    }),
    [],
  )
})
