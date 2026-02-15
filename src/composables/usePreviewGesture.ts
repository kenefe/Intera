// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  usePreviewGesture —— 预览模式手势桥梁
//  职责: GestureEngine → PatchRuntime 触发
//         + DragEngine 集成 (behaviorDrag 跟手)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { GestureEngine } from '@engine/gesture/GestureEngine'
import type { DragEngine } from '@engine/gesture/DragEngine'
import type { BehaviorInstance } from '@engine/state/BehaviorManager'
import { usePatchStore } from '@store/patch'
import { useProjectStore } from '@store/project'

// ── DOM 辅助: 从事件目标找图层 ID ──

function layerIdFrom(e: PointerEvent): string | null {
  return (e.target as HTMLElement)
    .closest<HTMLElement>('[data-layer-id]')
    ?.dataset.layerId ?? null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function usePreviewGesture() {
  const patchStore = usePatchStore()
  const projectStore = useProjectStore()
  let activeId: string | null = null
  let activeDrag: DragEngine | null = null
  let dragLayerId: string | null = null
  let previewScale = 1

  const gesture = new GestureEngine(
    { moveDistanceThreshold: 5, clickTimeThreshold: 300 },
  )

  /** PreviewPanel 缩放变化时调用 */
  function setScale(s: number): void { previewScale = s }

  /** 屏幕坐标 → 缩放补偿坐标 (让 DragEngine 的 delta 匹配图层空间) */
  function scaled(v: number): number {
    return v / (previewScale || 1)
  }

  function down(e: PointerEvent): void {
    activeId = layerIdFrom(e)
    if (!activeId) return
    gesture.pointerDown(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'down')

    // ── 检查是否有 behaviorDrag 绑定到此图层 ──
    const inst: BehaviorInstance | undefined =
      patchStore.runtime.behaviors.findByLayer(activeId)
    if (inst?.engine) {
      activeDrag = inst.engine
      dragLayerId = activeId
      const props = projectStore.project.layers[activeId]?.props
      const startX = props?.x ?? 0
      const startY = props?.y ?? 0
      activeDrag.begin(startX, startY, scaled(e.clientX), scaled(e.clientY))
    }
  }

  function move(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerMove(e.clientX, e.clientY)

    // ── 拖拽跟手: 喂给 DragEngine (缩放补偿) ──
    if (activeDrag && dragLayerId) {
      activeDrag.tick(scaled(e.clientX), scaled(e.clientY))
      projectStore.liveValues[dragLayerId] = {
        x: activeDrag.x,
        y: activeDrag.y,
      }
    }
  }

  function up(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerUp(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'up')

    if (gesture.info.isClick) patchStore.fireTrigger(activeId, 'tap')
    if (gesture.info.hasMove) patchStore.fireTrigger(activeId, 'end')

    // ── 拖拽结束 ──
    if (activeDrag && dragLayerId) {
      const spd = gesture.info.speed
      activeDrag.end(scaled(spd.x), scaled(spd.y))
      projectStore.liveValues[dragLayerId] = {
        x: activeDrag.x,
        y: activeDrag.y,
      }
      activeDrag = null
      dragLayerId = null
    }

    activeId = null
  }

  function destroy(): void { gesture.destroy() }

  return { down, move, up, destroy, setScale }
}
