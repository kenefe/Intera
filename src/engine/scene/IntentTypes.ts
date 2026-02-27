// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  IntentTypes —— 意图规则 (Level 0)
//  一条规则 = 触发方式 + 行为 + 目标
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type IntentTrigger = 'tap' | 'down' | 'up' | 'longPress'

export type IntentAction =
  | { kind: 'switch'; stateA: string; stateB: string }
  | { kind: 'to'; stateId: string }
  | { kind: 'setTo'; stateId: string }
  | { kind: 'scale'; value: number }

export interface Intent {
  id: string
  layerId: string
  groupId: string
  trigger: IntentTrigger
  action: IntentAction
}
