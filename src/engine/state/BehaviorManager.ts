// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BehaviorManager —— Behavior 节点生命周期
//  职责: create/destroy 有状态行为实例
//  封装 DragEngine，输出 pulse 事件
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Patch, BehaviorDragConfig, BehaviorScrollConfig } from '../scene/types'
import { DragEngine } from '../gesture/DragEngine'

// ── 行为实例接口 ──

export interface BehaviorInstance {
  patchId: string
  layerId?: string
  engine?: DragEngine
  destroy(): void
}

type FireFn = (patchId: string, portId: string) => void

// ── 从 config 构建 DragEngine 配置 ──

function buildDragCfg(cfg: BehaviorDragConfig | BehaviorScrollConfig) {
  const axisX = cfg.axis === 'x' || cfg.axis === 'both'
  const axisY = cfg.axis === 'y' || cfg.axis === 'both'
  const lo = cfg.range?.[0] ?? -Infinity
  const hi = cfg.range?.[1] ?? Infinity
  return {
    axis: { x: axisX, y: axisY },
    range: { x: [lo, hi] as [number, number], y: [lo, hi] as [number, number] },
    overScroll: { x: [1, 1] as [number, number], y: [1, 1] as [number, number] },
    friction: 1 / 2.1,
    springDamping: 1,
    springResponse: 0.4,
    absorb: { x: [] as [number, number][], y: [] as [number, number][] },
  }
}

function snapAbsorbs(points: number[]): [number, number][] {
  const SNAP_RADIUS = 30
  return points.map(p => [p - SNAP_RADIUS, p + SNAP_RADIUS] as [number, number])
}

// ── 统一行为工厂 ──

function createBehavior(
  patch: Patch, fire: FireFn,
): BehaviorInstance {
  const cfg = patch.config as BehaviorDragConfig | BehaviorScrollConfig
  const dragCfg = buildDragCfg(cfg)

  // scroll 特有: 关闭 overscroll
  if (cfg.type === 'behaviorScroll' && !(cfg as BehaviorScrollConfig).overscroll) {
    dragCfg.overScroll = { x: [0, 0], y: [0, 0] }
  }

  if (cfg.snapPoints?.length) {
    const abs = snapAbsorbs(cfg.snapPoints)
    dragCfg.absorb = { x: abs, y: abs }
  }

  const engine = new DragEngine(dragCfg, {
    onBegin: () => fire(patch.id, 'start'),
    onEnd: () => {
      fire(patch.id, 'end')
      const result = engine.scroll()
      if (result && cfg.snapPoints?.length) fire(patch.id, 'snap')
    },
  })

  return {
    patchId: patch.id,
    layerId: cfg.layerId,
    engine,
    destroy() { /* DragEngine 无需清理 */ },
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BehaviorManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class BehaviorManager {
  private instances = new Map<string, BehaviorInstance>()
  private fire: FireFn
  private patches: Patch[] = []

  constructor(fire: FireFn) { this.fire = fire }

  /** 为 Behavior 节点创建实例 */
  create(patch: Patch): void {
    this.destroy(patch.id)
    const t = patch.config.type
    if (t === 'behaviorDrag' || t === 'behaviorScroll')
      this.instances.set(patch.id, createBehavior(patch, this.fire))
  }

  /** 销毁单个实例 */
  destroy(patchId: string): void {
    this.instances.get(patchId)?.destroy()
    this.instances.delete(patchId)
  }

  /** 销毁全部 */
  destroyAll(): void {
    for (const inst of this.instances.values()) inst.destroy()
    this.instances.clear()
  }

  /** 按目标图层查找实例 (纯查询，无副作用) */
  findByLayer(layerId: string): BehaviorInstance | undefined {
    for (const inst of this.instances.values()) {
      if (inst.layerId === layerId && inst.engine) return inst
    }
    return undefined
  }

  /** 按目标图层确保实例存在 (惰性创建) */
  ensureByLayer(layerId: string): BehaviorInstance | undefined {
    const existing = this.findByLayer(layerId)
    if (existing) return existing
    for (const p of this.patches) {
      const cfg = p.config as BehaviorDragConfig | BehaviorScrollConfig
      if ((cfg.type === 'behaviorDrag' || cfg.type === 'behaviorScroll')
        && cfg.layerId === layerId) {
        this.create(p)
        return this.instances.get(p.id)
      }
    }
    return undefined
  }

  /** 初始化所有 Behavior 节点 */
  initAll(patches: Patch[]): void {
    this.patches = patches
    for (const p of patches) {
      if (p.config.type === 'behaviorDrag' || p.config.type === 'behaviorScroll')
        this.create(p)
    }
  }
}
