// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DisplayStateManager —— 显示状态管理
//  职责: 状态组增删、属性覆盖、关键属性标记、合并读取
//  核心: 共享图层树 + override 差异存储
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  Layer, AnimatableProps, DisplayState,
  StateGroup, TransitionConfig,
} from './types'
import { makeId } from '../idFactory'

// ── 默认过渡配置 ──

function defaultTransition(): TransitionConfig {
  return { curve: { type: 'spring', damping: 0.95, response: 0.35 } }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DisplayStateManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DisplayStateManager {
  private groups: StateGroup[]
  private layers: Record<string, Layer>

  constructor(groups: StateGroup[], layers: Record<string, Layer>) {
    this.groups = groups
    this.layers = layers
  }

  // ── 查找 ──

  /** 按 ID 查找状态组 */
  findGroup(groupId: string): StateGroup | undefined {
    return this.groups.find(g => g.id === groupId)
  }

  /** 按 ID 查找显示状态 (跨组搜索) */
  findState(stateId: string): DisplayState | undefined {
    for (const g of this.groups) {
      const s = g.displayStates.find(ds => ds.id === stateId)
      if (s) return s
    }
    return undefined
  }

  // ── 状态组操作 ──

  /** 创建状态组 */
  addGroup(name: string, rootLayerId: string | null = null): StateGroup {
    const group: StateGroup = {
      id: makeId('group'), name, rootLayerId,
      displayStates: [], activeDisplayStateId: null,
    }
    this.groups.push(group)
    return group
  }

  /** 删除状态组 */
  removeGroup(groupId: string): void {
    const idx = this.groups.findIndex(g => g.id === groupId)
    if (idx >= 0) this.groups.splice(idx, 1)
  }

  // ── 显示状态操作 ──

  /** 在指定组内创建显示状态 */
  addState(groupId: string, name: string): DisplayState | undefined {
    const group = this.findGroup(groupId)
    if (!group) return undefined
    const state: DisplayState = {
      id: makeId('state'), name, overrides: {}, transition: defaultTransition(),
    }
    group.displayStates.push(state)
    return state
  }

  /** 删除显示状态 (默认状态不可删除) */
  removeState(groupId: string, stateId: string): void {
    const group = this.findGroup(groupId)
    if (!group) return
    if (group.displayStates[0]?.id === stateId) return
    group.displayStates = group.displayStates.filter(s => s.id !== stateId)
    if (group.activeDisplayStateId === stateId) group.activeDisplayStateId = null
  }

  // ── 属性覆盖 (关键属性) ──

  /** 设置覆盖: 标记关键属性 */
  setOverride(stateId: string, layerId: string, props: Partial<AnimatableProps>): void {
    const state = this.findState(stateId)
    if (!state) return
    state.overrides[layerId] = { ...state.overrides[layerId], ...props }
  }

  /** 清除覆盖: 取消关键属性 (不指定 prop 则清除该图层全部覆盖) */
  clearOverride(stateId: string, layerId: string, prop?: keyof AnimatableProps): void {
    const state = this.findState(stateId)
    if (!state?.overrides[layerId]) return
    if (!prop) { delete state.overrides[layerId]; return }
    delete state.overrides[layerId][prop]
    if (!Object.keys(state.overrides[layerId]).length) delete state.overrides[layerId]
  }

  // ── 查询 ──

  /** 合并读取: 基础 props + 状态覆盖 → 完整属性 */
  getResolvedProps(stateId: string, layerId: string): AnimatableProps | undefined {
    const layer = this.layers[layerId]
    if (!layer) return undefined
    const overrides = this.findState(stateId)?.overrides[layerId]
    return overrides ? { ...layer.props, ...overrides } : { ...layer.props }
  }

  /** 获取某状态下某图层的覆盖 */
  getOverrides(stateId: string, layerId: string): Partial<AnimatableProps> {
    return this.findState(stateId)?.overrides[layerId] ?? {}
  }

  /** 获取某状态的关键图层列表 (有覆盖的图层) */
  getKeyLayers(stateId: string): string[] {
    return Object.keys(this.findState(stateId)?.overrides ?? {})
  }

  /** 获取某图层在某状态中的关键属性列表 */
  getKeyProps(stateId: string, layerId: string): (keyof AnimatableProps)[] {
    const ov = this.findState(stateId)?.overrides[layerId]
    return ov ? Object.keys(ov) as (keyof AnimatableProps)[] : []
  }
}
