// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VariableManager —— 逻辑变量管理
//  职责: get/set/toggle + 变化通知
//  纯 TypeScript，零 UI 依赖
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Variable, VariableValue } from '../scene/types'

type Listener = (value: VariableValue, old: VariableValue) => void

export class VariableManager {
  readonly defs: Variable[]
  private values = new Map<string, VariableValue>()
  private listeners = new Map<string, Set<Listener>>()

  constructor(defs: Variable[]) {
    this.defs = defs
    this.sync()
  }

  /** 从定义同步初始值 (新增变量时重新调用) */
  sync(): void {
    for (const v of this.defs) {
      if (!this.values.has(v.id)) this.values.set(v.id, v.defaultValue)
    }
  }

  get(id: string): VariableValue | undefined { return this.values.get(id) }

  set(id: string, value: VariableValue): void {
    const old = this.values.get(id)
    if (old === value) return
    this.values.set(id, value)
    for (const fn of this.listeners.get(id) ?? []) fn(value, old!)
  }

  toggle(id: string): void {
    const v = this.values.get(id)
    if (typeof v === 'boolean') this.set(id, !v)
  }

  onChange(id: string, fn: Listener): () => void {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set())
    this.listeners.get(id)!.add(fn)
    return () => this.listeners.get(id)?.delete(fn)
  }

  reset(): void {
    for (const v of this.defs) this.set(v.id, v.defaultValue)
  }
}
