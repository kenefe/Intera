// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useLayerDrag —— 图层拖拽排序逻辑
//  职责: 管理拖拽状态、计算放置位置、执行移动
//  核心: 三区判定 (before / inside / after)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { reactive } from 'vue'
import { useProjectStore } from '@store/project'

export type DropPos = 'before' | 'inside' | 'after'

export function useLayerDrag() {
  const project = useProjectStore()

  const state = reactive({
    dragId: null as string | null,
    overId: null as string | null,
    pos: 'after' as DropPos,
  })

  // ── 开始拖拽 ──

  function start(id: string, e: DragEvent): void {
    state.dragId = id
    e.dataTransfer!.effectAllowed = 'move'
  }

  // ── 悬停计算放置位置 ──
  //  上 25% → 前面; 下 25% → 后面; 中间 50% → 嵌入 (仅容器)

  function over(id: string, e: DragEvent): void {
    if (!state.dragId || id === state.dragId) return
    state.overId = id
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = (e.clientY - rect.top) / rect.height
    const canNest = ['frame', 'group'].includes(project.project.layers[id]?.type ?? '')
    state.pos = y < 0.25 ? 'before'
      : y > 0.75 ? 'after'
        : canNest ? 'inside'
          : y < 0.5 ? 'before' : 'after'
  }

  // ── 放置: 计算目标位置并移动 ──

  function drop(): void {
    const { dragId, overId, pos } = state
    if (!dragId || !overId || dragId === overId) { end(); return }
    const target = project.project.layers[overId]
    if (!target) { end(); return }

    if (pos === 'inside') {
      project.moveLayer(dragId, overId)
    } else {
      const pid = target.parentId
      const arr = pid
        ? project.project.layers[pid]?.childrenIds ?? []
        : project.project.rootLayerIds
      let idx = arr.indexOf(overId)
      if (pos === 'after') idx++
      // 同级拖拽: 摘除后索引修正
      if (project.project.layers[dragId]?.parentId === pid) {
        const di = arr.indexOf(dragId)
        if (di >= 0 && di < idx) idx--
      }
      project.moveLayer(dragId, pid, idx)
    }
    end()
  }

  function end(): void { state.dragId = null; state.overId = null }

  return { state, start, over, drop, end }
}
