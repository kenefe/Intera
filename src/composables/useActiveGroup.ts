// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useActiveGroup —— 当前激活状态组
//  职责: 统一 group/stateId/isDefault 解析
//  消除 stateGroups[0] 硬编码
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

export function useActiveGroup() {
  const canvas = useCanvasStore()
  const project = useProjectStore()

  // ── 当前激活的状态组 (跟随画布选择) ──

  const activeGroup = computed(() =>
    project.project.stateGroups.find(g => g.id === canvas.activeGroupId)
    ?? project.project.stateGroups[0],
  )

  // ── 当前激活的显示状态 ID ──

  const activeStateId = computed(() =>
    activeGroup.value?.activeDisplayStateId ?? null,
  )

  // ── 是否处于默认状态 (第一个状态即为默认) ──

  const isDefaultState = computed(() => {
    const g = activeGroup.value
    return g ? g.displayStates[0]?.id === activeStateId.value : true
  })

  return { activeGroup, activeStateId, isDefaultState }
}
