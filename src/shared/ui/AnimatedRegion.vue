<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const region = ref<HTMLElement>()
const content = ref<HTMLElement>()
let observer: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let animation: Animation | undefined
let frame = 0
let lastHeight = 0
let changed = false
let initialRenderComplete = false
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function clearAnimation() {
  animation?.cancel()
  animation = undefined
  if (region.value) {
    region.value.style.height = ''
    region.value.style.overflow = ''
  }
}

function update() {
  frame = 0
  const outer = region.value
  const inner = content.value
  if (!outer || !inner) return
  const height = inner.getBoundingClientRect().height
  const from = animation ? outer.getBoundingClientRect().height : lastHeight
  const contentChanged = changed
  changed = false
  lastHeight = height
  // Loading placeholders already have a nonzero height. The first data render
  // is still initialization, not a resize of an established page.
  if (!initialRenderComplete) {
    initialRenderComplete = height > 0 && !inner.querySelector('[aria-busy="true"]')
    clearAnimation()
    return
  }
  // A first measurable render has no previous layout to interpolate from.
  if (from <= 0 || reducedMotion.matches) {
    clearAnimation()
    return
  }
  if (!contentChanged && Math.abs(height - from) < 0.5) return
  const timing = getComputedStyle(outer).getPropertyValue('--transition-duration-fast').trim()
  const duration = Number.parseFloat(timing) * (timing.endsWith('ms') ? 1 : 1000)
  clearAnimation()
  // Measure the unconstrained inner flow, animate only its outer boundary, then
  // restore intrinsic height. Interruptions continue from the visible height.
  outer.style.height = `${height}px`
  outer.style.overflow = 'clip'
  const current = outer.animate(
    [
      { height: `${from}px`, opacity: contentChanged ? 0.45 : 1 },
      { height: `${height}px`, opacity: 1 },
    ],
    { duration, easing: 'ease' },
  )
  animation = current
  current.onfinish = () => {
    if (animation === current) clearAnimation()
  }
}

function schedule(contentChanged = false) {
  changed ||= contentChanged
  if (!frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  const inner = content.value!
  lastHeight = inner.getBoundingClientRect().height
  initialRenderComplete = lastHeight > 0 && !inner.querySelector('[aria-busy="true"]')
  // Subtree observation includes nested lists, conditional forms, messages and
  // text-only updates without requiring every page to register its own effects.
  observer = new MutationObserver(() => schedule(true))
  observer.observe(inner, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-busy'],
    subtree: true,
  })
  resizeObserver = new ResizeObserver(() => {
    if (Math.abs(inner.getBoundingClientRect().height - lastHeight) >= 0.5) {
      // ResizeObserver runs before paint; don't expose one unanimated frame.
      cancelAnimationFrame(frame)
      update()
    }
  })
  resizeObserver.observe(inner)
  // Native details/v-show and responsive layout are measured by ResizeObserver.
  reducedMotion.addEventListener('change', clearAnimation)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  cancelAnimationFrame(frame)
  clearAnimation()
  reducedMotion.removeEventListener('change', clearAnimation)
})
</script>

<template>
  <div ref="region" class="animated-region">
    <div ref="content" class="animated-region-content"><slot /></div>
  </div>
</template>

<style scoped>
.animated-region-content {
  display: flow-root;
  min-width: 0;
}
</style>
