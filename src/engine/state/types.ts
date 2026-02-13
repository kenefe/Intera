// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  交互逻辑引擎 —— 类型定义
//  触控 → 逻辑变量 → 显示状态 → to()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { VariableValue } from '../scene/types'

// ── 触控事件 (原始粒度) ──
//
// 触屏优先，所有手势的原子事件:
//   down       → 手指按下
//   startMove  → 首次超过移动阈值 (判定为拖拽)
//   move       → 持续移动
//   up         → 手指抬起
//
// drag 和 scroll 是上层封装，不在这里

export type TouchEventType =
  | 'down'
  | 'startMove'
  | 'move'
  | 'up'

/** 触控事件数据 */
export interface TouchEventData {
  type: TouchEventType
  targetLayerId: string

  // 当前坐标
  x: number
  y: number

  // 相对按下点的偏移
  offsetX: number
  offsetY: number

  // 速度 (move/up 时有值)
  speedX: number
  speedY: number

  // 是否判定为点击 (up 时有值)
  isClick: boolean

  // 时间信息
  downTime: number
  duration: number
}

// ── 触发器 ──

export type TriggerType =
  | 'touch'             // 原始触控 (输出 down/startMove/move/up)
  | 'drag'              // 封装: 跟手 + 惯性
  | 'scroll'            // 封装: drag + range + overscroll + absorb
  | 'timer'             // 定时触发
  | 'variableChange'    // 变量变化触发

// ── 条件 ──

export type CompareOp = '==' | '!=' | '>' | '<' | '>=' | '<='

export interface Condition {
  variableId: string
  operator: CompareOp
  value: VariableValue
}

// ── 动作 ──
//
// 统一模型: 一切都是 "描述目标状态，过去"
//
//   to('Card/展开')          = 具名关键帧，弹簧动画
//   to({ scaleX: 1.05 })    = 内联关键帧 (匿名)，弹簧动画
//   setTo('Card/收起')       = 具名关键帧，立即到位
//   setTo({ x: 0 })         = 内联关键帧，立即到位
//
// 目标可以是:
//   1. 具名状态: stateGroupId + displayStateId
//   2. 内联属性: layerId + { prop: value }
//   3. 动态值: 来自触控事件的 x/y (通过连线传入)

export type ActionType =
  | 'to'                // → 弹簧动画到目标 (具名状态 or 内联属性)
  | 'setTo'             // ⇒ 立即到位 (具名状态 or 内联属性)
  | 'setVariable'       // 设置逻辑变量
  | 'toggleVariable'    // 布尔变量取反

/** 动作目标: 具名状态 or 内联属性 */
export type ActionTarget =
  | { kind: 'namedState'; stateGroupId: string; displayStateId: string }
  | { kind: 'inlineProps'; layerId: string; props: Partial<Record<string, number>> }

export interface Action {
  type: ActionType
  target?: ActionTarget
  variableId?: string
  variableValue?: VariableValue
}

// ── Patch 运行时上下文 ──

export interface PatchContext {
  /** 逻辑变量当前值 */
  variables: Record<string, VariableValue>

  /** → to(): 弹簧动画到目标 */
  to: (target: ActionTarget) => void

  /** ⇒ setTo(): 立即到位 */
  setTo: (target: ActionTarget) => void

  /** 设置逻辑变量 */
  setVariable: (variableId: string, value: VariableValue) => void
}
