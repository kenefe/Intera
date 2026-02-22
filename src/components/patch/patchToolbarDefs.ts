// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  patchToolbarDefs —— 工具条 + 拖线菜单数据
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { PatchType } from '@engine/scene/types'

export type AddItem = { type: PatchType; label: string; name: string }
export type AddGroup = { group: string; items: AddItem[] }

export const ADD_GROUPS: AddGroup[] = [
  { group: '触发', items: [
    { type: 'touch',     label: 'Touch', name: 'Touch' },
    { type: 'longPress', label: 'Long',  name: '长按' },
  ]},
  { group: '逻辑', items: [
    { type: 'condition',      label: 'If',     name: '条件' },
    { type: 'toggleVariable', label: 'Toggle', name: 'Toggle' },
    { type: 'delay',          label: 'Delay',  name: '延迟' },
    { type: 'setVariable',    label: 'SetVar', name: 'SetVar' },
  ]},
  { group: '动作', items: [
    { type: 'switch', label: 'Switch', name: '切换' },
    { type: 'to',    label: 'To',    name: 'To' },
    { type: 'setTo', label: 'SetTo', name: 'SetTo' },
  ]},
  { group: '行为', items: [
    { type: 'behaviorDrag',   label: 'Drag',   name: '拖拽行为' },
    { type: 'behaviorScroll', label: 'Scroll', name: '滚动行为' },
    { type: 'transition',     label: 'Trans',  name: '驱动插值' },
  ]},
]

export const WIRE_MENU_TYPES: AddItem[] = [
  { type: 'switch',         label: 'Switch', name: '切换' },
  { type: 'condition',      label: 'If',     name: '条件' },
  { type: 'toggleVariable', label: 'Toggle', name: 'Toggle' },
  { type: 'delay',          label: 'Delay',  name: '延迟' },
  { type: 'to',             label: 'To',     name: 'To' },
  { type: 'setTo',          label: 'SetTo',  name: 'SetTo' },
  { type: 'setVariable',    label: 'SetVar', name: 'SetVar' },
]

export const LAYER_TYPES = new Set<PatchType>(['touch', 'longPress', 'drag', 'behaviorDrag', 'behaviorScroll'])
export const ACTION_TYPES = new Set<PatchType>(['to', 'setTo', 'switch'])
