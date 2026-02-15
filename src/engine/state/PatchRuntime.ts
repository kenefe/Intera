// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchRuntime —— Patch 图执行引擎
//  职责: fire(patch, port) 沿连线递归传播
//  trigger → logic → action 单向数据流
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  Patch, PatchConnection, VariableValue,
  ConditionConfig, ToggleVarConfig, SetVarConfig,
  ToConfig, SetToConfig, DelayConfig, CounterConfig,
} from '../scene/types'
import type { VariableManager } from './VariableManager'

type TransitionFn = (groupId: string, stateId: string) => void

export class PatchRuntime {
  private patches: Patch[]
  private connections: PatchConnection[]
  private vars: VariableManager
  private onTransition: TransitionFn
  private onSetTo: TransitionFn

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
  }

  // ── 公开 API ──

  /** 触发输出端口，沿连线传播 */
  fire(patchId: string, portId: string): void {
    for (const c of this.connections) {
      if (c.fromPatchId !== patchId || c.fromPortId !== portId) continue
      const target = this.patches.find(p => p.id === c.toPatchId)
      if (target) this.execute(target)
    }
  }

  /** 按图层事件触发匹配的 touch 节点 */
  triggerByLayer(layerId: string, event: string): void {
    for (const p of this.patches) {
      if (p.type !== 'touch') continue
      const cfg = p.config as { type: 'touch'; layerId?: string }
      if (cfg.layerId === layerId) this.fire(p.id, event)
    }
  }

  /** 重置所有变量到默认值 */
  reset(): void { this.vars.reset() }

  // ── 节点执行 (类型安全 dispatch) ──

  private execute(patch: Patch): void {
    switch (patch.config.type) {
      case 'condition': {
        const cfg = patch.config as ConditionConfig
        const val = this.vars.get(cfg.variableId ?? '')
        const port = val === cfg.compareValue ? 'true' : 'false'
        this.fire(patch.id, port)
        break
      }
      case 'toggleVariable': {
        const cfg = patch.config as ToggleVarConfig
        if (cfg.variableId) this.vars.toggle(cfg.variableId)
        this.fire(patch.id, 'out')
        break
      }
      case 'setVariable': {
        const cfg = patch.config as SetVarConfig
        if (cfg.variableId && cfg.value !== undefined)
          this.vars.set(cfg.variableId, cfg.value)
        this.fire(patch.id, 'out')
        break
      }
      case 'to': {
        const cfg = patch.config as ToConfig
        if (cfg.groupId && cfg.stateId)
          this.onTransition(cfg.groupId, cfg.stateId)
        this.fire(patch.id, 'done')
        break
      }
      case 'setTo': {
        const cfg = patch.config as SetToConfig
        if (cfg.groupId && cfg.stateId)
          this.onSetTo(cfg.groupId, cfg.stateId)
        this.fire(patch.id, 'done')
        break
      }
      case 'delay': {
        const cfg = patch.config as DelayConfig
        const ms = cfg.duration ?? 1000
        setTimeout(() => this.fire(patch.id, 'out'), ms)
        break
      }
      case 'counter': {
        const cfg = patch.config as CounterConfig
        if (cfg.variableId) {
          const cur = this.vars.get(cfg.variableId)
          if (typeof cur === 'number')
            this.vars.set(cfg.variableId, cur + (cfg.step ?? 1))
        }
        this.fire(patch.id, 'out')
        break
      }
      default: break
    }
  }
}
