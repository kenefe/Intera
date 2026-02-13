<template lang="pug">
.canvas-viewport(
  ref="viewportRef"
  @wheel.prevent="onWheel"
  @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
)
  .canvas-world(:style="worldStyle")
    ArtboardGrid
  SelectionOverlay
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CanvasViewport —— 设计画布
//  职责: 缩放 / 平移 / 图层交互 / 绘制工具
//  预览交互已迁移到 PreviewPanel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useLayerInteraction } from '@/composables/useLayerInteraction'
import { useDrawTool } from '@/composables/useDrawTool'
import { useTextTool } from '@/composables/useTextTool'
import { useKeyboard } from '@/composables/useKeyboard'
import ArtboardGrid from './ArtboardGrid.vue'
import SelectionOverlay from './SelectionOverlay.vue'

const canvas = useCanvasStore()
const viewportRef = ref<HTMLElement>()

const interaction = useLayerInteraction(viewportRef)
const draw = useDrawTool(viewportRef)
const text = useTextTool(viewportRef)
useKeyboard()

// ── 缩放/平移 → CSS transform ──

const worldStyle = computed(() => ({
  transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
  transformOrigin: '0 0',
}))

// ── 滚轮/触控板 → 缩放 or 平移 ──
//
// macOS 触控板捏合 → ctrlKey: true → 缩放
// 触控板双指滚动   → ctrlKey: false → 平移
// 鼠标 Ctrl+滚轮   → ctrlKey: true → 缩放

function onWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    // ── 缩放 (捏合手势 / Ctrl+滚轮) ──
    const rect = viewportRef.value!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const step = e.deltaMode === 1 ? e.deltaY * 0.05 : e.deltaY * 0.005
    const z = canvas.zoom * Math.exp(-step)
    canvas.setPan(
      mx - (mx - canvas.panX) * (z / canvas.zoom),
      my - (my - canvas.panY) * (z / canvas.zoom),
    )
    canvas.setZoom(z)
  } else {
    // ── 平移 (双指滚动 / 鼠标滚轮) ──
    const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    canvas.setPan(canvas.panX - dx, canvas.panY - dy)
  }
}

// ── 空格 + 拖拽平移 ──

let spaceDown = false
let panning = false
let sx = 0, sy = 0, spx = 0, spy = 0

function onKeyDown(e: KeyboardEvent): void { if (e.code === 'Space' && !e.repeat) spaceDown = true }
function onKeyUp(e: KeyboardEvent): void { if (e.code === 'Space') { spaceDown = false; panning = false } }

function onPointerDown(e: PointerEvent): void {
  if (spaceDown) {
    panning = true; sx = e.clientX; sy = e.clientY; spx = canvas.panX; spy = canvas.panY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    return
  }
  interaction.down(e); draw.down(e); text.down(e)
}

function onPointerMove(e: PointerEvent): void {
  if (panning) { canvas.setPan(spx + e.clientX - sx, spy + e.clientY - sy); return }
  interaction.move(e); draw.move(e)
}

function onPointerUp(e: PointerEvent): void {
  panning = false
  interaction.up(); draw.up(); text.up()
}

onMounted(() => { window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp) })
onUnmounted(() => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) })
</script>

<style scoped>
.canvas-viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  cursor: default;
  background:
    radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
</style>
