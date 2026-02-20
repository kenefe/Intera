<template lang="pug">
canvas.curve-preview(ref="cvs" :width="W" :height="H")
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { CurveConfig } from '@engine/scene/types'

const props = defineProps<{ curve: CurveConfig }>()
const cvs = ref<HTMLCanvasElement>()
const W = 200, H = 80

function simulateSpring(response: number, damping: number): number[] {
  const omega = 2 * Math.PI / Math.max(response, 0.01)
  const zeta = Math.min(damping, 1.99)
  const dt = 1 / 120
  let x = 0, v = 0
  const pts: number[] = []
  for (let i = 0; i < 240; i++) {
    const force = -omega * omega * (x - 1) - 2 * zeta * omega * v
    v += force * dt
    x += v * dt
    pts.push(x)
    if (i > 20 && Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break
  }
  return pts
}

function draw(): void {
  const ctx = cvs.value?.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)

  const c = props.curve
  let pts: number[]
  if (c.type === 'spring') {
    pts = simulateSpring(c.response ?? 0.35, c.damping ?? 0.95)
  } else if (c.type === 'linear') {
    pts = Array.from({ length: 60 }, (_, i) => i / 59)
  } else if (c.type === 'bezier') {
    const [x1, y1, x2, y2] = c.controlPoints ?? [0.25, 0.1, 0.25, 1]
    pts = Array.from({ length: 60 }, (_, i) => {
      const t = i / 59
      const u = 1 - t
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
    })
  } else {
    pts = Array.from({ length: 60 }, (_, i) => Math.min(1, i / 30))
  }

  const pad = 8, gw = W - pad * 2, gh = H - pad * 2
  const maxVal = Math.max(1.05, ...pts)
  const minVal = Math.min(-0.05, ...pts)
  const range = maxVal - minVal

  // 基线 y=1
  const baseY = pad + gh * (1 - (1 - minVal) / range)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, baseY)
  ctx.lineTo(W - pad, baseY)
  ctx.stroke()

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
}

onMounted(draw)
watch(() => props.curve, draw, { deep: true })
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
