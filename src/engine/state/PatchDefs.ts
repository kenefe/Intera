// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchDefs —— 节点端口定义 + 工厂
//  每种 PatchType 对应固定的输入/输出端口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { PatchType, PatchPort, Patch, Vec2, PatchConfig, ConfigFor } from '../scene/types'
import { makeId } from '../idFactory'

// ── 端口模板 ──

const IN: PatchPort  = { id: 'in',   name: 'In',   dataType: 'pulse' }
const OUT: PatchPort = { id: 'out',  name: 'Out',  dataType: 'pulse' }
const DONE: PatchPort = { id: 'done', name: 'Done', dataType: 'pulse' }

// ── 各类型端口定义 ──

type PortDef = { inputs: PatchPort[]; outputs: PatchPort[] }

const DEFS: Record<PatchType, PortDef> = {
  // 触发器 (无输入，仅输出)
  touch: { inputs: [], outputs: [
    { id: 'down', name: 'Down', dataType: 'pulse' },
    { id: 'up',   name: 'Up',   dataType: 'pulse' },
    { id: 'tap',  name: 'Tap',  dataType: 'pulse' },
  ]},
  drag:   { inputs: [], outputs: [
    { id: 'start', name: 'Start', dataType: 'pulse' },
    { id: 'move',  name: 'Move',  dataType: 'pulse' },
    { id: 'end',   name: 'End',   dataType: 'pulse' },
  ]},
  scroll:         { inputs: [],   outputs: [OUT] },
  timer:          { inputs: [IN], outputs: [{ id: 'fire', name: 'Fire', dataType: 'pulse' }] },
  variableChange: { inputs: [],   outputs: [{ id: 'changed', name: 'Changed', dataType: 'pulse' }] },

  // 逻辑
  condition:      { inputs: [IN], outputs: [
    { id: 'true',  name: 'True',  dataType: 'pulse' },
    { id: 'false', name: 'False', dataType: 'pulse' },
  ]},
  toggleVariable: { inputs: [IN], outputs: [OUT] },
  delay:          { inputs: [IN], outputs: [OUT] },
  counter:        { inputs: [IN], outputs: [OUT] },

  // 动作
  to:          { inputs: [IN], outputs: [DONE] },
  setTo:       { inputs: [IN], outputs: [DONE] },
  setVariable: { inputs: [IN], outputs: [OUT] },

  // 行为 (有状态，需要 create/destroy 生命周期)
  behaviorDrag: { inputs: [], outputs: [
    { id: 'start', name: 'Start', dataType: 'pulse' },
    { id: 'end',   name: 'End',   dataType: 'pulse' },
    { id: 'snap',  name: 'Snap',  dataType: 'pulse' },
  ]},
  behaviorScroll: { inputs: [], outputs: [
    { id: 'start', name: 'Start', dataType: 'pulse' },
    { id: 'end',   name: 'End',   dataType: 'pulse' },
    { id: 'snap',  name: 'Snap',  dataType: 'pulse' },
  ]},
}

// ── 节点分类 (用于 UI 着色) ──

export type PatchCategory = 'trigger' | 'logic' | 'action' | 'behavior'

const TRIGGER_TYPES: PatchType[] = ['touch', 'drag', 'scroll', 'timer', 'variableChange']
const ACTION_TYPES: PatchType[]  = ['to', 'setTo', 'setVariable']
const BEHAVIOR_TYPES: PatchType[] = ['behaviorDrag', 'behaviorScroll']

export function patchCategory(type: PatchType): PatchCategory {
  if (TRIGGER_TYPES.includes(type)) return 'trigger'
  if (ACTION_TYPES.includes(type)) return 'action'
  if (BEHAVIOR_TYPES.includes(type)) return 'behavior'
  return 'logic'
}

// ── 默认 config 工厂 ──

function defaultConfig(type: PatchType): PatchConfig {
  const map: Record<PatchType, () => PatchConfig> = {
    touch:          () => ({ type: 'touch', layerId: '' }),
    drag:           () => ({ type: 'drag', layerId: '' }),
    scroll:         () => ({ type: 'scroll', layerId: '' }),
    timer:          () => ({ type: 'timer' }),
    variableChange: () => ({ type: 'variableChange', variableId: '' }),
    condition:      () => ({ type: 'condition', variableId: '' }),
    toggleVariable: () => ({ type: 'toggleVariable', variableId: '' }),
    delay:          () => ({ type: 'delay' }),
    counter:        () => ({ type: 'counter' }),
    to:             () => ({ type: 'to', stateId: '', groupId: '' }),
    setTo:          () => ({ type: 'setTo', stateId: '', groupId: '' }),
    setVariable:    () => ({ type: 'setVariable', variableId: '' }),
    behaviorDrag:   () => ({ type: 'behaviorDrag', axis: 'both', layerId: '' }),
    behaviorScroll: () => ({ type: 'behaviorScroll', axis: 'y', overscroll: true, layerId: '' }),
  }
  return map[type]()
}

// ── 节点工厂 ──

export function createPatch<T extends PatchType>(
  type: T, position: Vec2,
  config?: Partial<Omit<ConfigFor<T>, 'type'>>,
  name?: string,
): Patch {
  const def = DEFS[type]
  const base = defaultConfig(type)
  const merged: PatchConfig = config
    ? { ...base, ...config } as PatchConfig
    : base
  return {
    id: makeId('patch'),
    type, name: name ?? type,
    position: { ...position },
    config: merged,
    inputs:  def.inputs.map(p => ({ ...p })),
    outputs: def.outputs.map(p => ({ ...p })),
  }
}
