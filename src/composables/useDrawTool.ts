// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useDrawTool —— 绘制工具 (矩形/椭圆/Frame)
//  职责: 拖拽绘制 / 点击创建新图层，松手后自动切回 select
//  特性: 在 Frame 内绘制自动成为其子图层
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

// ── 点击(未拖拽)时的默认尺寸 ──
const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  rectangle: { w: 100, h: 100 },
  ellipse:   { w: 80,  h: 80 },
  frame:     { w: 200, h: 200 },
}

// 拖拽位移 < 此值视为「点击」
const CLICK_THRESHOLD = 4

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDrawTool(viewportRef: Ref<HTMLElement | undefined>) {
  const canvas = useCanvasStore()
  const editor = useEditorStore()
  const project = useProjectStore()

  let drawId: string | null = null
  // origin 始终存储 parent-local 坐标
  let originX = 0, originY = 0
  // 本次绘制的目标父级 Frame (null = 根级)
  let targetParentId: string | null = null

  // ── 绘制事务内锁定的画板引用 ──
  let drawFrame: HTMLElement | null = null

  /** 屏幕坐标 → 画板本地坐标 (像素对齐) */
  function toArtboard(e: PointerEvent): { x: number; y: number } {
    const frame = drawFrame
      ?? (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')
    if (frame) {
      const r = frame.getBoundingClientRect()
      return {
        x: Math.round((e.clientX - r.left) / canvas.zoom),
        y: Math.round((e.clientY - r.top) / canvas.zoom),
      }
    }
    const r = viewportRef.value!.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - r.left - canvas.panX) / canvas.zoom),
      y: Math.round((e.clientY - r.top - canvas.panY) / canvas.zoom),
    }
  }

  /** 画板坐标 → parent-local 坐标 (减去父 Frame 的偏移) */
  function toParentLocal(absX: number, absY: number): { x: number; y: number } {
    if (!targetParentId) return { x: absX, y: absY }
    const fp = project.project.layers[targetParentId]?.props
    return fp
      ? { x: absX - fp.x, y: absY - fp.y }
      : { x: absX, y: absY }
  }

  /** 查找包含该画板坐标的最上层 Frame (后绘制 = z 更高) */
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
    const layerType = DRAW_TOOLS[editor.tool]
    if (!layerType || drawId) return
    drawFrame = (e.target as HTMLElement).closest<HTMLElement>('.artboard-frame')

    const abs = toArtboard(e)
    targetParentId = findFrameAt(abs.x, abs.y)
    const local = toParentLocal(abs.x, abs.y)
    originX = local.x; originY = local.y

    const n = Object.values(project.project.layers).filter(l => l.type === layerType).length + 1
    const layer = project.addLayer(layerType, targetParentId, undefined, `${TYPE_LABEL[layerType] ?? layerType} ${n}`)
    project.updateLayerProps(layer.id, { x: local.x, y: local.y, width: 1, height: 1 })
    drawId = layer.id
    canvas.select([layer.id])
  }

  function move(e: PointerEvent): void {
    if (!drawId) return
    const abs = toArtboard(e)
    const local = toParentLocal(abs.x, abs.y)
    project.updateLayerProps(drawId, {
      x: Math.min(local.x, originX),
      y: Math.min(local.y, originY),
      width: Math.abs(local.x - originX),
      height: Math.abs(local.y - originY),
    })
  }

  function up(): void {
    if (!drawId) return
    // ── 点击(未拖拽) → 赋予默认尺寸，居中于点击位置 ──
    const layer = project.project.layers[drawId]
    if (layer && layer.props.width < CLICK_THRESHOLD && layer.props.height < CLICK_THRESHOLD) {
      const size = DEFAULT_SIZE[layer.type] ?? { w: 100, h: 100 }
      project.updateLayerProps(drawId, {
        x: originX - Math.round(size.w / 2),
        y: originY - Math.round(size.h / 2),
        width: size.w,
        height: size.h,
      })
    }
    editor.setTool('select')
    drawId = null
    drawFrame = null
    targetParentId = null
  }

  return { down, move, up }
}
