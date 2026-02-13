// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchRuntime —— Patch 图执行引擎
//  职责: fire(patch, port) 沿连线递归传播
//  trigger → logic → action 单向数据流
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Patch, PatchConnection, VariableValue } from '../scene/types'
import type { VariableManager } from './VariableManager'

type TransitionFn = (groupId: string, stateId: string) => void

export class PatchRuntime {
  private patches: Patch[]
  private connections: PatchConnection[]
  private vars: VariableManager
  private onTransition: TransitionFn

  constructor(
    patches: Patch[], connections: PatchConnection[],
    vars: VariableManager, onTransition: TransitionFn,
  ) {
    this.patches = patches
    this.connections = connections
    this.vars = vars
    this.onTransition = onTransition
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
      if (p.type === 'touch' && p.config.layerId === layerId) this.fire(p.id, event)
    }
  }

  /** 重置所有变量到默认值 */
  reset(): void { this.vars.reset() }

  // ── 节点执行 (dispatch table) ──

  private execute(patch: Patch): void {
    const cfg = patch.config
    const run: Record<string, () => void> = {
      condition: () => {
        const val = this.vars.get(cfg.variableId as string)
        this.fire(patch.id, val === cfg.compareValue ? 'true' : 'false')
      },
      toggleVariable: () => {
        this.vars.toggle(cfg.variableId as string)
        this.fire(patch.id, 'out')
      },
      setVariable: () => {
        this.vars.set(cfg.variableId as string, cfg.value as VariableValue)
        this.fire(patch.id, 'out')
      },
      to: () => {
        this.onTransition(cfg.groupId as string, cfg.stateId as string)
        this.fire(patch.id, 'done')
      },
      setTo: () => {
        this.onTransition(cfg.groupId as string, cfg.stateId as string)
        this.fire(patch.id, 'done')
      },
      delay: () => {
        const ms = (cfg.duration as number) ?? 1000
        setTimeout(() => this.fire(patch.id, 'out'), ms)
      },
      counter: () => {
        const cur = this.vars.get(cfg.variableId as string)
        if (typeof cur === 'number') {
          this.vars.set(cfg.variableId as string, cur + ((cfg.step as number) ?? 1))
        }
        this.fire(patch.id, 'out')
      },
    }
    run[patch.type]?.()
  }
}
