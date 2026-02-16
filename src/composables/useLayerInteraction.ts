// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useLayerInteraction —— 图层选择与拖拽
//  职责: select 工具下的点击选中、多选、拖拽移动
//  核心: 多选时拖拽同时移动所有选中图层
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import { useActiveGroup } from './useActiveGroup'

// ── DOM 查找 ──

function findLayerId(e: PointerEvent): string | null {
  // 优先用 DOM 命中 (最上层 z-index)
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')
  return el?.dataset.layerId ?? null
}

/**
 * 几何命中测试: 从最上层往下找包含坐标的图层
 * 用于 Alt+Click 穿透选择下层图层
 */
function geoHitTest(
  x: number, y: number,
  layers: Record<string, { props: { x: number; y: number; width: number; height: number }; parentId?: string | null }>,
  order: string[],
  skipIds: Set<string>,
): string | null {
  // 从后往前 (后绘制 = 上层)
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    if (skipIds.has(id)) continue
    const p = layers[id]?.props
    if (!p) continue
    if (x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height) return id
  }
  return null
}

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
  const { activeGroup, isDefaultState } = useActiveGroup()

  // ── 拖拽状态 ──

  let dragIds: string[] = []
  let startX = 0, startY = 0
  let layerStarts = new Map<string, { x: number; y: number }>()
  let didDrag = false
  let pendingSingle: string | null = null

  // ── 状态感知写入 ──

  function writeXY(lid: string, x: number, y: number): void {
    const group = activeGroup.value
    if (!group) return
    if (isDefaultState.value) {
      project.updateLayerProps(lid, { x, y })
    } else if (group.activeDisplayStateId) {
      project.setOverride(group.activeDisplayStateId, lid, { x, y })
    }
  }

  function down(e: PointerEvent): void {
    if (editor.tool !== 'select') return
    didDrag = false
    pendingSingle = null

    // 点击画板 → 切换到该画板的状态
    const clickedStateId = findStateId(e)
    const group = activeGroup.value
    if (clickedStateId && group && group.activeDisplayStateId !== clickedStateId) {
      group.activeDisplayStateId = clickedStateId
    }

    let id = findLayerId(e)

    /** 几何命中: 屏幕坐标 → 画板坐标 → geoHitTest */
    const geoHit = (skip: Set<string>): string | null => {
      const frame = (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')
      if (!frame) return null
      const r = frame.getBoundingClientRect()
      const z = canvas.zoom
      return geoHitTest(
        (e.clientX - r.left) / z, (e.clientY - r.top) / z,
        project.project.layers, project.project.rootLayerIds, skip,
      )
    }

    // Alt+Click → 穿透选择: 跳过当前选中图层，命中下层
    if (e.altKey && id && canvas.selectedLayerIds.includes(id)) {
      id = geoHit(new Set(canvas.selectedLayerIds)) ?? id
    }

    // DOM 未命中 → 几何回退 (选中 Frame 空白区等)
    if (!id) id = geoHit(new Set())

    if (!id) { canvas.clearSelection(); return }

    // ── 选区逻辑 ──
    if (e.shiftKey || e.metaKey) {
      canvas.toggleSelection(id)
    } else if (canvas.selectedLayerIds.includes(id)) {
      // 已选中 → 延迟单选到 up (允许拖拽多选)
      pendingSingle = id
    } else {
      canvas.select([id])
    }

    // ── 准备拖拽所有选中图层 ──
    const stateId = group?.activeDisplayStateId
    if (!stateId) return

    project.snapshot()
    dragIds = [...canvas.selectedLayerIds]
    startX = e.clientX
    startY = e.clientY

    layerStarts.clear()
    for (const lid of dragIds) {
      const resolved = project.states.getResolvedProps(stateId, lid)
      if (resolved) layerStarts.set(lid, { x: resolved.x, y: resolved.y })
    }
  }

  function move(e: PointerEvent): void {
    if (dragIds.length === 0) return
    didDrag = true
    pendingSingle = null

    const z = canvas.zoom
    const dx = (e.clientX - startX) / z
    const dy = (e.clientY - startY) / z

    for (const lid of dragIds) {
      const start = layerStarts.get(lid)
      if (start) writeXY(lid, Math.round(start.x + dx), Math.round(start.y + dy))
    }
  }

  function up(): void {
    // 无拖拽 + 已选中 → 单选 (取消其他)
    if (pendingSingle && !didDrag) {
      canvas.select([pendingSingle])
    }
    dragIds = []
    layerStarts.clear()
    pendingSingle = null
  }

  return { down, move, up }
}
