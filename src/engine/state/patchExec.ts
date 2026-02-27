import type { Patch, PatchConfig } from '../scene/types'
import type { VariableManager } from './VariableManager'

type CfgOf<T extends PatchConfig['type']> = Extract<PatchConfig, { type: T }>
type FireFn = (patchId: string, portId: string) => void
type TransitionFn = (groupId: string, stateId: string) => void

export interface ExecContext {
  vars: VariableManager
  fire: FireFn
  onTransition: TransitionFn
  onSetTo: TransitionFn
  timers: Set<ReturnType<typeof setTimeout>>
  onDrive?: (layerId: string, fromStateId: string, toStateId: string, t: number) => void
}

export function execCondition(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'condition'>
  const val = ctx.vars.get(cfg.variableId ?? '')
  ctx.fire(patch.id, val === cfg.compareValue ? 'true' : 'false')
}

export function execToggle(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'toggleVariable'>
  if (cfg.variableId) ctx.vars.toggle(cfg.variableId)
  ctx.fire(patch.id, 'out')
}

export function execSetVar(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'setVariable'>
  if (cfg.variableId && cfg.value !== undefined) ctx.vars.set(cfg.variableId, cfg.value)
  ctx.fire(patch.id, 'out')
}

export function execTo(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'to'>
  if (cfg.groupId && cfg.stateId) ctx.onTransition(cfg.groupId, cfg.stateId)
  ctx.fire(patch.id, 'done')
}

export function execSetTo(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'setTo'>
  if (cfg.groupId && cfg.stateId) ctx.onSetTo(cfg.groupId, cfg.stateId)
  ctx.fire(patch.id, 'done')
}

export function execDelay(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'delay'>
  const ms = cfg.duration ?? 1000
  const t = setTimeout(() => { ctx.timers.delete(t); ctx.fire(patch.id, 'out') }, ms)
  ctx.timers.add(t)
}

export function execCounter(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'counter'>
  if (cfg.variableId) {
    const cur = ctx.vars.get(cfg.variableId)
    if (typeof cur === 'number') ctx.vars.set(cfg.variableId, cur + (cfg.step ?? 1))
  }
  ctx.fire(patch.id, 'out')
}

export function execDrive(ctx: ExecContext, cfg: CfgOf<'transition'>, inputValue: number): void {
  if (!cfg.layerId || !cfg.fromStateId || !cfg.toStateId) return
  const [lo, hi] = cfg.inputRange ?? [0, 1]
  const delta = hi - lo
  if (Math.abs(delta) < 0.001) return
  const t = Math.max(0, Math.min(1, (inputValue - lo) / delta))
  ctx.onDrive?.(cfg.layerId, cfg.fromStateId, cfg.toStateId, t)
}

// Switch 内部 toggle 状态 (per patch id)
const switchStates = new Map<string, boolean>()

export function execSwitch(ctx: ExecContext, patch: Patch): void {
  const cfg = patch.config as CfgOf<'switch'>
  if (!cfg.groupId || !cfg.stateA || !cfg.stateB) return
  const cur = switchStates.get(patch.id) ?? false
  switchStates.set(patch.id, !cur)
  const targetState = cur ? cfg.stateA : cfg.stateB
  ctx.onTransition(cfg.groupId, targetState)
  ctx.fire(patch.id, 'done')
}

export function resetSwitchStates(): void { switchStates.clear() }
