<template lang="pug">
.patch-canvas(
  ref="canvasRef"
  tabindex="0"
  @pointerdown="onCanvasDown"
  @pointermove="ix.onMove"
  @pointerup="ix.onUp"
  @keydown="ix.onKey"
  @contextmenu.prevent
)
  //- ── SVG 连线层 ──
  svg.connection-layer
    path.connection(
      v-for="conn in project.project.connections"
      :key="conn.id"
      :d="ix.connectionPath(conn)"
      :class="{ selected: ix.selectedConnIds.has(conn.id), threatened: ix.cutThreatened.has(conn.id) }"
      @click.stop="ix.onClickConnection(conn, $event)"
    )
    path.temp-line(v-if="ix.tempPath" :d="ix.tempPath")
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

  //- ── 工具条 ──
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
const NODE_W = 180

// ── 视图层 DOM 查询 (注入 composable) ──

function canvasXY(e: PointerEvent): { x: number; y: number } {
  const r = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function portPos(node: Patch, portId: string, dir: 'in' | 'out'): { x: number; y: number } {
  const dot = canvasRef.value?.querySelector<HTMLElement>(
    `.port-dot[data-patch-id="${node.id}"][data-port-id="${portId}"]`,
  )
  if (dot) {
    const cr = canvasRef.value!.getBoundingClientRect()
    const dr = dot.getBoundingClientRect()
    return { x: dr.left + dr.width / 2 - cr.left, y: dr.top + dr.height / 2 - cr.top }
  }
  const ports = dir === 'in' ? node.inputs : node.outputs
  const idx = ports.findIndex(p => p.id === portId)
  const offset = dir === 'in' ? 0 : node.inputs.length
  return {
    x: node.position.x + (dir === 'out' ? NODE_W : 0),
    y: node.position.y + 26 + (offset + idx) * 20 + 10,
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
  background: #12122a;
  overflow: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  outline: none;
}
.connection-layer { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.connection {
  fill: none;
  stroke: rgba(136, 136, 255, 0.7);
  stroke-width: 2.5;
  pointer-events: stroke;
  cursor: pointer;
  transition: stroke 0.12s, stroke-width 0.12s;
}
.connection:hover { stroke: #ff6060; stroke-width: 3; }
.connection.selected { stroke: #8888ff; stroke-width: 3.5; }
.connection.threatened { stroke: #ff4040; stroke-width: 3; stroke-dasharray: 4 3; }
.temp-line { fill: none; stroke: rgba(136, 136, 255, 0.8); stroke-width: 2; stroke-dasharray: 6 4; }
.box-select { fill: rgba(100, 100, 255, 0.15); stroke: rgba(100, 100, 255, 0.8); stroke-width: 1; stroke-dasharray: 4 3; }
.cut-line { stroke: rgba(255, 80, 80, 0.8); stroke-width: 2; stroke-dasharray: 6 4; }
.node-layer { position: absolute; inset: 0; }
.patch-toolbar {
  position: absolute;
  top: 8px; left: 8px;
  display: flex; gap: 6px; padding: 4px;
  background: rgba(0, 0, 0, 0.3); border-radius: 6px;
}
.node-btn {
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.node-btn:hover { background: rgba(91, 91, 240, 0.2); color: #aaf; border-color: rgba(91, 91, 240, 0.4); }
</style>
