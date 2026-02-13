<template lang="pug">
.patch-canvas(
  @pointerdown="onDown"
  @pointermove="onMove"
  @pointerup="onUp"
)
  //- ── SVG 连线层 ──
  svg.connection-layer
    path.connection(
      v-for="conn in project.project.connections"
      :key="conn.id"
      :d="connectionPath(conn)"
      @click.stop="onDeleteConnection(conn.id)"
    )
    path.temp-line(v-if="tempPath" :d="tempPath")

  //- ── 节点层 ──
  .node-layer
    PatchNode(v-for="p in project.project.patches" :key="p.id" :patch="p")

  //- ── 工具条 ──
  .patch-toolbar
    button.add-btn(v-for="t in ADD_TYPES" :key="t.type" @click="onAddNode(t.type, t.name)") {{ t.label }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PatchType, PatchConnection } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'
import PatchNode from './PatchNode.vue'

const project = useProjectStore()
const patch = usePatchStore()

// ── 节点添加菜单 ──

const ADD_TYPES: Array<{ type: PatchType; label: string; name: string }> = [
  { type: 'touch',          label: 'Touch',    name: 'Touch' },
  { type: 'condition',      label: 'If',       name: '条件' },
  { type: 'toggleVariable', label: 'Toggle',   name: 'Toggle' },
  { type: 'delay',          label: 'Delay',    name: '延迟' },
  { type: 'to',             label: 'To',       name: 'To' },
  { type: 'setTo',          label: 'SetTo',    name: 'SetTo' },
  { type: 'setVariable',    label: 'SetVar',   name: 'SetVar' },
]

let addIdx = 0
function onAddNode(type: PatchType, name: string): void {
  const x = 40 + (addIdx % 4) * 220
  const y = 60 + Math.floor(addIdx / 4) * 140
  addIdx++
  patch.addPatchNode(type, { x, y }, {}, name)
}

// ── 端口坐标计算 ──

const NODE_W = 180
const HEADER_H = 28
const PORT_H = 24
const PORT_R = 4   // 端口圆心相对边缘

function portPos(patchNode: typeof project.project.patches[number], portId: string, dir: 'in' | 'out'): { x: number; y: number } {
  const ports = dir === 'in' ? patchNode.inputs : patchNode.outputs
  const idx = ports.findIndex(p => p.id === portId)
  const offset = dir === 'in' ? 0 : patchNode.inputs.length
  return {
    x: patchNode.position.x + (dir === 'out' ? NODE_W : 0),
    y: patchNode.position.y + HEADER_H + (offset + idx) * PORT_H + PORT_H / 2,
  }
}

// ── SVG 贝塞尔连线 ──

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

function connectionPath(conn: PatchConnection): string {
  const from = project.project.patches.find(p => p.id === conn.fromPatchId)
  const to   = project.project.patches.find(p => p.id === conn.toPatchId)
  if (!from || !to) return ''
  const a = portPos(from, conn.fromPortId, 'out')
  const b = portPos(to, conn.toPortId, 'in')
  return bezier(a.x, a.y, b.x, b.y)
}

// ── 交互: 拖拽节点 & 连线端口 ──

let dragPatchId: string | null = null
let dragStartX = 0, dragStartY = 0
let patchX0 = 0, patchY0 = 0

let wireFrom: { patchId: string; portId: string } | null = null
const tempPath = ref<string | null>(null)

function findPort(e: PointerEvent): { patchId: string; portId: string; dir: string } | null {
  const dot = (e.target as HTMLElement).closest<HTMLElement>('.port-dot')
  if (!dot?.dataset.patchId || !dot.dataset.portId || !dot.dataset.portDir) return null
  return { patchId: dot.dataset.patchId, portId: dot.dataset.portId, dir: dot.dataset.portDir }
}

function findNode(e: PointerEvent): string | null {
  return (e.target as HTMLElement).closest<HTMLElement>('[data-patch-id]')?.dataset.patchId ?? null
}

function onDown(e: PointerEvent): void {
  // 优先检测端口拖线
  const port = findPort(e)
  if (port?.dir === 'out') {
    wireFrom = { patchId: port.patchId, portId: port.portId }
    return
  }
  // 节点拖拽
  const id = findNode(e)
  if (!id) return
  const p = project.project.patches.find(n => n.id === id)
  if (!p) return
  dragPatchId = id
  dragStartX = e.clientX; dragStartY = e.clientY
  patchX0 = p.position.x; patchY0 = p.position.y
}

function onMove(e: PointerEvent): void {
  if (dragPatchId) {
    patch.updatePatchPos(dragPatchId, {
      x: patchX0 + e.clientX - dragStartX,
      y: patchY0 + e.clientY - dragStartY,
    })
    return
  }
  if (wireFrom) {
    const from = project.project.patches.find(p => p.id === wireFrom!.patchId)
    if (!from) return
    const a = portPos(from, wireFrom.portId, 'out')
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tempPath.value = bezier(a.x, a.y, e.clientX - rect.left, e.clientY - rect.top)
  }
}

function onUp(e: PointerEvent): void {
  if (wireFrom) {
    const target = findPort(e)
    if (target?.dir === 'in' && target.patchId !== wireFrom.patchId) {
      patch.addConnection(wireFrom.patchId, wireFrom.portId, target.patchId, target.portId)
    }
    wireFrom = null
    tempPath.value = null
  }
  dragPatchId = null
}

function onDeleteConnection(id: string): void {
  patch.removeConnection(id)
}
</script>

<style scoped>
.patch-canvas {
  position: relative;
  width: 100%;
  height: 250px;
  min-height: 200px;
  background: #12122a;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.connection-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.connection {
  fill: none;
  stroke: rgba(136, 136, 255, 0.4);
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
  transition: stroke 0.1s;
}
.connection:hover { stroke: #ff6060; stroke-width: 2.5; }

.temp-line {
  fill: none;
  stroke: rgba(136, 136, 255, 0.6);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.node-layer {
  position: absolute;
  inset: 0;
}

.patch-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.add-btn {
  padding: 3px 8px;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.add-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
</style>
