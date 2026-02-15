// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SceneGraph —— 图层树操作
//  职责: 增删改查图层、父子关系、重排序
//  数据结构: 扁平 Map + 有序 ID 数组
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Layer, LayerType, AnimatableProps, LayoutProps } from './types'
import { makeId, syncIdCounter } from '../idFactory'

// ── 默认值工厂 ──

function defaultProps(): AnimatableProps {
  return {
    x: 0, y: 0, width: 100, height: 100,
    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
    borderRadius: 0, fill: '#D9D9D9', stroke: 'none', strokeWidth: 0,
  }
}

function defaultLayout(): LayoutProps {
  return {
    layout: 'free', gap: 0, padding: [0, 0, 0, 0],
    alignItems: 'start', justifyContent: 'start', clipContent: false,
    widthMode: 'fixed', heightMode: 'fixed',
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SceneGraph
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SceneGraph {
  private map: Record<string, Layer>
  private rootIds: string[]

  constructor(layers: Record<string, Layer>, rootIds: string[]) {
    this.map = layers
    this.rootIds = rootIds
  }

  /** 同步 ID 计数器 — 项目加载后必须调用 */
  syncIdCounter(): void { syncIdCounter(Object.keys(this.map)) }

  // ── 查询 ──

  /** 按 ID 获取图层 */
  get(id: string): Layer | undefined { return this.map[id] }

  /** 获取子图层 (有序) */
  children(parentId: string): Layer[] {
    const ids = this.map[parentId]?.childrenIds ?? []
    return ids.map(id => this.map[id]).filter((l): l is Layer => !!l)
  }

  /** 获取根图层 (有序) */
  getRoots(): Layer[] {
    return this.rootIds.map(id => this.map[id]).filter((l): l is Layer => !!l)
  }

  /** 获取父图层 */
  parent(id: string): Layer | null {
    const pid = this.map[id]?.parentId
    return pid ? this.map[pid] ?? null : null
  }

  /** 获取所有后代 ID (迭代, 不含自身) */
  descendants(id: string): string[] {
    const result: string[] = []
    const stack = [...(this.map[id]?.childrenIds ?? [])]
    while (stack.length) {
      const cid = stack.pop()!
      result.push(cid)
      const kids = this.map[cid]?.childrenIds
      if (kids) stack.push(...kids)
    }
    return result
  }

  // ── 变更 ──

  /** 创建并添加图层 */
  add(type: LayerType, parentId: string | null = null, index?: number, name?: string): Layer {
    const id = makeId('layer')
    const layer: Layer = {
      id, name: name ?? `${type}_${id}`, type,
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: defaultProps(), layoutProps: defaultLayout(),
    }
    this.map[id] = layer
    this.attach(id, parentId, index)
    return layer
  }

  /** 删除图层 (含所有后代) */
  remove(id: string): void {
    const descs = this.descendants(id)
    this.detach(id)
    for (const d of descs) delete this.map[d]
    delete this.map[id]
  }

  /** 移动图层 (变更父级 / 重排序) */
  move(id: string, newParentId: string | null, index?: number): void {
    if (!this.map[id]) return
    if (newParentId !== null && this.isAncestor(id, newParentId)) return
    this.detach(id)
    this.attach(id, newParentId, index)
  }

  // ── 内部方法 ──

  /** 从当前父级摘除 */
  private detach(id: string): void {
    const layer = this.map[id]
    if (!layer) return
    const arr = layer.parentId ? this.map[layer.parentId]?.childrenIds : this.rootIds
    if (arr) {
      const idx = arr.indexOf(id)
      if (idx >= 0) arr.splice(idx, 1)
    }
  }

  /** 插入到新父级 */
  private attach(id: string, parentId: string | null, index?: number): void {
    const layer = this.map[id]
    if (!layer) return
    layer.parentId = parentId
    const arr = parentId ? this.map[parentId]?.childrenIds : this.rootIds
    if (!arr) return
    const i = index !== undefined ? Math.min(index, arr.length) : arr.length
    arr.splice(i, 0, id)
  }

  /** ancestor 是否为 child 的祖先 (含自身) */
  private isAncestor(ancestor: string, child: string): boolean {
    let cur: string | null = child
    while (cur) {
      if (cur === ancestor) return true
      cur = this.map[cur]?.parentId ?? null
    }
    return false
  }
}
