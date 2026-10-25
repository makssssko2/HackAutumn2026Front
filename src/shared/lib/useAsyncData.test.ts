import { afterEach, describe, expect, it } from 'vitest'
import { deferred, flushRequests, mountComposable } from '@/shared/testing'
import { useAsyncData } from './useAsyncData'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop()
})
describe('async resource lifecycle', () => {
  it('cancels old requests and ignores a response even when transport ignores cancellation', async () => {
    const first = deferred<string>(),
      second = deferred<string>()
    const signals: AbortSignal[] = []
    const mounted = mountComposable(() =>
      useAsyncData((signal) => {
        signals.push(signal)
        return signals.length === 1 ? first.promise : second.promise
      }, 'initial'),
    )
    cleanups.push(mounted.unmount)
    const reload = mounted.result.reload()
    expect(signals[0].aborted).toBe(true)
    second.resolve('new')
    await reload
    first.resolve('stale')
    await flushRequests()
    expect(mounted.result.data.value).toBe('new')
    expect(mounted.result.error.value).toBe('')
  })
  it('does not update or start requests after disposal', async () => {
    const pending = deferred<string>()
    let signal!: AbortSignal,
      calls = 0
    const mounted = mountComposable(() =>
      useAsyncData((value) => {
        signal = value
        calls++
        return pending.promise
      }, 'initial'),
    )
    mounted.unmount()
    expect(signal.aborted).toBe(true)
    pending.resolve('late')
    await flushRequests()
    await mounted.result.reload()
    expect(mounted.result.data.value).toBe('initial')
    expect(calls).toBe(1)
  })
})
