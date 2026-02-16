// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  usePatchInteraction —— Patch 画布交互状态机
//  5 种模式: idle | wire | drag | boxSelect | cutLine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, reactive } from 'vue'
import type { PatchConnection, Patch } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'
import { bezierPath, lineCutsBezier } from '@/utils/patchGeometry'

type Mode = 'idle' | 'wire' | 'drag' | 'boxSelect' | 'cutLine'
type XY = { x: number; y: number }
type PortHit = { patchId: string; portId: string; dir: string }

/** 视图层注入的 DOM 查询 */
export interface PatchViewDeps {
  canvasXY: (e: PointerEvent) => XY
  findPort: (e: PointerEvent) => PortHit | null
  findNode: (e: PointerEvent) => string | null
  portPos: (node: Patch, portId: string, dir: 'in' | 'out') => XY
  nodeRect: (id: string) => { x: number; y: number; w: number; h: number }
  isToolbar: (e: PointerEvent) => boolean
}

export function usePatchInteraction(deps: PatchViewDeps) {
  const project = useProjectStore()
  const patch = usePatchStore()
  let mode: Mode = 'idle'

  // ── 选中态 ──
  const selected = reactive(new Set<string>())
  const selectedConnIds = reactive(new Set<string>())

  function selectNode(id: string, multi: boolean): void {
    if (multi) { selected.has(id) ? selected.delete(id) : selected.add(id) }
    else { selected.clear(); selected.add(id) }
    selectedConnIds.clear()
  }
  function clearSelection(): void { selected.clear(); selectedConnIds.clear() }
  function deleteSelected(): void {
    if (selected.size === 0 && selectedConnIds.size === 0) return
    for (const connId of selectedConnIds) patch.removeConnection(connId)
    for (const id of selected) patch.removePatch(id)
    clearSelection()
  }
  function onDeleteNode(id: string): void { patch.removePatch(id); selected.delete(id) }

  // ── 键盘 ──
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected() }
    if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); project.project.patches.forEach(p => selected.add(p.id))
    }
    if (e.key === 'Escape') { clearSelection(); resetMode() }
  }

  // ── 连线路径 (模板绑定用) ──
  function connectionPath(conn: PatchConnection): string {
    const from = project.project.patches.find(p => p.id === conn.fromPatchId)
    const to   = project.project.patches.find(p => p.id === conn.toPatchId)
    if (!from || !to) return ''
    const a = deps.portPos(from, conn.fromPortId, 'out')
    const b = deps.portPos(to, conn.toPortId, 'in')
    return bezierPath(a.x, a.y, b.x, b.y)
  }

  // ── 碰撞检测 ──
  function nodeInBox(p: Patch): boolean {
    const r = deps.nodeRect(p.id)
    return r.x + r.w > box.x && r.x < box.x + box.w
        && r.y + r.h > box.y && r.y < box.y + box.h
  }
  function cutsCurve(conn: PatchConnection): boolean {
    const from = project.project.patches.find(p => p.id === conn.fromPatchId)
    const to   = project.project.patches.find(p => p.id === conn.toPatchId)
    if (!from || !to) return false
    const a = deps.portPos(from, conn.fromPortId, 'out')
    const b = deps.portPos(to, conn.toPortId, 'in')
    return lineCutsBezier(cut.x1, cut.y1, cut.x2, cut.y2, a.x, a.y, b.x, b.y)
  }

  // ── 交互状态 ──
  let wireFrom: { patchId: string; portId: string } | null = null
  const tempPath = ref<string | null>(null)
  let dragStartX = 0, dragStartY = 0
  const dragOrigins = new Map<string, XY>()
  const box = reactive({ x: 0, y: 0, w: 0, h: 0, active: false })
  let boxOX = 0, boxOY = 0, boxAdd = false
  const cut = reactive({ x1: 0, y1: 0, x2: 0, y2: 0, active: false })
  const cutThreatened = reactive(new Set<string>())

  function resetMode(): void {
    mode = 'idle'; wireFrom = null; tempPath.value = null; dragOrigins.clear()
    box.active = false; cut.active = false; cutThreatened.clear()
  }

  // ── 核心交互 ──
  function onDown(e: PointerEvent): void {
    if (e.button === 2) {
      const p = deps.canvasXY(e); mode = 'cutLine'
      Object.assign(cut, { x1: p.x, y1: p.y, x2: p.x, y2: p.y, active: true })
      cutThreatened.clear(); return
    }
    const port = deps.findPort(e)
    if (port) {
      if (port.dir === 'out') {
        wireFrom = { patchId: port.patchId, portId: port.portId }; mode = 'wire'; return
      }
      const existing = project.project.connections.find(
        c => c.toPatchId === port.patchId && c.toPortId === port.portId,
      )
      if (existing) {
        wireFrom = { patchId: existing.fromPatchId, portId: existing.fromPortId }
        patch.removeConnection(existing.id); mode = 'wire'; return
      }
    }
    const id = deps.findNode(e)
    if (id) {
      if (!e.shiftKey && !selected.has(id)) selectNode(id, false)
      else if (e.shiftKey) selectNode(id, true)
      mode = 'drag'; dragStartX = e.clientX; dragStartY = e.clientY
      dragOrigins.clear()
      for (const sid of selected) {
        const n = project.project.patches.find(p => p.id === sid)
        if (n) dragOrigins.set(sid, { x: n.position.x, y: n.position.y })
      }
      return
    }
    if (!deps.isToolbar(e)) {
      const p = deps.canvasXY(e); boxOX = p.x; boxOY = p.y
      Object.assign(box, { x: p.x, y: p.y, w: 0, h: 0, active: true })
      boxAdd = e.shiftKey; if (!boxAdd) clearSelection()
      mode = 'boxSelect'
    }
  }

  function onMove(e: PointerEvent): void {
    if (mode === 'drag') {
      const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY
      for (const [id, o] of dragOrigins) patch.updatePatchPos(id, { x: o.x + dx, y: o.y + dy })
      return
    }
    if (mode === 'wire' && wireFrom) {
      const from = project.project.patches.find(p => p.id === wireFrom!.patchId)
      if (!from) return
      const a = deps.portPos(from, wireFrom.portId, 'out')
      const xy = deps.canvasXY(e)
      tempPath.value = bezierPath(a.x, a.y, xy.x, xy.y); return
    }
    if (mode === 'boxSelect') {
      const p = deps.canvasXY(e)
      box.x = Math.min(boxOX, p.x); box.y = Math.min(boxOY, p.y)
      box.w = Math.abs(p.x - boxOX); box.h = Math.abs(p.y - boxOY); return
    }
    if (mode === 'cutLine') {
      const p = deps.canvasXY(e); cut.x2 = p.x; cut.y2 = p.y
      cutThreatened.clear()
      for (const conn of project.project.connections) {
        if (cutsCurve(conn)) cutThreatened.add(conn.id)
      }
    }
  }

  function onUp(e: PointerEvent): void {
    if (mode === 'wire' && wireFrom) {
      const target = deps.findPort(e)
      if (target?.dir === 'in' && target.patchId !== wireFrom.patchId)
        patch.addConnection(wireFrom.patchId, wireFrom.portId, target.patchId, target.portId)
    }
    if (mode === 'boxSelect') {
      for (const p of project.project.patches) { if (nodeInBox(p)) selected.add(p.id) }
    }
    if (mode === 'cutLine') {
      for (const id of cutThreatened) patch.removeConnection(id)
    }
    resetMode()
  }

  function onClickConnection(conn: PatchConnection, e: MouseEvent): void {
    if (e.shiftKey) {
      selectedConnIds.has(conn.id) ? selectedConnIds.delete(conn.id) : selectedConnIds.add(conn.id)
    } else {
      selected.clear(); selectedConnIds.clear(); selectedConnIds.add(conn.id)
    }
  }

  return {
    selected, selectedConnIds, cutThreatened,
    box, cut, tempPath,
    connectionPath, onDown, onMove, onUp, onKey,
    onDeleteNode, onClickConnection,
  }
}
