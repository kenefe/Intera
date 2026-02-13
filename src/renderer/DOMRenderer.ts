// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DOMRenderer —— DOM 渲染器
//  职责: 图层 = div + CSS transform/style
//  一个图层一个 div，嵌套结构映射 DOM 树
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AnimatableProps, LayerType } from '@engine/scene/types'
import type { Renderer, InteractionHandler, InteractionEvent, InteractionEventType } from './types'

// ── CSS 映射 ──

function applyProps(el: HTMLElement, p: AnimatableProps, type?: LayerType): void {
  const s = el.style
  s.width = `${p.width}px`
  s.height = `${p.height}px`
  s.opacity = String(p.opacity)
  // 椭圆: 永远 50% 圆角; 其他: 使用属性值
  s.borderRadius = type === 'ellipse' ? '50%' : `${p.borderRadius}px`
  s.backgroundColor = p.fill
  s.transform = [
    `translate(${p.x}px, ${p.y}px)`,
    `rotate(${p.rotation}deg)`,
    `scale(${p.scaleX}, ${p.scaleY})`,
  ].join(' ')
  applyStroke(s, p)
}

function applyStroke(s: CSSStyleDeclaration, p: AnimatableProps): void {
  if (p.stroke !== 'none' && p.strokeWidth > 0) {
    s.borderStyle = 'solid'
    s.borderColor = p.stroke
    s.borderWidth = `${p.strokeWidth}px`
  } else {
    s.border = 'none'
  }
}

// ── 图层 div 初始样式 ──

const LAYER_CSS = 'position:absolute;box-sizing:border-box;pointer-events:auto;'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DOMRenderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DOMRenderer implements Renderer {
  private world: HTMLElement | null = null
  private els = new Map<string, HTMLElement>()
  private props = new Map<string, AnimatableProps>()
  private types = new Map<string, LayerType>()
  private handlers = new Set<InteractionHandler>()
  private vp = { zoom: 1, panX: 0, panY: 0 }

  // ── 生命周期 ──

  mount(container: HTMLElement): void {
    this.world = document.createElement('div')
    this.world.style.cssText = 'position:relative;transform-origin:0 0;'
    container.appendChild(this.world)
    this.world.addEventListener('pointerdown', this.onPointer)
    this.world.addEventListener('pointermove', this.onPointer)
    this.world.addEventListener('pointerup', this.onPointer)
  }

  destroy(): void {
    this.world?.removeEventListener('pointerdown', this.onPointer)
    this.world?.removeEventListener('pointermove', this.onPointer)
    this.world?.removeEventListener('pointerup', this.onPointer)
    this.world?.remove()
    this.els.clear()
    this.props.clear()
    this.world = null
  }

  // ── 图层操作 ──

  createLayer(id: string, type: LayerType, initial: AnimatableProps): void {
    const el = document.createElement('div')
    el.style.cssText = LAYER_CSS
    el.dataset.layerId = id
    this.els.set(id, el)
    this.props.set(id, { ...initial })
    this.types.set(id, type)
    applyProps(el, initial, type)
    this.world?.appendChild(el)
  }

  updateLayer(id: string, partial: Partial<AnimatableProps>): void {
    const el = this.els.get(id)
    const cur = this.props.get(id)
    if (!el || !cur) return
    Object.assign(cur, partial)
    applyProps(el, cur, this.types.get(id))
  }

  removeLayer(id: string): void {
    this.els.get(id)?.remove()
    this.els.delete(id)
    this.props.delete(id)
    this.types.delete(id)
  }

  setLayerOrder(ids: string[]): void {
    ids.forEach((id, i) => {
      const el = this.els.get(id)
      if (el) el.style.zIndex = String(i)
    })
  }

  setLayerParent(childId: string, parentId: string | null): void {
    const child = this.els.get(childId)
    if (!child) return
    const parent = parentId ? this.els.get(parentId) : this.world
    parent?.appendChild(child)
  }

  // ── 画布控制 ──

  setViewport(zoom: number, panX: number, panY: number): void {
    Object.assign(this.vp, { zoom, panX, panY })
    if (!this.world) return
    this.world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
  }

  getViewport() { return { ...this.vp } }

  // ── 帧捕获 (Phase 9 实现) ──

  async captureFrame(): Promise<ImageBitmap> {
    throw new Error('captureFrame: 未实现 (Phase 9)')
  }

  // ── 事件 ──

  onInteraction(handler: InteractionHandler): void { this.handlers.add(handler) }
  offInteraction(handler: InteractionHandler): void { this.handlers.delete(handler) }

  // ── 内部 ──

  private onPointer = (e: PointerEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')
    if (!el) return
    const event: InteractionEvent = {
      type: e.type as InteractionEventType,
      layerId: el.dataset.layerId!,
      x: e.clientX, y: e.clientY,
      originalEvent: e,
    }
    for (const h of this.handlers) h(event)
  }
}
