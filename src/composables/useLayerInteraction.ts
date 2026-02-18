// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useLayerInteraction —— 图层选择/拖拽
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import { useActiveGroup } from './useActiveGroup'
import { useSnapGuides } from './useSnapGuides'
import { useMarquee } from './useMarquee'

export function findLayerIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-layer-id]')
  return el?.dataset.layerId ?? null
}

function findStateIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-state-id]')
  return el?.dataset.stateId ?? null
}

function findGroupIdByState(
  stateId: string,
  groups: Array<{ id: string; displayStates: Array<{ id: string }> }>,
): string | null {
  for (const g of groups) {
    if (g.displayStates.some(s => s.id === stateId)) return g.id
  }
  return null
}

export function useLayerInteraction(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const snapG = useSnapGuides()
  const editor = useEditorStore()
  const project = useProjectStore()
  const { activeGroup, isDefaultState } = useActiveGroup()
  const mq = useMarquee(viewportRef)

  let dragIds: string[] = []
  let dragStartX = 0, dragStartY = 0
  let didDrag = false
  let pendingSingle: string | null = null
  const layerStarts = new Map<string, { x: number; y: number }>()

  function writeXY(layerId: string, x: number, y: number): void {
    const group = activeGroup.value
    if (!group) return
    if (isDefaultState.value) project.updateLayerProps(layerId, { x, y })
    else if (group.activeDisplayStateId) project.setOverride(group.activeDisplayStateId, layerId, { x, y })
  }

  function clearDrag(): void {
    dragIds = []; layerStarts.clear(); pendingSingle = null; snapG.clear()
  }

  function syncGroupByPointer(e: PointerEvent): string | null {
    const sid = findStateIdFromTarget(e.target)
    if (!sid) return null
    const gid = findGroupIdByState(sid, project.project.stateGroups)
    if (gid && gid !== canvas.activeGroupId) canvas.setActiveGroup(gid)
    const group = activeGroup.value
    if (group && group.activeDisplayStateId !== sid) group.activeDisplayStateId = sid
    return sid
  }

  function prepareDrag(e: PointerEvent): void {
    const stateId = activeGroup.value?.activeDisplayStateId
    if (!stateId) return
    project.snapshot()
    dragIds = [...canvas.selectedLayerIds]
    dragStartX = e.clientX; dragStartY = e.clientY
    layerStarts.clear()
    for (const id of dragIds) {
      const r = project.states.getResolvedProps(stateId, id)
      if (r) layerStarts.set(id, { x: r.x, y: r.y })
    }
    snapG.setTargets(project.project.layers, new Set(dragIds), project.project.canvasSize.width, project.project.canvasSize.height)
  }

  function down(e: PointerEvent): void {
    if (editor.tool !== 'select' || e.button !== 0) return
    didDrag = false; mq.reset(); pendingSingle = null
    syncGroupByPointer(e)
    const id = findLayerIdFromTarget(e.target)
    if (!id) {
      const sid = activeGroup.value?.activeDisplayStateId
      if (!sid) { canvas.clearSelection(); return }
      mq.start(e, sid); return
    }
    if (e.shiftKey || e.metaKey) canvas.toggleSelection(id)
    else if (canvas.selectedLayerIds.includes(id)) pendingSingle = id
    else canvas.select([id])
    prepareDrag(e)
  }

  function move(e: PointerEvent): void {
    if (mq.active()) { didDrag = true; mq.update(e); return }
    if (dragIds.length === 0) return
    didDrag = true; pendingSingle = null
    const dx = (e.clientX - dragStartX) / canvas.zoom
    const dy = (e.clientY - dragStartY) / canvas.zoom
    const ref0 = layerStarts.get(dragIds[0])
    const layer0 = ref0 ? project.project.layers[dragIds[0]] : null
    const sd = ref0 && layer0
      ? snapG.snap(ref0.x + dx, ref0.y + dy, layer0.props.width, layer0.props.height)
      : { dx: 0, dy: 0 }
    for (const id of dragIds) {
      const s = layerStarts.get(id)
      if (s) writeXY(id, Math.round(s.x + dx + sd.dx), Math.round(s.y + dy + sd.dy))
    }
  }

  function up(): void {
    if (mq.active()) { mq.finish(didDrag); clearDrag(); return }
    if (pendingSingle && !didDrag) canvas.select([pendingSingle])
    clearDrag()
  }

  return { down, move, up, marquee: mq.marquee, guides: snapG.guides }
}
