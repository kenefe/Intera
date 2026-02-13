// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useDrawTool —— 绘制工具 (矩形/椭圆/Frame)
//  职责: 拖拽绘制新图层，松手后自动切回 select
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Ref } from 'vue'
import type { LayerType } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'

const DRAW_TOOLS: Record<string, LayerType> = {
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  frame: 'frame',
}

const TYPE_LABEL: Record<string, string> = {
  rectangle: '矩形',
  ellipse: '椭圆',
  frame: '容器',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDrawTool(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const editor = useEditorStore()
  const project = useProjectStore()

  let drawId: string | null = null
  let originX = 0, originY = 0

  /** 屏幕坐标 → 画板本地坐标 */
  function toLocal(e: PointerEvent): { x: number; y: number } {
    const frame = (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')
    if (frame) {
      const r = frame.getBoundingClientRect()
      return { x: (e.clientX - r.left) / canvas.zoom, y: (e.clientY - r.top) / canvas.zoom }
    }
    // 未命中画板 → 用视口坐标兜底
    const r = viewportRef.value!.getBoundingClientRect()
    return {
      x: (e.clientX - r.left - canvas.panX) / canvas.zoom,
      y: (e.clientY - r.top - canvas.panY) / canvas.zoom,
    }
  }

  function down(e: PointerEvent): void {
    const layerType = DRAW_TOOLS[editor.tool]
    if (!layerType || drawId) return  // 防重入: 正在绘制时忽略第二次 down
    const pos = toLocal(e)
    originX = pos.x; originY = pos.y
    const n = Object.values(project.project.layers).filter(l => l.type === layerType).length + 1
    const layer = project.addLayer(layerType, null, undefined, `${TYPE_LABEL[layerType] ?? layerType} ${n}`)
    project.updateLayerProps(layer.id, { x: pos.x, y: pos.y, width: 1, height: 1 })
    drawId = layer.id
    canvas.select([layer.id])
  }

  function move(e: PointerEvent): void {
    if (!drawId) return
    const pos = toLocal(e)
    project.updateLayerProps(drawId, {
      x: Math.min(pos.x, originX),
      y: Math.min(pos.y, originY),
      width: Math.abs(pos.x - originX),
      height: Math.abs(pos.y - originY),
    })
  }

  function up(): void {
    if (drawId) editor.setTool('select')
    drawId = null
  }

  return { down, move, up }
}
