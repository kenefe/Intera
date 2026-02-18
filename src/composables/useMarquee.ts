import { ref } from 'vue'
import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'

type Rect = { left: number; top: number; right: number; bottom: number }
export type MarqueeModel = { visible: boolean; x: number; y: number; width: number; height: number }

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function useMarquee(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const marquee = ref<MarqueeModel>({ visible: false, x: 0, y: 0, width: 0, height: 0 })

  let active = false
  let stateId = ''
  let additive = false
  let startClientX = 0
  let startClientY = 0
  let viewportRect: DOMRect | null = null
  let baseSelection: string[] = []

  function reset(): void {
    active = false; stateId = ''; viewportRect = null; baseSelection = []
    marquee.value = { visible: false, x: 0, y: 0, width: 0, height: 0 }
  }

  function start(e: PointerEvent, sid: string): void {
    const vp = viewportRef.value
    if (!vp) return
    const vpRect = vp.getBoundingClientRect()
    active = true; stateId = sid
    additive = e.shiftKey || e.metaKey
    startClientX = clamp(e.clientX, vpRect.left, vpRect.right)
    startClientY = clamp(e.clientY, vpRect.top, vpRect.bottom)
    viewportRect = vpRect
    baseSelection = [...canvas.selectedLayerIds]
    marquee.value = { visible: true, x: startClientX - vpRect.left, y: startClientY - vpRect.top, width: 0, height: 0 }
  }

  function update(e: PointerEvent): void {
    if (!viewportRect) return
    const ex = clamp(e.clientX, viewportRect.left, viewportRect.right)
    const ey = clamp(e.clientY, viewportRect.top, viewportRect.bottom)
    const left = Math.min(startClientX, ex), top = Math.min(startClientY, ey)
    const right = Math.max(startClientX, ex), bottom = Math.max(startClientY, ey)
    marquee.value = { visible: true, x: left - viewportRect.left, y: top - viewportRect.top, width: right - left, height: bottom - top }
    const rect: Rect = { left, top, right, bottom }
    const hits = collectHits(rect)
    const merged = additive ? Array.from(new Set([...baseSelection, ...hits])) : hits
    canvas.select(merged)
  }

  function collectHits(rect: Rect): string[] {
    const stateEl = document.querySelector<HTMLElement>(`[data-state-id="${stateId}"]`)
    if (!stateEl) return []
    const map = new Map<string, Rect>()
    for (const el of stateEl.querySelectorAll<HTMLElement>('[data-layer-id]')) {
      const id = el.dataset.layerId
      if (!id || map.has(id)) continue
      const r = el.getBoundingClientRect()
      map.set(id, { left: r.left, top: r.top, right: r.right, bottom: r.bottom })
    }
    return Array.from(map.entries()).filter(([, box]) => intersects(rect, box)).map(([id]) => id)
  }

  function finish(didDrag: boolean): void {
    const box = marquee.value
    if (!didDrag || (box.width < 2 && box.height < 2)) {
      if (!additive) canvas.clearSelection()
    }
    reset()
  }

  return { marquee, active: () => active, start, update, finish, reset }
}
