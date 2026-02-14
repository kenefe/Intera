<template lang="pug">
.patch-canvas(
  ref="canvasRef"
  tabindex="0"
  @pointerdown="onDown"
  @pointermove="onMove"
  @pointerup="onUp"
  @keydown="onKey"
)
  //- ── SVG 连线层 ──
  svg.connection-layer
    path.connection(
      v-for="conn in project.project.connections"
      :key="conn.id"
      :d="connectionPath(conn)"
      :class="{ selected: selectedConnIds.has(conn.id) }"
      @click.stop="onClickConnection(conn, $event)"
    )
    path.temp-line(v-if="tempPath" :d="tempPath")

  //- ── 节点层 ──
  .node-layer
    PatchNode(
      v-for="p in project.project.patches" :key="p.id"
      :patch="p"
      :selected="selected.has(p.id)"
      @delete="onDeleteNode(p.id)"
    )

  //- ── 工具条 ──
  .patch-toolbar
    button.node-btn(v-for="t in ADD_TYPES" :key="t.type" :data-type="t.type" :title="t.name" @click="onAddNode(t.type, t.name)") {{ t.label }}
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchCanvas —— 交互图画布
//  职责: 节点增删 + 连线 + 选中 + 拖拽
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type { PatchType, PatchConnection } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'
import PatchNode from './PatchNode.vue'

const project = useProjectStore()
const patch = usePatchStore()
const canvasRef = ref<HTMLElement | null>(null)

// ── 自动聚焦 (确保键盘事件可达) ──
onMounted(() => canvasRef.value?.focus())

// ── 选中态 ──

const selected = reactive(new Set<string>())
const selectedConnIds = reactive(new Set<string>())

function selectNode(id: string, multi: boolean): void {
  if (multi) {
    selected.has(id) ? selected.delete(id) : selected.add(id)
  } else {
    selected.clear()
    selected.add(id)
  }
  selectedConnIds.clear()
}

function clearSelection(): void {
  selected.clear()
  selectedConnIds.clear()
}

// ── 删除 ──

function deleteSelected(): void {
  if (selected.size === 0 && selectedConnIds.size === 0) return
  for (const connId of selectedConnIds) patch.removeConnection(connId)
  for (const id of selected) patch.removePatch(id)
  clearSelection()
}

function onDeleteNode(id: string): void {
  patch.removePatch(id)
  selected.delete(id)
}

// ── 键盘 ──

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  }
  if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    project.project.patches.forEach(p => selected.add(p.id))
  }
  if (e.key === 'Escape') clearSelection()
}

// ── 节点添加 ──

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
  const p = patch.addPatchNode(type, { x, y }, {}, name)
  selectNode(p.id, false)
}

// ── 端口坐标 (从 DOM 实测) ──

const NODE_W = 180

function portPos(
  patchNode: typeof project.project.patches[number],
  portId: string, dir: 'in' | 'out',
): { x: number; y: number } {
  /* 优先从 DOM 读取精确位置 */
  const dot = canvasRef.value?.querySelector<HTMLElement>(
    `.port-dot[data-patch-id="${patchNode.id}"][data-port-id="${portId}"]`,
  )
  if (dot) {
    const cr = canvasRef.value!.getBoundingClientRect()
    const dr = dot.getBoundingClientRect()
    return { x: dr.left + dr.width / 2 - cr.left, y: dr.top + dr.height / 2 - cr.top }
  }
  /* 回退: 估算 */
  const ports = dir === 'in' ? patchNode.inputs : patchNode.outputs
  const idx = ports.findIndex(p => p.id === portId)
  const offset = dir === 'in' ? 0 : patchNode.inputs.length
  return {
    x: patchNode.position.x + (dir === 'out' ? NODE_W : 0),
    y: patchNode.position.y + 26 + (offset + idx) * 20 + 10,
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
  /* 保持画布焦点 (键盘快捷键依赖) */
  canvasRef.value?.focus()

  /* 端口拖线 (优先) */
  const port = findPort(e)
  if (port?.dir === 'out') {
    wireFrom = { patchId: port.patchId, portId: port.portId }
    return
  }

  /* 节点选中 + 拖拽 */
  const id = findNode(e)
  if (id) {
    selectNode(id, e.shiftKey)
    const p = project.project.patches.find(n => n.id === id)
    if (!p) return
    dragPatchId = id
    dragStartX = e.clientX; dragStartY = e.clientY
    patchX0 = p.position.x; patchY0 = p.position.y
    return
  }

  /* 空白区域 → 取消选中 */
  if (!(e.target as HTMLElement).closest('.patch-toolbar'))
    clearSelection()
}

function onMove(e: PointerEvent): void {
  if (dragPatchId) {
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    patch.updatePatchPos(dragPatchId, { x: patchX0 + dx, y: patchY0 + dy })
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

// ── 连线交互 ──

function onClickConnection(conn: PatchConnection, e: MouseEvent): void {
  if (e.shiftKey) {
    selectedConnIds.has(conn.id) ? selectedConnIds.delete(conn.id) : selectedConnIds.add(conn.id)
  } else {
    selected.clear()
    selectedConnIds.clear()
    selectedConnIds.add(conn.id)
  }
}
</script>

<style scoped>
.patch-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: #12122a;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  outline: none;
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
  transition: stroke 0.12s, stroke-width 0.12s;
}
.connection:hover { stroke: #ff6060; stroke-width: 2.5; }
.connection.selected { stroke: #6c6cff; stroke-width: 3; }

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
  left: 8px;
  display: flex;
  gap: 6px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.node-btn {
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.node-btn:hover { background: rgba(91, 91, 240, 0.2); color: #aaf; border-color: rgba(91, 91, 240, 0.4); }
</style>
