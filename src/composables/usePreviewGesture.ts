// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  usePreviewGesture —— 预览模式手势桥梁
//  职责: GestureEngine → PatchRuntime 触发
//  click/drag 阈值判定，不再 pointerup 就 fire tap
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { GestureEngine } from '@engine/gesture/GestureEngine'
import { usePatchStore } from '@store/patch'

// ── DOM 辅助: 从事件目标找图层 ID ──

function layerIdFrom(e: PointerEvent): string | null {
  return (e.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')?.dataset.layerId ?? null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function usePreviewGesture() {
  const patchStore = usePatchStore()
  let activeId: string | null = null

  const gesture = new GestureEngine(
    { moveDistanceThreshold: 5, clickTimeThreshold: 300 },
  )

  function down(e: PointerEvent): void {
    activeId = layerIdFrom(e)
    if (!activeId) return
    gesture.pointerDown(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'down')
  }

  function move(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerMove(e.clientX, e.clientY)
  }

  function up(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerUp(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'up')
    // 只在 GestureEngine 判定为 click 时才触发 tap
    if (gesture.info.isClick) patchStore.fireTrigger(activeId, 'tap')
    if (gesture.info.hasMove) patchStore.fireTrigger(activeId, 'end')
    activeId = null
  }

  function destroy(): void { gesture.destroy() }

  return { down, move, up, destroy }
}
