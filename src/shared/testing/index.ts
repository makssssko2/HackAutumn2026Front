import { createRenderer, nextTick } from 'vue'

interface TestNode {
  parent?: TestNode
}
const node = (): TestNode => ({})
const renderer = createRenderer<TestNode, TestNode>({
  createElement: node,
  createText: node,
  createComment: node,
  insert: (child, parent) => {
    child.parent = parent
  },
  remove: () => {},
  setText: () => {},
  setElementText: () => {},
  patchProp: () => {},
  parentNode: (child) => child.parent || null,
  nextSibling: () => null,
})

/** Runs real Vue setup/mount/disposal hooks without requiring a DOM emulator. */
export function mountComposable<T>(setup: () => T) {
  let result!: T
  const app = renderer.createApp({
    setup() {
      result = setup()
      return () => null
    },
  })
  app.mount(node())
  return { result, unmount: () => app.unmount() }
}
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
export async function flushRequests() {
  for (let index = 0; index < 12; index++) await Promise.resolve()
  await nextTick()
}
