// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  usePreviewGesture —— 预览模式手势桥梁
//  职责: GestureEngine → PatchRuntime 触发
//         + DragEngine 集成 (behaviorDrag 跟手)
//  插值由 Transition 节点 + Runtime.onDrive 处理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { GestureEngine } from '@engine/gesture/GestureEngine'
import type { DragEngine } from '@engine/gesture/DragEngine'
import type { BehaviorInstance } from '@engine/state/BehaviorManager'
import { usePatchStore } from '@store/patch'
import { useProjectStore } from '@store/project'

// ── 值端口集合 (BehaviorDrag 输出的连续量) ──

const VALUE_PORTS = new Set(['x', 'y', 'offsetX', 'offsetY'])

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function usePreviewGesture() {
  const patchStore = usePatchStore()
  const projectStore = useProjectStore()

  // ── 交互层穿透: 点击穿过非交互图层到达最近的交互绑定 ──
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
      let cur: string | null = lid
      while (cur) {
        if (bound.has(cur)) return cur
        cur = layers[cur]?.parentId ?? null
      }
    }
    return fallback
  }

  // ── 拖拽状态 ──

  let activeId: string | null = null
  let activeDrag: DragEngine | null = null
  let dragLayerId: string | null = null
  let previewScale = 1
  let driven = false

  const gesture = new GestureEngine(
    { moveDistanceThreshold: 5, clickTimeThreshold: 300 },
    { onLongClick: () => { if (activeId) patchStore.fireTrigger(activeId, 'longPress') } },
  )

  /** PreviewPanel 缩放变化时调用 */
  function setScale(s: number): void { previewScale = s }

  /** 屏幕坐标 → 缩放补偿坐标 */
  function scaled(v: number): number { return v / (previewScale || 1) }

  /** 获取图层当前视觉位置 (liveValues > 状态 > 基础属性) */
  function visualPos(layerId: string): { x: number; y: number } {
    const live = projectStore.previewLiveValues[layerId]
    if (live?.x !== undefined || live?.y !== undefined)
      return { x: live.x ?? 0, y: live.y ?? 0 }
    for (const g of projectStore.project.stateGroups) {
      const sid = patchStore.getPreviewStateId(g.id)
      if (!sid) continue
      const resolved = projectStore.states.getResolvedProps(sid, layerId)
      if (resolved) return { x: resolved.x ?? 0, y: resolved.y ?? 0 }
    }
    const p = projectStore.project.layers[layerId]?.props
    return { x: p?.x ?? 0, y: p?.y ?? 0 }
  }

  /** 该 Behavior 节点是否有值端口连到 Transition (down 时查一次) */
  function hasDriveTarget(patchId: string): boolean {
    const { connections, patches } = projectStore.project
    return connections.some(c =>
      c.fromPatchId === patchId && VALUE_PORTS.has(c.fromPortId)
      && patches.some(p => p.id === c.toPatchId && p.config.type === 'transition'),
    )
  }

  // ── 手势回调 ──

  function down(e: PointerEvent): void {
    activeId = interactiveLayerAt(e)
    if (!activeId) return
    gesture.pointerDown(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'down')

    const inst: BehaviorInstance | undefined =
      patchStore.runtime.behaviors.ensureByLayer(activeId)
    if (inst?.engine) {
      activeDrag = inst.engine
      dragLayerId = activeId
      driven = hasDriveTarget(inst.patchId)
      const { x, y } = visualPos(activeId)
      activeDrag.begin(x, y, scaled(e.clientX), scaled(e.clientY))
    }
  }

  function move(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerMove(e.clientX, e.clientY)
    if (!activeDrag || !dragLayerId) return

    // tick → onMove → setValue → Transition.onDrive → liveValues
    activeDrag.tick(scaled(e.clientX), scaled(e.clientY))

    // 无 Transition 连线 → 回退为基本 x/y 跟手
    if (!driven)
      projectStore.previewLiveValues[dragLayerId] = { x: activeDrag.x, y: activeDrag.y }
  }

  function up(e: PointerEvent): void {
    if (!activeId) return
    gesture.pointerUp(e.clientX, e.clientY)
    patchStore.fireTrigger(activeId, 'up')
    if (gesture.info.isClick) patchStore.fireTrigger(activeId, 'tap')
    if (gesture.info.hasMove) patchStore.fireTrigger(activeId, 'end')
    endDrag()
    activeId = null
  }

  /** 拖拽收尾: 发速度给引擎 + 清空引用 */
  function endDrag(): void {
    if (!activeDrag) return
    if (gesture.info.hasMove) {
      const { x, y } = gesture.info.speed
      activeDrag.end(scaled(x), scaled(y))
    }
    activeDrag = null; dragLayerId = null; driven = false
  }

  function destroy(): void { gesture.destroy() }

  return { down, move, up, destroy, setScale }
}
