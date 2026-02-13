<template lang="pug">
.selection-overlay(ref="root")
  .select-box(
    v-for="(b, idx) in allBoxes" :key="b.id"
    :style="boxStyle(b)"
  )
    //- 控制手柄 (仅单选时渲染)
    template(v-if="idx === 0 && isSingle")
      .handle(
        v-for="h in HANDLES" :key="h"
        :class="'h-' + h"
        @pointerdown.stop.prevent="startResize($event, h)"
      )
      .rotate-connector
      .rotate-handle(@pointerdown.stop.prevent="startRotate")
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SelectionOverlay —— 选中控制框
//  职责: 选中高亮 + 缩放控制 + 旋转控制
//  支持: 单选 (完整控制) + 多选 (仅边框)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

const canvas = useCanvasStore()
const project = useProjectStore()
const root = ref<HTMLElement>()

// ═══════════════════════════════════
//  控制点拓扑
// ═══════════════════════════════════

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const H_DIR: Record<Handle, [number, number]> = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
  se: [1, 1],   s: [0, 1],  sw: [-1, 1], w: [-1, 0],
}

const ANCHOR_F: Record<Handle, [number, number]> = {
  nw: [1, 1],   n: [0.5, 1], ne: [0, 1],   e: [0, 0.5],
  se: [0, 0],   s: [0.5, 0], sw: [1, 0],   w: [1, 0.5],
}

// ── 工具函数 ──

function rotV(x: number, y: number, rad: number): [number, number] {
  const c = Math.cos(rad), s = Math.sin(rad)
  return [x * c - y * s, x * s + y * c]
}

function anchorAt(p: AnimatableProps, fx: number, fy: number): [number, number] {
  const cx = p.x + p.width / 2, cy = p.y + p.height / 2
  const [rx, ry] = rotV((fx - 0.5) * p.width, (fy - 0.5) * p.height, p.rotation * Math.PI / 180)
  return [cx + rx, cy + ry]
}

// ═══════════════════════════════════
//  响应式数据
// ═══════════════════════════════════

const activeStateId = computed(() =>
  project.project.stateGroups[0]?.activeDisplayStateId ?? null,
)

// ═══════════════════════════════════
//  选框计算 (多选支持)
// ═══════════════════════════════════

interface LayerBox { id: string; cx: number; cy: number; w: number; h: number; r: number }

const allBoxes = ref<LayerBox[]>([])
const primaryBox = computed(() => allBoxes.value[0] ?? null)
const isSingle = computed(() => allBoxes.value.length === 1)

function recalcBoxes(): void {
  const sid = activeStateId.value
  if (!sid || !root.value || canvas.selectedLayerIds.length === 0) {
    allBoxes.value = []; return
  }

  const vpR = root.value.getBoundingClientRect()
  const z = canvas.zoom
  const abEl = document.querySelector<HTMLElement>(`[data-state-id="${sid}"]`)
  if (!abEl) { allBoxes.value = []; return }

  const result: LayerBox[] = []
  for (const lid of canvas.selectedLayerIds) {
    const r = project.states.getResolvedProps(sid, lid)
    const layerEl = abEl.querySelector<HTMLElement>(`[data-layer-id="${lid}"]`)
    if (!r || !layerEl) continue

    const lr = layerEl.getBoundingClientRect()
    result.push({
      id: lid,
      cx: (lr.left + lr.right) / 2 - vpR.left,
      cy: (lr.top + lr.bottom) / 2 - vpR.top,
      w: r.width * z,
      h: r.height * z,
      r: r.rotation,
    })
  }
  allBoxes.value = result
}

watch(
  [
    () => [...canvas.selectedLayerIds],
    activeStateId,
    () => canvas.zoom,
    () => canvas.panX,
    () => canvas.panY,
    () => {
      const sid = activeStateId.value
      if (!sid) return null
      return canvas.selectedLayerIds.map(lid =>
        project.states.getResolvedProps(sid, lid),
      )
    },
  ],
  () => nextTick(recalcBoxes),
  { immediate: true, deep: true },
)

// ═══════════════════════════════════
//  样式
// ═══════════════════════════════════

function boxStyle(b: LayerBox): Record<string, string> {
  return {
    left: `${b.cx - b.w / 2}px`,
    top: `${b.cy - b.h / 2}px`,
    width: `${b.w}px`,
    height: `${b.h}px`,
    transform: `rotate(${b.r}deg)`,
  }
}

// ═══════════════════════════════════
//  状态感知写入
// ═══════════════════════════════════

function writeProps(partial: Partial<AnimatableProps>): void {
  const lid = canvas.selectedLayerIds[0]
  const sid = activeStateId.value
  if (!lid || !sid) return
  const group = project.project.stateGroups[0]
  const isDefault = group?.displayStates[0]?.id === sid
  if (isDefault) project.updateLayerProps(lid, partial)
  else project.setOverride(sid, lid, partial)
}

function getFirstResolved(): AnimatableProps | null {
  const lid = canvas.selectedLayerIds[0]
  const sid = activeStateId.value
  if (!lid || !sid) return null
  return project.states.getResolvedProps(sid, lid) ?? null
}

// ═══════════════════════════════════
//  缩放交互 (锚点模型)
// ═══════════════════════════════════

let resizeH: Handle | null = null
let initP: AnimatableProps | null = null
let anchor: [number, number] = [0, 0]
let wRect: DOMRect | null = null

function startResize(e: PointerEvent, h: Handle): void {
  const r = getFirstResolved()
  const sid = activeStateId.value
  if (!r || !sid) return

  project.snapshot()
  resizeH = h
  initP = { ...r }
  anchor = anchorAt(r, ...ANCHOR_F[h])

  const abEl = document.querySelector<HTMLElement>(`[data-state-id="${sid}"]`)
  const wEl = abEl?.firstElementChild as HTMLElement
  if (wEl) wRect = wEl.getBoundingClientRect()

  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizeH || !initP || !wRect) return
  const z = canvas.zoom
  const mx = (e.clientX - wRect.left) / z
  const my = (e.clientY - wRect.top) / z

  const [lvx, lvy] = rotV(mx - anchor[0], my - anchor[1], -initP.rotation * Math.PI / 180)
  const [hx, hy] = H_DIR[resizeH]
  const newW = hx !== 0 ? Math.max(1, hx * lvx) : initP.width
  const newH = hy !== 0 ? Math.max(1, hy * lvy) : initP.height

  const [fx, fy] = ANCHOR_F[resizeH]
  const [nrx, nry] = rotV((fx - 0.5) * newW, (fy - 0.5) * newH, initP.rotation * Math.PI / 180)

  writeProps({
    x: anchor[0] - nrx - newW / 2,
    y: anchor[1] - nry - newH / 2,
    width: newW,
    height: newH,
  })
}

function onResizeEnd(): void {
  resizeH = null; initP = null; wRect = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}

// ═══════════════════════════════════
//  旋转交互
// ═══════════════════════════════════

let rotInitDeg = 0
let rotInitAngle = 0
let rotCenter: [number, number] = [0, 0]

function startRotate(e: PointerEvent): void {
  const r = getFirstResolved()
  const sid = activeStateId.value
  if (!r || !sid) return

  project.snapshot()
  rotInitDeg = r.rotation

  const abEl = document.querySelector<HTMLElement>(`[data-state-id="${sid}"]`)
  const wEl = abEl?.firstElementChild as HTMLElement
  if (!wEl) return
  const wr = wEl.getBoundingClientRect()
  const z = canvas.zoom
  rotCenter = [
    wr.left + (r.x + r.width / 2) * z,
    wr.top + (r.y + r.height / 2) * z,
  ]
  rotInitAngle = Math.atan2(e.clientY - rotCenter[1], e.clientX - rotCenter[0])

  window.addEventListener('pointermove', onRotateMove)
  window.addEventListener('pointerup', onRotateEnd)
}

function onRotateMove(e: PointerEvent): void {
  const angle = Math.atan2(e.clientY - rotCenter[1], e.clientX - rotCenter[0])
  writeProps({ rotation: rotInitDeg + (angle - rotInitAngle) * 180 / Math.PI })
}

function onRotateEnd(): void {
  window.removeEventListener('pointermove', onRotateMove)
  window.removeEventListener('pointerup', onRotateEnd)
}

// ── 清理 ──

onUnmounted(() => {
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
  window.removeEventListener('pointermove', onRotateMove)
  window.removeEventListener('pointerup', onRotateEnd)
})
</script>

<style scoped>
/* ── 叠加层 ── */

.selection-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* ── 选中框 (旋转对齐) ── */

.select-box {
  position: absolute;
  pointer-events: none;
  border: 1.5px solid #5b5bf0;
  transform-origin: center center;
  box-sizing: border-box;
}

/* ── 8 个缩放控制点 ── */

.handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1.5px solid #5b5bf0;
  border-radius: 1px;
  pointer-events: auto;
  transform: translate(-50%, -50%);
  z-index: 1;
  box-sizing: border-box;
}

.h-nw { left: 0;    top: 0;    cursor: nwse-resize; }
.h-n  { left: 50%;  top: 0;    cursor: ns-resize;   }
.h-ne { left: 100%; top: 0;    cursor: nesw-resize; }
.h-e  { left: 100%; top: 50%;  cursor: ew-resize;   }
.h-se { left: 100%; top: 100%; cursor: nwse-resize; }
.h-s  { left: 50%;  top: 100%; cursor: ns-resize;   }
.h-sw { left: 0;    top: 100%; cursor: nesw-resize; }
.h-w  { left: 0;    top: 50%;  cursor: ew-resize;   }

/* ── 旋转手柄 ── */

.rotate-connector {
  position: absolute;
  left: 50%;
  top: -24px;
  width: 1px;
  height: 24px;
  background: #5b5bf0;
  pointer-events: none;
  transform: translateX(-50%);
}

.rotate-handle {
  position: absolute;
  left: 50%;
  top: -32px;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 1.5px solid #5b5bf0;
  border-radius: 50%;
  pointer-events: auto;
  transform: translate(-50%, 0);
  cursor: grab;
  box-sizing: border-box;
}

.rotate-handle:active { cursor: grabbing; }
</style>
