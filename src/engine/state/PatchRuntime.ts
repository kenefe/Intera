// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchRuntime —— Patch 图执行引擎
//  职责: fire(patch, port) 沿连线传播
//  trigger → logic → action → behavior
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  Patch, PatchConnection,
  ConditionConfig, ToggleVarConfig, SetVarConfig,
  ToConfig, SetToConfig, DelayConfig, CounterConfig,
} from '../scene/types'
import type { VariableManager } from './VariableManager'
import { BehaviorManager } from './BehaviorManager'

type TransitionFn = (groupId: string, stateId: string) => void

// ── 连线索引: fromPatchId:fromPortId → 目标 patchId[] ──

type ConnIndex = Map<string, string[]>

function buildConnIndex(conns: PatchConnection[]): ConnIndex {
  const idx: ConnIndex = new Map()
  for (const c of conns) {
    const key = `${c.fromPatchId}:${c.fromPortId}`
    const arr = idx.get(key)
    if (arr) arr.push(c.toPatchId)
    else idx.set(key, [c.toPatchId])
  }
  return idx
}

// ── Patch 索引: id → Patch ──

function buildPatchIndex(patches: Patch[]): Map<string, Patch> {
  const m = new Map<string, Patch>()
  for (const p of patches) m.set(p.id, p)
  return m
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class PatchRuntime {
  private patches: Patch[]
  private connections: PatchConnection[]
  private vars: VariableManager
  private onTransition: TransitionFn
  private onSetTo: TransitionFn

  private connIdx: ConnIndex
  private patchIdx: Map<string, Patch>
  private timers = new Set<ReturnType<typeof setTimeout>>()
  readonly behaviors: BehaviorManager

  constructor(
    patches: Patch[], connections: PatchConnection[],
    vars: VariableManager,
    onTransition: TransitionFn,
    onSetTo?: TransitionFn,
  ) {
    this.patches = patches
    this.connections = connections
    this.vars = vars
    this.onTransition = onTransition
    this.onSetTo = onSetTo ?? onTransition
    this.connIdx = buildConnIndex(connections)
    this.patchIdx = buildPatchIndex(patches)
    this.behaviors = new BehaviorManager((id, port) => this.fire(id, port))
    this.behaviors.initAll(patches)
  }

  // ── 公开 API ──

  /** 触发输出端口，沿连线传播 (Map 索引，O(1) 查找) */
  fire(patchId: string, portId: string): void {
    const targets = this.connIdx.get(`${patchId}:${portId}`)
    if (!targets) return
    for (const tid of targets) {
      const target = this.patchIdx.get(tid)
      if (target) this.execute(target)
    }
  }

  /** 按图层事件触发匹配的 touch 节点 */
  triggerByLayer(layerId: string, event: string): void {
    for (const p of this.patches) {
      if (p.type !== 'touch') continue
      if (p.config.type === 'touch' && p.config.layerId === layerId)
        this.fire(p.id, event)
    }
  }

  /** 重建索引 (patches/connections 变化后调用) */
  rebuild(): void {
    this.connIdx = buildConnIndex(this.connections)
    this.patchIdx = buildPatchIndex(this.patches)
  }

  /** 重置: 变量归位 + 取消所有 delay 定时器 */
  reset(): void {
    this.vars.reset()
    for (const t of this.timers) clearTimeout(t)
    this.timers.clear()
  }

  /** 销毁: 清理 behavior + timers */
  destroy(): void {
    this.reset()
    this.behaviors.destroyAll()
  }

  // ── 节点执行 (类型安全 switch dispatch) ──

  private execute(patch: Patch): void {
    switch (patch.config.type) {
      case 'condition':
        this.execCondition(patch); break
      case 'toggleVariable':
        this.execToggle(patch); break
      case 'setVariable':
        this.execSetVar(patch); break
      case 'to':
        this.execTo(patch); break
      case 'setTo':
        this.execSetTo(patch); break
      case 'delay':
        this.execDelay(patch); break
      case 'counter':
        this.execCounter(patch); break
      default: break
    }
  }

  // ── 静态 dispatch 方法 ──

  private execCondition(patch: Patch): void {
    const cfg = patch.config as ConditionConfig
    const val = this.vars.get(cfg.variableId ?? '')
    this.fire(patch.id, val === cfg.compareValue ? 'true' : 'false')
  }

  private execToggle(patch: Patch): void {
    const cfg = patch.config as ToggleVarConfig
    if (cfg.variableId) this.vars.toggle(cfg.variableId)
    this.fire(patch.id, 'out')
  }

  private execSetVar(patch: Patch): void {
    const cfg = patch.config as SetVarConfig
    if (cfg.variableId && cfg.value !== undefined)
      this.vars.set(cfg.variableId, cfg.value)
    this.fire(patch.id, 'out')
  }

  private execTo(patch: Patch): void {
    const cfg = patch.config as ToConfig
    if (cfg.groupId && cfg.stateId)
      this.onTransition(cfg.groupId, cfg.stateId)
    this.fire(patch.id, 'done')
  }

  private execSetTo(patch: Patch): void {
    const cfg = patch.config as SetToConfig
    if (cfg.groupId && cfg.stateId)
      this.onSetTo(cfg.groupId, cfg.stateId)
    this.fire(patch.id, 'done')
  }

  private execDelay(patch: Patch): void {
    const cfg = patch.config as DelayConfig
    const ms = cfg.duration ?? 1000
    const t = setTimeout(() => {
      this.timers.delete(t)
      this.fire(patch.id, 'out')
    }, ms)
    this.timers.add(t)
  }

  private execCounter(patch: Patch): void {
    const cfg = patch.config as CounterConfig
    if (cfg.variableId) {
      const cur = this.vars.get(cfg.variableId)
      if (typeof cur === 'number')
        this.vars.set(cfg.variableId, cur + (cfg.step ?? 1))
    }
    this.fire(patch.id, 'out')
  }
}
