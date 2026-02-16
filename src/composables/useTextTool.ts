// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useTextTool —— 文本工具
//  职责: 点击创建文本图层，自动切回 select
//  特性: 在 Frame 内点击自动成为其子图层
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Ref } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useTextTool(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const editor = useEditorStore()
  const project = useProjectStore()

  /** 查找画板 frame: 仅匹配点击目标所在的画板 */
  function resolveFrame(e: PointerEvent): HTMLElement | null {
    return (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')
  }

  /** 屏幕坐标 → 画板本地坐标 */
  function toArtboard(e: PointerEvent): { x: number; y: number } {
    const frame = resolveFrame(e)
    if (!frame) return { x: 0, y: 0 } // 安全兜底，实际不会到达
    const r = frame.getBoundingClientRect()
    const bw = 2 * canvas.zoom // 边框 2px 经 zoom 缩放
    return {
      x: Math.round((e.clientX - r.left - bw) / canvas.zoom),
      y: Math.round((e.clientY - r.top - bw) / canvas.zoom),
    }
  }

  /** 查找包含该坐标的最上层 Frame */
  function findFrameAt(x: number, y: number): string | null {
    const { layers, rootLayerIds } = project.project
    for (let i = rootLayerIds.length - 1; i >= 0; i--) {
      const layer = layers[rootLayerIds[i]]
      if (layer?.type !== 'frame') continue
      const p = layer.props
      if (x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height) return layer.id
    }
    return null
  }

  function down(e: PointerEvent): void {
    if (editor.tool !== 'text') return
    if (!resolveFrame(e)) return // 画板外不创建文本
    const abs = toArtboard(e)

    // 检测是否在 Frame 内
    const parentId = findFrameAt(abs.x, abs.y)
    const fp = parentId ? project.project.layers[parentId]?.props : null
    const localX = fp ? abs.x - fp.x : abs.x
    const localY = fp ? abs.y - fp.y : abs.y

    const n = Object.values(project.project.layers).filter(l => l.type === 'text').length + 1
    const layer = project.addLayer('text', parentId, undefined, `文本 ${n}`)
    project.updateLayerProps(layer.id, { x: localX, y: localY, width: 100, height: 24 })
    layer.text = 'Text'
    layer.fontSize = 16
    canvas.select([layer.id])
    editor.setTool('select')
  }

  function move(): void { /* 文本工具无拖拽 */ }
  function up(): void { /* no-op */ }

  return { down, move, up }
}
