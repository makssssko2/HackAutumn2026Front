const pressSelector = '.button, .table-sort-button'

// Delegation covers controls added by routes, lists and dialogs after startup.
export function installPressFeedback(): () => void {
  const listeners = new AbortController()
  const options = { capture: true, signal: listeners.signal }
  let pressed: HTMLElement | null = null
  let pointerId: number | null = null
  let pressedKey: string | null = null

  function available(element: HTMLElement): boolean {
    return (
      element.isConnected &&
      !element.matches(':disabled, [aria-disabled="true"]') &&
      !element.closest('[inert]')
    )
  }

  function control(target: EventTarget | null): HTMLElement | null {
    const element = target instanceof Element ? target.closest<HTMLElement>(pressSelector) : null
    return element && available(element) ? element : null
  }

  function clear(): void {
    observer.disconnect()
    pressed?.removeAttribute('data-pressed')
    pressed = null
    pointerId = null
    pressedKey = null
  }

  // A pending action may disable/remove a held control before the release event.
  const observer = new MutationObserver(() => {
    if (pressed && !available(pressed)) clear()
  })

  function begin(element: HTMLElement): void {
    clear()
    pressed = element
    element.setAttribute('data-pressed', '')
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'inert'],
    })
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0) return
      const element = control(event.target)
      if (!element) return
      begin(element)
      pointerId = event.pointerId
    },
    options,
  )

  function releasePointer(event: PointerEvent): void {
    if (event.pointerId === pointerId) clear()
  }
  document.addEventListener('pointerup', releasePointer, options)
  document.addEventListener('pointercancel', releasePointer, options)
  document.addEventListener('lostpointercapture', releasePointer, options)
  document.addEventListener(
    'pointerout',
    (event) => {
      if (
        event.pointerId === pointerId &&
        !(event.relatedTarget instanceof Node && pressed?.contains(event.relatedTarget))
      )
        clear()
    },
    options,
  )

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      const element = control(event.target)
      if (!element || (event.key === ' ' && element.matches('a[href]:not([role="button"])'))) return
      begin(element)
      pressedKey = event.key
    },
    options,
  )
  document.addEventListener(
    'keyup',
    (event) => {
      if (event.key === pressedKey) clear()
    },
    options,
  )
  document.addEventListener(
    'focusout',
    (event) => {
      if (event.target === pressed) clear()
    },
    options,
  )
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) clear()
    },
    options,
  )
  window.addEventListener('blur', clear, options)

  return () => {
    clear()
    listeners.abort()
  }
}
