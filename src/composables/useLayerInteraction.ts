// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useLayerInteraction —— 图层选择与拖拽
//  职责: select 工具下点击选中、拖拽移动
//  状态感知: 默认状态改基础，非默认创建覆盖
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'

// ── 从指针事件中查找图层 ID (利用 DOM 事件委托) ──

function findLayerId(e: PointerEvent): string | null {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')
  return el?.dataset.layerId ?? null
}

// ── 从指针事件中查找画板状态 ID ──

function findStateId(e: PointerEvent): string | null {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-state-id]')
  return el?.dataset.stateId ?? null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useLayerInteraction(_viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const editor = useEditorStore()
  const project = useProjectStore()

  let dragId: string | null = null
  let startX = 0, startY = 0
  let layerX0 = 0, layerY0 = 0

  function down(e: PointerEvent): void {
    if (editor.tool !== 'select') return
    const id = findLayerId(e)
    if (!id) { canvas.clearSelection(); return }

    // 点击画板内图层 → 自动切换到该画板的状态
    const clickedStateId = findStateId(e)
    const group = project.project.stateGroups[0]
    if (clickedStateId && group && group.activeDisplayStateId !== clickedStateId) {
      group.activeDisplayStateId = clickedStateId
    }

    // 多选: Shift/Cmd 切换，否则单选
    if (e.shiftKey || e.metaKey) canvas.toggleSelection(id)
    else canvas.select([id])

    // 使用当前活动状态的解析属性作为拖拽起点
    const stateId = group?.activeDisplayStateId
    const resolved = stateId ? project.states.getResolvedProps(stateId, id) : null
    if (!resolved) return
    project.snapshot()
    dragId = id
    startX = e.clientX; startY = e.clientY
    layerX0 = resolved.x; layerY0 = resolved.y
  }

  function move(e: PointerEvent): void {
    if (!dragId) return
    const z = canvas.zoom
    const nx = layerX0 + (e.clientX - startX) / z
    const ny = layerY0 + (e.clientY - startY) / z

    // 状态感知: 默认状态 → 改基础; 非默认 → 创建覆盖
    const group = project.project.stateGroups[0]
    const isDefault = group?.displayStates[0]?.id === group?.activeDisplayStateId
    if (isDefault) {
      project.updateLayerProps(dragId, { x: nx, y: ny })
    } else if (group?.activeDisplayStateId) {
      project.setOverride(group.activeDisplayStateId, dragId, { x: nx, y: ny })
    }
  }

  function up(): void { dragId = null }

  return { down, move, up }
}
