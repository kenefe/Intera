// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useTextTool —— 文本工具
//  职责: 点击创建文本图层，自动切回 select
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

  function down(e: PointerEvent): void {
    if (editor.tool !== 'text') return
    const frame = (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')
    const r = frame
      ? frame.getBoundingClientRect()
      : viewportRef.value!.getBoundingClientRect()
    const x = Math.round(frame
      ? (e.clientX - r.left) / canvas.zoom
      : (e.clientX - r.left - canvas.panX) / canvas.zoom)
    const y = Math.round(frame
      ? (e.clientY - r.top) / canvas.zoom
      : (e.clientY - r.top - canvas.panY) / canvas.zoom)

    const n = Object.values(project.project.layers).filter(l => l.type === 'text').length + 1
    const layer = project.addLayer('text', null, undefined, `文本 ${n}`)
    project.updateLayerProps(layer.id, { x, y, width: 100, height: 24 })
    layer.text = 'Text'
    layer.fontSize = 16
    canvas.select([layer.id])
    editor.setTool('select')
  }

  function move(): void { /* 文本工具无拖拽 */ }
  function up(): void { /* no-op */ }

  return { down, move, up }
}
