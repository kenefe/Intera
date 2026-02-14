// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  渲染器接口 —— 唯一的抽象边界
//  DOM 实现在前，WebGPU 未来可替换
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AnimatableProps, LayerType } from '@engine/scene/types'

/** 交互事件类型 */
export type InteractionEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'click'
  | 'hover'
  | 'hoverend'

/** 交互事件 */
export interface InteractionEvent {
  type: InteractionEventType
  layerId: string
  x: number
  y: number
  originalEvent: PointerEvent | MouseEvent
}

/** 事件处理器 */
export type InteractionHandler = (event: InteractionEvent) => void

/**
 * 渲染器接口
 *
 * 所有 UI 层（画布、面板、时间轴）只持有此接口引用，
 * 绝不直接操作 DOM 或 GPU。
 * 切换渲染器 = 换一行实例化代码。
 */
export interface Renderer {
  // ── 生命周期 ──
  mount(container: HTMLElement): void
  destroy(): void

  // ── 图层操作 ──
  createLayer(id: string, type: LayerType, props: AnimatableProps): void
  updateLayer(id: string, props: Partial<AnimatableProps>): void
  removeLayer(id: string): void
  setLayerOrder(ids: string[]): void
  setLayerParent(childId: string, parentId: string | null): void

  // ── 画布控制 ──
  setViewport(zoom: number, panX: number, panY: number): void
  getViewport(): { zoom: number; panX: number; panY: number }

  // ── 帧捕获 (视频导出用, 可选 — VideoExporter 已用 Canvas2D 替代) ──
  captureFrame?(): Promise<ImageBitmap>

  // ── 事件 ──
  onInteraction(handler: InteractionHandler): void
  offInteraction(handler: InteractionHandler): void
}
