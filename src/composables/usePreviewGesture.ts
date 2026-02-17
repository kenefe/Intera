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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function usePreviewGesture() {
  const patchStore = usePatchStore()
  const projectStore = useProjectStore()

  // ── 交互层穿透: 点击穿过非交互图层到达最近的交互绑定 ──
  //    1. elementsFromPoint 取得点击处所有图层 (前→后)
  //    2. 每个图层沿父链冒泡找交互绑定
  //    3. 无命中则回退到最顶层 (供 auto-cycle 用)
  function interactiveLayerAt(e: PointerEvent): string | null {
    const { layers, patches } = projectStore.project
    const bound = new Set(
      patches
        .filter(p => 'layerId' in p.config)
        .map(p => (p.config as { layerId?: string }).layerId),
    )
    const elements = document.elementsFromPoint(e.clientX, e.clientY)
    let fallback: string | null = null

    for (const el of elements) {
      const lid = (el as HTMLElement).dataset?.layerId
      if (!lid) continue
      fallback ??= lid
      // 直接命中 / 沿父链冒泡
      let cur: string | null = lid
      while (cur) {
        if (bound.has(cur)) return cur
        cur = layers[cur]?.parentId ?? null
      }
    }
    return fallback
  }

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

  /** 获取图层当前视觉位置 (状态覆盖 > 基础属性) */
  function visualPos(layerId: string): { x: number; y: number } {
    // 1. liveValues (过渡中 / 上一次拖拽残留)
    const live = projectStore.liveValues[layerId]
    if (live?.x !== undefined || live?.y !== undefined)
      return { x: live.x ?? 0, y: live.y ?? 0 }

    // 2. 当前激活状态的解析属性
    for (const g of projectStore.project.stateGroups) {
      const resolved = projectStore.states.getResolvedProps(g.activeDisplayStateId, layerId)
      if (resolved) return { x: resolved.x ?? 0, y: resolved.y ?? 0 }
    }

    // 3. 基础属性
    const p = projectStore.project.layers[layerId]?.props
    return { x: p?.x ?? 0, y: p?.y ?? 0 }
  }

  function down(e: PointerEvent): void {
    activeId = interactiveLayerAt(e)
    if (!activeId) return
    gesture.pointerDown(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'down')

    // ── 检查是否有 behaviorDrag 绑定到此图层 ──
    const inst: BehaviorInstance | undefined =
      patchStore.runtime.behaviors.ensureByLayer(activeId)
    if (inst?.engine) {
      activeDrag = inst.engine
      dragLayerId = activeId
      const { x, y } = visualPos(activeId)
      activeDrag.begin(x, y, scaled(e.clientX), scaled(e.clientY))
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
    //    hasMove 守卫: 点击不触发 DragEngine 事件，避免与 Touch 冲突
    //    不写 liveValues: transitionToState 会从 move() 留下的值平滑衔接
    if (activeDrag && dragLayerId) {
      if (gesture.info.hasMove) {
        const spd = gesture.info.speed
        activeDrag.end(scaled(spd.x), scaled(spd.y))
      }
      activeDrag = null
      dragLayerId = null
    }

    activeId = null
  }

  function destroy(): void { gesture.destroy() }

  return { down, move, up, destroy, setScale }
}
