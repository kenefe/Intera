// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchRuntime —— Patch 图执行引擎
//  职责: fire(patch, port) 沿连线传播
//  trigger → logic → action → behavior
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Patch, PatchConnection, PatchConfig } from '../scene/types'
import type { VariableManager } from './VariableManager'
import { BehaviorManager } from './BehaviorManager'
import {
  execCondition, execToggle, execSetVar, execTo, execSetTo,
  execDelay, execCounter, execDrive, execSwitch, resetSwitchStates,
  type ExecContext,
} from './patchExec'

type CfgOf<T extends PatchConfig['type']> = Extract<PatchConfig, { type: T }>
type TransitionFn = (groupId: string, stateId: string) => void

export type DriveFn = (
  layerId: string, fromStateId: string, toStateId: string, progress: number,
) => void

// ── 索引构建 ──

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

function buildPatchIndex(patches: Patch[]): Map<string, Patch> {
  const m = new Map<string, Patch>()
  for (const p of patches) m.set(p.id, p)
  return m
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class PatchRuntime {
  private patches: Patch[]
  private connections: PatchConnection[]
  private connIdx: ConnIndex
  private patchIdx: Map<string, Patch>
  private portValues = new Map<string, number>()
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private ctx: ExecContext
  readonly behaviors: BehaviorManager
  onDrive: DriveFn | null = null

  constructor(
    patches: Patch[], connections: PatchConnection[],
    vars: VariableManager, onTransition: TransitionFn, onSetTo?: TransitionFn,
  ) {
    this.patches = patches
    this.connections = connections
    this.connIdx = buildConnIndex(connections)
    this.patchIdx = buildPatchIndex(patches)
    this.ctx = {
      vars, fire: (id, port) => this.fire(id, port),
      onTransition, onSetTo: onSetTo ?? onTransition, timers: this.timers,
    }
    this.behaviors = new BehaviorManager(
      (id, port) => this.fire(id, port),
      (id, port, val) => this.setValue(id, port, val),
    )
    this.behaviors.initAll(patches)
  }

  fire(patchId: string, portId: string): void {
    const targets = this.connIdx.get(`${patchId}:${portId}`)
    if (!targets) return
    for (const tid of targets) {
      const target = this.patchIdx.get(tid)
      if (target) this.execute(target)
    }
  }

  setValue(patchId: string, portId: string, value: number): void {
    this.portValues.set(`${patchId}:${portId}`, value)
    const targets = this.connIdx.get(`${patchId}:${portId}`)
    if (!targets) return
    for (const tid of targets) {
      const target = this.patchIdx.get(tid)
      if (target?.config.type === 'transition') {
        this.ctx.onDrive = this.onDrive ?? undefined
        execDrive(this.ctx, target.config as CfgOf<'transition'>, value)
      }
    }
  }

  triggerByLayer(layerId: string, event: string): void {
    for (const p of this.patches) {
      if (p.type === 'touch' && p.config.type === 'touch' && p.config.layerId === layerId)
        this.fire(p.id, event)
      if (p.type === 'longPress' && p.config.type === 'longPress' && p.config.layerId === layerId && event === 'longPress')
        this.fire(p.id, 'trigger')
      if (p.type === 'switch' && p.config.type === 'switch' && p.config.layerId === layerId && event === 'tap')
        this.execute(p)
    }
  }

  rebuild(extraPatches?: Patch[], extraConns?: PatchConnection[]): void {
    const allPatches = extraPatches ? [...this.patches, ...extraPatches] : this.patches
    const allConns = extraConns ? [...this.connections, ...extraConns] : this.connections
    this.connIdx = buildConnIndex(allConns)
    this.patchIdx = buildPatchIndex(allPatches)
    this.portValues.clear()
    this.behaviors.destroyAll()
    this.behaviors.initAll(allPatches)
  }

  reset(): void {
    this.ctx.vars.reset()
    resetSwitchStates()
    for (const t of this.timers) clearTimeout(t)
    this.timers.clear()
  }

  destroy(): void { this.reset(); this.behaviors.destroyAll() }

  private execute(patch: Patch): void {
    const t = patch.config.type
    if (t === 'condition') execCondition(this.ctx, patch)
    else if (t === 'toggleVariable') execToggle(this.ctx, patch)
    else if (t === 'setVariable') execSetVar(this.ctx, patch)
    else if (t === 'to') execTo(this.ctx, patch)
    else if (t === 'setTo') execSetTo(this.ctx, patch)
    else if (t === 'delay') execDelay(this.ctx, patch)
    else if (t === 'counter') execCounter(this.ctx, patch)
    else if (t === 'switch') execSwitch(this.ctx, patch)
  }
}
