// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  场景图 —— 类型定义 (barrel)
//  re-export SceneTypes + Patch 类型 + Project
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 场景/图层/状态 类型 ──

export type {
  Vec2, Size, LayerType, AnimatableProps,
  LayoutDirection, SizeMode, Alignment, JustifyContent, LayoutProps,
  Layer, CurveType, CurveConfig, TransitionConfig, DisplayState,
  StateGroup, VariableType, VariableValue, Variable,
} from './SceneTypes'

import type { Vec2, Size, Layer, StateGroup, Variable, VariableValue } from './SceneTypes'
import type { Patch, PatchConnection } from './PatchTypes'

// ── Patch 类型 ──

export type {
  PatchType, PatchPort, PatchConfig, ConfigFor,
  TouchConfig, DragConfig, ScrollConfig, TimerConfig, VarChangeConfig,
  ConditionConfig, ToggleVarConfig, DelayConfig, CounterConfig,
  ToConfig, SetToConfig, SetVarConfig,
  BehaviorDragConfig, BehaviorScrollConfig,
  PatchTransitionConfig,
  Patch, PatchConnection,
} from './PatchTypes'
export { narrowPatch } from './PatchTypes'

// ── 项目数据模型 ──

export interface Project {
  id: string
  name: string
  canvasSize: Size
  layers: Record<string, Layer>
  rootLayerIds: string[]
  stateGroups: StateGroup[]
  variables: Variable[]
  patches: Patch[]
  connections: PatchConnection[]
}
