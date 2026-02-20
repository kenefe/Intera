<template lang="pug">
canvas.curve-preview(ref="cvs" :width="W" :height="H" :aria-label="'曲线预览: ' + curve.type")
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { CurveConfig } from '@engine/scene/types'

const props = defineProps<{ curve: CurveConfig }>()
const cvs = ref<HTMLCanvasElement>()
const W = 200, H = 80

let raf = 0
let frame = 0
let pts: number[] = []

function simulateSpring(response: number, damping: number): number[] {
  const omega = 2 * Math.PI / Math.max(response, 0.01)
  const zeta = Math.min(damping, 1.99)
  const dt = 1 / 120
  let x = 0, v = 0
  const out: number[] = []
  for (let i = 0; i < 240; i++) {
    const force = -omega * omega * (x - 1) - 2 * zeta * omega * v
    v += force * dt; x += v * dt; out.push(x)
    if (i > 20 && Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break
  }
  return out
}

function buildPts(): number[] {
  const c = props.curve
  if (c.type === 'spring') return simulateSpring(c.response ?? 0.35, c.damping ?? 0.95)
  if (c.type === 'linear') return Array.from({ length: 60 }, (_, i) => i / 59)
  if (c.type === 'bezier') {
    const [, y1, , y2] = c.controlPoints ?? [0.25, 0.1, 0.25, 1]
    return Array.from({ length: 60 }, (_, i) => {
      const t = i / 59, u = 1 - t
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
    })
  }
  return Array.from({ length: 60 }, (_, i) => Math.min(1, i / 30))
}

function draw(): void {
  const ctx = cvs.value?.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const pad = 8, gw = W - pad * 2, gh = H - pad * 2
  const maxVal = Math.max(1.05, ...pts)
  const minVal = Math.min(-0.05, ...pts)
  const range = maxVal - minVal

  // 基线
  const baseY = pad + gh * (1 - (1 - minVal) / range)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(W - pad, baseY); ctx.stroke()

  // 曲线
  ctx.strokeStyle = '#6ee7b7'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const x = pad + (i / (pts.length - 1)) * gw
    const y = pad + gh * (1 - (pts[i] - minVal) / range)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 弹跳小球
  if (frame < pts.length) {
    const bx = pad + (frame / (pts.length - 1)) * gw
    const by = pad + gh * (1 - (pts[frame] - minVal) / range)
    ctx.fillStyle = '#6ee7b7'
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill()
  }
}

function animate(): void {
  frame++
  if (frame >= pts.length) { draw(); return }
  draw()
  raf = requestAnimationFrame(animate)
}

function restart(): void {
  cancelAnimationFrame(raf)
  pts = buildPts()
  frame = 0
  draw()
  raf = requestAnimationFrame(animate)
}

onMounted(restart)
watch(() => props.curve, restart, { deep: true })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.curve-preview {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  margin-top: var(--sp-1);
}
</style>
