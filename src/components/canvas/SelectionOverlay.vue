<template lang="pug">
.selection-overlay(ref="root")
  .select-box(v-if="box" :style="boxStyle")
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
//  职责: 选中高亮 + 缩放控制点 + 旋转手柄
//  策略: 屏幕坐标系定位，锚点模型缩放
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

const canvas = useCanvasStore()
const project = useProjectStore()
const root = ref<HTMLElement>()

// ── 控制点拓扑 ──

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

// 缩放方向 (图层局部坐标): -1 = 原点侧, 0 = 不变, 1 = 远端
const H_DIR: Record<Handle, [number, number]> = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
  se: [1, 1],   s: [0, 1],  sw: [-1, 1], w: [-1, 0],
}

// 锚点分量 [0..1]: 缩放时保持不动的点
const ANCHOR_F: Record<Handle, [number, number]> = {
  nw: [1, 1],   n: [0.5, 1], ne: [0, 1],   e: [0, 0.5],
  se: [0, 0],   s: [0.5, 0], sw: [1, 0],   w: [1, 0.5],
}

// ── 向量旋转 ──

function rotV(x: number, y: number, rad: number): [number, number] {
  const c = Math.cos(rad), s = Math.sin(rad)
  return [x * c - y * s, x * s + y * c]
}

// ── 锚点位置 (画板局部坐标) ──

function anchorAt(p: AnimatableProps, fx: number, fy: number): [number, number] {
  const cx = p.x + p.width / 2, cy = p.y + p.height / 2
  const rad = p.rotation * Math.PI / 180
  const [rx, ry] = rotV((fx - 0.5) * p.width, (fy - 0.5) * p.height, rad)
  return [cx + rx, cy + ry]
}

// ═══════════════════════════════════
//  响应式数据
// ═══════════════════════════════════

const selectedId = computed(() => canvas.selectedLayerIds[0] ?? null)

const activeStateId = computed(() =>
  project.project.stateGroups[0]?.activeDisplayStateId ?? null,
)

const resolved = computed<AnimatableProps | null>(() => {
  const lid = selectedId.value, sid = activeStateId.value
  if (!lid || !sid) return null
  return project.states.getResolvedProps(sid, lid) ?? null
})

// ═══════════════════════════════════
//  选框定位
// ═══════════════════════════════════

interface Box { cx: number; cy: number; w: number; h: number; r: number }
const box = ref<Box | null>(null)

/** 从 DOM 查询计算选框屏幕位置 */
function recalcBox(): void {
  const r = resolved.value, lid = selectedId.value, sid = activeStateId.value
  if (!r || !lid || !sid || !root.value) { box.value = null; return }

  const abEl = document.querySelector<HTMLElement>(`[data-state-id="${sid}"]`)
  const layerEl = abEl?.querySelector<HTMLElement>(`[data-layer-id="${lid}"]`)
  if (!layerEl) { box.value = null; return }

  const vpR = root.value.getBoundingClientRect()
  const lr = layerEl.getBoundingClientRect()
  const z = canvas.zoom

  box.value = {
    cx: (lr.left + lr.right) / 2 - vpR.left,
    cy: (lr.top + lr.bottom) / 2 - vpR.top,
    w: r.width * z,
    h: r.height * z,
    r: r.rotation,
  }
}

// 响应式更新: props / zoom / pan 变化后重算
watch(
  [resolved, () => canvas.zoom, () => canvas.panX, () => canvas.panY],
  () => nextTick(recalcBox),
  { immediate: true },
)

const boxStyle = computed(() => {
  if (!box.value) return {}
  const { cx, cy, w, h, r } = box.value
  return {
    left: `${cx - w / 2}px`,
    top: `${cy - h / 2}px`,
    width: `${w}px`,
    height: `${h}px`,
    transform: `rotate(${r}deg)`,
  }
})

// ═══════════════════════════════════
//  状态感知写入
// ═══════════════════════════════════

function writeProps(partial: Partial<AnimatableProps>): void {
  const lid = selectedId.value, sid = activeStateId.value
  if (!lid || !sid) return
  const group = project.project.stateGroups[0]
  const isDefault = group?.displayStates[0]?.id === sid
  if (isDefault) project.updateLayerProps(lid, partial)
  else project.setOverride(sid, lid, partial)
}

// ═══════════════════════════════════
//  缩放交互 (锚点模型)
// ═══════════════════════════════════

let resizeH: Handle | null = null
let initP: AnimatableProps | null = null
let anchor: [number, number] = [0, 0]
let wRect: DOMRect | null = null

function startResize(e: PointerEvent, h: Handle): void {
  const r = resolved.value, sid = activeStateId.value
  if (!r || !sid) return

  project.snapshot()
  resizeH = h
  initP = { ...r }
  anchor = anchorAt(r, ...ANCHOR_F[h])

  // 缓存画板渲染世界的屏幕位置 (拖拽期间不变)
  const abEl = document.querySelector<HTMLElement>(`[data-state-id="${sid}"]`)
  const wEl = abEl?.firstElementChild as HTMLElement
  if (wEl) wRect = wEl.getBoundingClientRect()

  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizeH || !initP || !wRect) return
  const z = canvas.zoom

  // 鼠标 → 画板局部坐标
  const mx = (e.clientX - wRect.left) / z
  const my = (e.clientY - wRect.top) / z

  // 锚点→鼠标 向量，投影到图层局部坐标轴
  const rad = -initP.rotation * Math.PI / 180
  const [lvx, lvy] = rotV(mx - anchor[0], my - anchor[1], rad)

  // 按控制点方向计算新尺寸
  const [hx, hy] = H_DIR[resizeH]
  const newW = hx !== 0 ? Math.max(1, hx * lvx) : initP.width
  const newH = hy !== 0 ? Math.max(1, hy * lvy) : initP.height

  // 从锚点 + 新尺寸反推中心 → 反推 x,y
  const [fx, fy] = ANCHOR_F[resizeH]
  const rotRad = initP.rotation * Math.PI / 180
  const [nrx, nry] = rotV((fx - 0.5) * newW, (fy - 0.5) * newH, rotRad)

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
  const r = resolved.value, sid = activeStateId.value
  if (!r || !sid) return

  project.snapshot()
  rotInitDeg = r.rotation

  // 图层中心 → 屏幕坐标
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
  const delta = (angle - rotInitAngle) * 180 / Math.PI
  writeProps({ rotation: rotInitDeg + delta })
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
/* ── 叠加层 (覆盖画布, 仅控制点可交互) ── */

.selection-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* ── 选中框 (跟随图层旋转) ── */

.select-box {
  position: absolute;
  pointer-events: none;
  border: 1.5px solid #5b5bf0;
  transform-origin: center center;
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
}

.rotate-handle:active { cursor: grabbing; }
</style>
