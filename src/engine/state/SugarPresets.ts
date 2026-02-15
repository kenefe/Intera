// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SugarPresets —— 一键交互模板
//  职责: 生成常见交互的 Patch 图 + 状态
//  直接操作 reactive 数据，由 Store 调用
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  AnimatableProps, DisplayState, Patch, PatchConnection,
  Variable, StateGroup,
} from '../scene/types'
import { createPatch } from './PatchDefs'
import { makeId } from '../idFactory'

/** Sugar 只依赖这三个方法，不耦合整个 DisplayStateManager */
export interface StateOps {
  findGroup(groupId: string): StateGroup | undefined
  addState(groupId: string, name: string): DisplayState | undefined
  setOverride(stateId: string, layerId: string, props: Partial<AnimatableProps>): void
}

// ── 连线 ID 工厂 ──

function connId(): string { return makeId('conn') }

function connect(
  out: Patch, outPort: string, inp: Patch, inPort: string,
  target: PatchConnection[],
): void {
  target.push({
    id: connId(),
    fromPatchId: out.id, fromPortId: outPort,
    toPatchId: inp.id,   toPortId: inPort,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  按钮反馈 — down → 缩小, up → 恢复
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buttonFeedback(
  states: StateOps,
  patches: Patch[], connections: PatchConnection[],
  layerId: string, groupId: string,
): void {
  const group = states.findGroup(groupId)
  if (!group) return
  const defaultId = group.displayStates[0]?.id
  if (!defaultId) return

  // 创建 "按下" 显示状态
  const pressed = states.addState(groupId, '按下')
  if (!pressed) return
  states.setOverride(pressed.id, layerId, { scaleX: 0.95, scaleY: 0.95, opacity: 0.9 })

  // 创建节点
  const touch     = createPatch('touch', { x: 0, y: 0 },     { layerId },                         'Touch')
  const toPressed = createPatch('to',    { x: 260, y: 0 },   { groupId, stateId: pressed.id },    '按下')
  const toDefault = createPatch('to',    { x: 260, y: 120 }, { groupId, stateId: defaultId },     '恢复')
  patches.push(touch, toPressed, toDefault)

  // 连线
  connect(touch, 'down', toPressed, 'in', connections)
  connect(touch, 'up',   toDefault, 'in', connections)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  卡片展开 — tap → toggle → 条件 → 切换状态
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function toggleExpand(
  states: StateOps,
  patches: Patch[], connections: PatchConnection[],
  variables: Variable[],
  layerId: string, groupId: string,
): void {
  const group = states.findGroup(groupId)
  if (!group) return
  const collapsedId = group.displayStates[0]?.id
  if (!collapsedId) return

  // 变量
  const varId = makeId('var_expanded')
  variables.push({ id: varId, name: 'isExpanded', type: 'boolean', defaultValue: false })

  // 展开状态
  const expanded = states.addState(groupId, '展开')
  if (!expanded) return
  states.setOverride(expanded.id, layerId, { height: 400, opacity: 1 })

  // 节点
  const touch   = createPatch('touch',          { x: 0, y: 0 },     { layerId },                                'Touch')
  const toggle  = createPatch('toggleVariable',  { x: 260, y: 0 },   { variableId: varId },                      'Toggle')
  const cond    = createPatch('condition',        { x: 520, y: 0 },   { variableId: varId, compareValue: true },  '展开?')
  const toExp   = createPatch('to',              { x: 780, y: 0 },   { groupId, stateId: expanded.id },          '展开')
  const toCol   = createPatch('to',              { x: 780, y: 120 }, { groupId, stateId: collapsedId },          '收起')
  patches.push(touch, toggle, cond, toExp, toCol)

  // 连线
  connect(touch,  'tap',   toggle, 'in',  connections)
  connect(toggle, 'out',   cond,   'in',  connections)
  connect(cond,   'true',  toExp,  'in',  connections)
  connect(cond,   'false', toCol,  'in',  connections)
}
