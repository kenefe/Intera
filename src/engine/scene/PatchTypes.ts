// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchTypes —— Patch 节点类型定义
//  discriminated union config + 辅助工具
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Vec2, VariableValue } from './SceneTypes'

// ── 节点类型 ──

export type PatchType =
  | 'touch' | 'longPress' | 'drag' | 'scroll'
  | 'timer' | 'variableChange'
  | 'condition' | 'toggleVariable' | 'delay' | 'counter'
  | 'to' | 'setTo' | 'setVariable'
  | 'behaviorDrag' | 'behaviorScroll'
  | 'transition'
  | 'switch'

export interface PatchPort {
  id: string
  name: string
  dataType: 'pulse' | 'boolean' | 'number' | 'string' | 'vec2'
}

// ── 各节点 config (discriminated union by type) ──

export interface TouchConfig { type: 'touch'; layerId?: string }
export interface LongPressConfig { type: 'longPress'; layerId?: string }
export interface DragConfig { type: 'drag'; layerId?: string }
export interface ScrollConfig { type: 'scroll'; layerId?: string }
export interface TimerConfig { type: 'timer'; interval?: number }
export interface VarChangeConfig { type: 'variableChange'; variableId?: string }
export interface ConditionConfig { type: 'condition'; variableId?: string; compareValue?: VariableValue }
export interface ToggleVarConfig { type: 'toggleVariable'; variableId?: string }
export interface DelayConfig { type: 'delay'; duration?: number }
export interface CounterConfig { type: 'counter'; variableId?: string; step?: number }
export interface ToConfig { type: 'to'; groupId?: string; stateId?: string }
export interface SetToConfig { type: 'setTo'; groupId?: string; stateId?: string }
export interface SetVarConfig { type: 'setVariable'; variableId?: string; value?: VariableValue }

// ── Behavior 节点 config ──

export interface BehaviorDragConfig {
  type: 'behaviorDrag'
  layerId?: string
  axis?: 'x' | 'y' | 'both'
  range?: [number, number]
  snapPoints?: number[]
}

/** Transition 节点: 将连续数值映射为两个状态间的插值驱动 */
export interface PatchTransitionConfig {
  type: 'transition'
  layerId?: string
  groupId?: string
  fromStateId?: string
  toStateId?: string
  inputRange?: [number, number]
}

export interface BehaviorScrollConfig {
  type: 'behaviorScroll'
  layerId?: string
  axis?: 'x' | 'y' | 'both'
  range?: [number, number]
  overscroll?: boolean
  snapPoints?: number[]
}

/** Switch 合并节点: 一个节点完成 toggle+condition+to×2 */
export interface SwitchConfig {
  type: 'switch'
  layerId?: string
  groupId?: string
  stateA?: string   // 状态 A id
  stateB?: string   // 状态 B id
  trigger?: 'tap' | 'down' | 'up'  // 触发事件
}

export type PatchConfig =
  | TouchConfig | LongPressConfig | DragConfig | ScrollConfig
  | TimerConfig | VarChangeConfig
  | ConditionConfig | ToggleVarConfig | DelayConfig | CounterConfig
  | ToConfig | SetToConfig | SetVarConfig
  | BehaviorDragConfig | BehaviorScrollConfig
  | PatchTransitionConfig
  | SwitchConfig

export type ConfigFor<T extends PatchType> =
  T extends 'touch' ? TouchConfig :
  T extends 'longPress' ? LongPressConfig :
  T extends 'drag' ? DragConfig :
  T extends 'scroll' ? ScrollConfig :
  T extends 'timer' ? TimerConfig :
  T extends 'variableChange' ? VarChangeConfig :
  T extends 'condition' ? ConditionConfig :
  T extends 'toggleVariable' ? ToggleVarConfig :
  T extends 'delay' ? DelayConfig :
  T extends 'counter' ? CounterConfig :
  T extends 'to' ? ToConfig :
  T extends 'setTo' ? SetToConfig :
  T extends 'setVariable' ? SetVarConfig :
  T extends 'behaviorDrag' ? BehaviorDragConfig :
  T extends 'behaviorScroll' ? BehaviorScrollConfig :
  T extends 'transition' ? PatchTransitionConfig :
  T extends 'switch' ? SwitchConfig :
  never

// ── Patch 节点 ──

export interface Patch {
  id: string
  type: PatchType
  name: string
  position: Vec2
  config: PatchConfig
  inputs: PatchPort[]
  outputs: PatchPort[]
}

/** 类型安全的 config 窄化辅助 */
export function narrowPatch<T extends PatchType>(
  patch: Patch, expected: T,
): ConfigFor<T> | null {
  return patch.type === expected ? patch.config as ConfigFor<T> : null
}

// ── 连线 ──

export interface PatchConnection {
  id: string
  fromPatchId: string
  fromPortId: string
  toPatchId: string
  toPortId: string
}
