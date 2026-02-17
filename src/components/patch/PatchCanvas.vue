<template lang="pug">
.patch-canvas(
  ref="canvasRef"
  tabindex="0"
  @pointerdown="onCanvasDown"
  @pointermove="ix.onMove"
  @pointerup="ix.onUp"
  @wheel.prevent="onWheel"
  @keydown="ix.onKey"
  @contextmenu.prevent
)
  //- ── 可平移世界容器 ──
  .patch-world(:style="worldStyle")
    //- ── SVG 连线层 ──
    svg.connection-layer
      path.connection(
        v-for="conn in project.project.connections"
        :key="conn.id"
        :d="ix.connectionPath(conn)"
        :class="{ selected: ix.selectedConnIds.has(conn.id), threatened: ix.cutThreatened.has(conn.id) }"
        @click.stop="ix.onClickConnection(conn, $event)"
      )
      path.temp-line(v-if="tempPath" :d="tempPath")
      rect.box-select(
        v-if="ix.box.active"
        :x="ix.box.x" :y="ix.box.y"
        :width="ix.box.w" :height="ix.box.h"
      )
      line.cut-line(
        v-if="ix.cut.active"
        :x1="ix.cut.x1" :y1="ix.cut.y1"
        :x2="ix.cut.x2" :y2="ix.cut.y2"
      )

    //- ── 节点层 ──
    .node-layer
      PatchNode(
        v-for="p in project.project.patches" :key="p.id"
        :patch="p"
        :selected="ix.selected.has(p.id)"
        :connectedKeys="connectedKeys"
        @delete="ix.onDeleteNode(p.id)"
      )

  //- ── 工具条 (固定位置, 不随平移) ──
  .patch-toolbar
    button.node-btn(v-for="t in ADD_TYPES" :key="t.type" :data-type="t.type" :title="t.name" @click="onAddNode(t.type, t.name)") {{ t.label }}
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchCanvas —— 交互图画布 (视图壳)
//  DOM 查询在此, 交互逻辑 → usePatchInteraction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed, onMounted } from 'vue'
import type { PatchType, Patch } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import { usePatchStore } from '@store/patch'
import { usePatchInteraction } from '@composables/usePatchInteraction'
import PatchNode from './PatchNode.vue'

const project = useProjectStore()
const canvas = useCanvasStore()
const patch = usePatchStore()
const canvasRef = ref<HTMLElement | null>(null)

// ── 节点布局常量 (与 PatchNode CSS 对齐) ──
const NODE_W = 180
const HEADER_H = 26    // .node-header 渲染高度
const PORTS_PAD = 4    // .node-ports 上内边距
const ROW_H = 20       // .port-row 渲染高度
const DOT_CX = 14      // 端口圆心距节点边缘

// ── 画布平移 ──
const panX = ref(0)
const panY = ref(0)
const worldStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px)`,
}))

// ── 视图层 DOM 查询 (注入 composable) ──

function canvasXY(e: PointerEvent): { x: number; y: number } {
  const r = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - r.left - panX.value, y: e.clientY - r.top - panY.value }
}

/** 端口圆心 — 纯数据驱动 (reactive, 无 DOM 查询) */
function portPos(node: Patch, portId: string, dir: 'in' | 'out'): { x: number; y: number } {
  const ports = dir === 'in' ? node.inputs : node.outputs
  const idx = ports.findIndex(p => p.id === portId)
  const vIdx = dir === 'in' ? idx : node.inputs.length + idx
  return {
    x: node.position.x + (dir === 'out' ? NODE_W - DOT_CX : DOT_CX),
    y: node.position.y + HEADER_H + PORTS_PAD + vIdx * ROW_H + ROW_H / 2,
  }
}

function findPort(e: PointerEvent): { patchId: string; portId: string; dir: string } | null {
  const dot = (e.target as HTMLElement).closest<HTMLElement>('.port-dot')
  if (dot?.dataset.patchId && dot.dataset.portId && dot.dataset.portDir) {
    return { patchId: dot.dataset.patchId, portId: dot.dataset.portId, dir: dot.dataset.portDir }
  }
  const dots = canvasRef.value?.querySelectorAll<HTMLElement>('.port-dot')
  if (!dots) return null
  let best: HTMLElement | null = null, bestDist = 24
  for (const d of dots) {
    const r = d.getBoundingClientRect()
    const dist = Math.hypot(e.clientX - r.x - r.width / 2, e.clientY - r.y - r.height / 2)
    if (dist < bestDist) { bestDist = dist; best = d }
  }
  if (!best?.dataset.patchId || !best.dataset.portId || !best.dataset.portDir) return null
  return { patchId: best.dataset.patchId, portId: best.dataset.portId, dir: best.dataset.portDir }
}

function findNode(e: PointerEvent): string | null {
  return (e.target as HTMLElement).closest<HTMLElement>('[data-patch-id]')?.dataset.patchId ?? null
}

function nodeRect(id: string): { x: number; y: number; w: number; h: number } {
  const p = project.project.patches.find(n => n.id === id)
  if (!p) return { x: 0, y: 0, w: 0, h: 0 }
  const el = canvasRef.value?.querySelector<HTMLElement>(`[data-patch-id="${id}"]`)
  return { x: p.position.x, y: p.position.y, w: el?.offsetWidth ?? NODE_W, h: el?.offsetHeight ?? 80 }
}

function isToolbar(e: PointerEvent): boolean {
  return !!(e.target as HTMLElement).closest('.patch-toolbar')
}

const ix = usePatchInteraction({ canvasXY, findPort, findNode, portPos, nodeRect, isToolbar })

// 顶层暴露 ref → 模板自动解包 .value (嵌套在普通对象里的 ref 不会自动解包)
const tempPath = ix.tempPath

// ── 触控板/滚轮 → 平移 ──

function onWheel(e: WheelEvent): void {
  const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
  panX.value -= dx
  panY.value -= dy
}

// ── Pointer Capture (确保拖线/框选跟手) ──

function onCanvasDown(e: PointerEvent): void {
  ix.onDown(e)
  if (!isToolbar(e)) canvasRef.value?.setPointerCapture(e.pointerId)
}

// ── 已连接端口键集合 (供 PatchNode 渲染实心圆点) ──

const connectedKeys = computed(() => {
  const keys = new Set<string>()
  for (const c of project.project.connections) {
    keys.add(`${c.fromPatchId}:${c.fromPortId}`)
    keys.add(`${c.toPatchId}:${c.toPortId}`)
  }
  return keys
})
onMounted(() => canvasRef.value?.focus())

// ── 节点添加 ──

const ADD_TYPES: Array<{ type: PatchType; label: string; name: string }> = [
  { type: 'touch',          label: 'Touch',  name: 'Touch' },
  { type: 'condition',      label: 'If',     name: '条件' },
  { type: 'toggleVariable', label: 'Toggle', name: 'Toggle' },
  { type: 'delay',          label: 'Delay',  name: '延迟' },
  { type: 'to',             label: 'To',     name: 'To' },
  { type: 'setTo',          label: 'SetTo',  name: 'SetTo' },
  { type: 'setVariable',    label: 'SetVar', name: 'SetVar' },
  { type: 'behaviorDrag',   label: 'Drag',   name: '拖拽行为' },
  { type: 'behaviorScroll', label: 'Scroll', name: '滚动行为' },
]

const LAYER_TYPES = new Set<PatchType>(['touch', 'drag', 'behaviorDrag', 'behaviorScroll'])

let addIdx = 0
function onAddNode(type: PatchType, name: string): void {
  const x = 40 + (addIdx % 4) * 220
  const y = 60 + Math.floor(addIdx / 4) * 140
  addIdx++
  // 自动关联当前选中图层 (Touch / Drag / 行为类节点)
  const layerId = LAYER_TYPES.has(type) ? canvas.selectedLayerIds[0] : undefined
  const p = patch.addPatchNode(type, { x, y }, layerId ? { layerId } : {}, name)
  ix.selected.clear()
  ix.selected.add(p.id)
}
</script>

<style scoped>
.patch-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--surface-0);
  overflow: hidden;
  outline: none;
}

.patch-world { position: absolute; inset: 0; will-change: transform; }

.connection-layer { position: absolute; inset: 0; pointer-events: none; overflow: visible; }

.connection {
  fill: none;
  stroke: rgba(99, 102, 241, 0.6);
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
  transition: stroke var(--duration-fast), stroke-width var(--duration-fast);
}

.connection:hover { stroke: var(--danger); stroke-width: 2.5; }
.connection.selected { stroke: var(--accent-light); stroke-width: 2.5; }
.connection.threatened { stroke: #ff4040; stroke-width: 2.5; stroke-dasharray: 4 3; }
.temp-line { fill: none; stroke: rgba(99, 102, 241, 0.7); stroke-width: 1.5; stroke-dasharray: 6 4; }
.box-select { fill: rgba(99, 102, 241, 0.10); stroke: var(--accent); stroke-width: 1; stroke-dasharray: 4 3; }
.cut-line { stroke: rgba(239, 68, 68, 0.7); stroke-width: 1.5; stroke-dasharray: 6 4; }

.node-layer { position: absolute; inset: 0; }

.patch-toolbar {
  position: absolute;
  top: var(--sp-3);
  left: var(--sp-3);
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  background: rgba(0, 0, 0, 0.40);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-subtle);
}

.node-btn {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.node-btn:hover {
  background: var(--accent-bg);
  color: var(--accent-text);
  border-color: var(--accent-border);
}
</style>
