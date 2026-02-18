// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useLayerInteraction —— 图层选择/拖拽/框选
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref } from 'vue'
import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import { useActiveGroup } from './useActiveGroup'
import { useSnapGuides } from './useSnapGuides'

type Rect = { left: number; top: number; right: number; bottom: number }
type MarqueeModel = { visible: boolean; x: number; y: number; width: number; height: number }
type MarqueeSession = {
  active: boolean
  stateId: string
  additive: boolean
  startClientX: number
  startClientY: number
  viewportRect: DOMRect | null
  baseSelection: string[]
}

export function findLayerIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-layer-id]')
  return el?.dataset.layerId ?? null
}

function findStateIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-state-id]')
  return el?.dataset.stateId ?? null
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function findGroupIdByState(
  stateId: string,
  groups: Array<{ id: string; displayStates: Array<{ id: string }> }>,
): string | null {
  for (const group of groups) {
    if (group.displayStates.some(state => state.id === stateId)) return group.id
  }
  return null
}

export function useLayerInteraction(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const snapG = useSnapGuides()
  const editor = useEditorStore()
  const project = useProjectStore()
  const { activeGroup, isDefaultState } = useActiveGroup()
  const marquee = ref<MarqueeModel>({ visible: false, x: 0, y: 0, width: 0, height: 0 })

  let dragIds: string[] = []
  let dragStartX = 0
  let dragStartY = 0
  let didDrag = false
  let pendingSingle: string | null = null
  const layerStarts = new Map<string, { x: number; y: number }>()
  const marqueeSession: MarqueeSession = {
    active: false, stateId: '', additive: false, startClientX: 0, startClientY: 0,
    viewportRect: null, baseSelection: [],
  }

  function writeXY(layerId: string, x: number, y: number): void {
    const group = activeGroup.value
    if (!group) return
    if (isDefaultState.value) project.updateLayerProps(layerId, { x, y })
    else if (group.activeDisplayStateId) project.setOverride(group.activeDisplayStateId, layerId, { x, y })
  }

  function clearDragSession(): void {
    dragIds = []
    layerStarts.clear()
    pendingSingle = null
    snapG.clear()
  }

  function resetMarquee(): void {
    marqueeSession.active = false
    marqueeSession.stateId = ''
    marqueeSession.viewportRect = null
    marqueeSession.baseSelection = []
    marquee.value = { visible: false, x: 0, y: 0, width: 0, height: 0 }
  }

  function syncGroupByPointer(e: PointerEvent): string | null {
    const clickedStateId = findStateIdFromTarget(e.target)
    if (!clickedStateId) return null
    const targetGroupId = findGroupIdByState(clickedStateId, project.project.stateGroups)
    if (targetGroupId && targetGroupId !== canvas.activeGroupId) canvas.setActiveGroup(targetGroupId)
    const group = activeGroup.value
    if (group && group.activeDisplayStateId !== clickedStateId) group.activeDisplayStateId = clickedStateId
    return clickedStateId
  }

  function startMarquee(e: PointerEvent, stateId: string): void {
    const vp = viewportRef.value
    if (!vp) return
    const vpRect = vp.getBoundingClientRect()
    marqueeSession.active = true
    marqueeSession.stateId = stateId
    marqueeSession.additive = e.shiftKey || e.metaKey
    marqueeSession.startClientX = clamp(e.clientX, vpRect.left, vpRect.right)
    marqueeSession.startClientY = clamp(e.clientY, vpRect.top, vpRect.bottom)
    marqueeSession.viewportRect = vpRect
    marqueeSession.baseSelection = [...canvas.selectedLayerIds]
    marquee.value = {
      visible: true,
      x: marqueeSession.startClientX - vpRect.left,
      y: marqueeSession.startClientY - vpRect.top,
      width: 0,
      height: 0,
    }
  }

  function marqueeRectClient(e: PointerEvent): Rect | null {
    const vpRect = marqueeSession.viewportRect
    if (!vpRect) return null
    const ex = clamp(e.clientX, vpRect.left, vpRect.right)
    const ey = clamp(e.clientY, vpRect.top, vpRect.bottom)
    const left = Math.min(marqueeSession.startClientX, ex)
    const top = Math.min(marqueeSession.startClientY, ey)
    const right = Math.max(marqueeSession.startClientX, ex)
    const bottom = Math.max(marqueeSession.startClientY, ey)
    marquee.value = {
      visible: true,
      x: left - vpRect.left,
      y: top - vpRect.top,
      width: right - left,
      height: bottom - top,
    }
    return { left, top, right, bottom }
  }

  function collectMarqueeHits(rect: Rect): string[] {
    const stateEl = document.querySelector<HTMLElement>(`[data-state-id="${marqueeSession.stateId}"]`)
    if (!stateEl) return []
    const map = new Map<string, Rect>()
    for (const el of stateEl.querySelectorAll<HTMLElement>('[data-layer-id]')) {
      const id = el.dataset.layerId
      if (!id || map.has(id)) continue
      const r = el.getBoundingClientRect()
      map.set(id, { left: r.left, top: r.top, right: r.right, bottom: r.bottom })
    }
    return Array.from(map.entries())
      .filter(([, box]) => intersects(rect, box))
      .map(([id]) => id)
  }

  function updateMarqueeSelection(e: PointerEvent): void {
    const rect = marqueeRectClient(e)
    if (!rect) return
    const hits = collectMarqueeHits(rect)
    const merged = marqueeSession.additive
      ? Array.from(new Set([...marqueeSession.baseSelection, ...hits]))
      : hits
    canvas.select(merged)
  }

  function prepareDrag(e: PointerEvent): void {
    const stateId = activeGroup.value?.activeDisplayStateId
    if (!stateId) return
    project.snapshot()
    dragIds = [...canvas.selectedLayerIds]
    dragStartX = e.clientX
    dragStartY = e.clientY
    layerStarts.clear()
    for (const layerId of dragIds) {
      const resolved = project.states.getResolvedProps(stateId, layerId)
      if (resolved) layerStarts.set(layerId, { x: resolved.x, y: resolved.y })
    }
    const skipSet = new Set(dragIds)
    snapG.setTargets(project.project.layers, skipSet, project.project.canvasSize.width, project.project.canvasSize.height)
  }

  function down(e: PointerEvent): void {
    if (editor.tool !== 'select' || e.button !== 0) return
    didDrag = false
    resetMarquee()
    pendingSingle = null
    syncGroupByPointer(e)
    const id = findLayerIdFromTarget(e.target)
    if (!id) {
      const stateId = activeGroup.value?.activeDisplayStateId
      if (!stateId) { canvas.clearSelection(); return }
      startMarquee(e, stateId)
      return
    }
    if (e.shiftKey || e.metaKey) canvas.toggleSelection(id)
    else if (canvas.selectedLayerIds.includes(id)) pendingSingle = id
    else canvas.select([id])
    prepareDrag(e)
  }

  function move(e: PointerEvent): void {
    if (marqueeSession.active) {
      didDrag = true
      updateMarqueeSelection(e)
      return
    }
    if (dragIds.length === 0) return
    didDrag = true
    pendingSingle = null
    const dx = (e.clientX - dragStartX) / canvas.zoom
    const dy = (e.clientY - dragStartY) / canvas.zoom
    const ref0 = layerStarts.get(dragIds[0])
    const layer0 = ref0 ? project.project.layers[dragIds[0]] : null
    const sd = ref0 && layer0
      ? snapG.snap(ref0.x + dx, ref0.y + dy, layer0.props.width, layer0.props.height)
      : { dx: 0, dy: 0 }
    for (const layerId of dragIds) {
      const start = layerStarts.get(layerId)
      if (start) writeXY(layerId, Math.round(start.x + dx + sd.dx), Math.round(start.y + dy + sd.dy))
    }
  }

  function up(): void {
    if (marqueeSession.active) {
      const box = marquee.value
      if (!didDrag || (box.width < 2 && box.height < 2)) {
        if (!marqueeSession.additive) canvas.clearSelection()
      }
      resetMarquee()
      clearDragSession()
      return
    }
    if (pendingSingle && !didDrag) canvas.select([pendingSingle])
    clearDragSession()
  }

  return { down, move, up, marquee, guides: snapG.guides }
}
