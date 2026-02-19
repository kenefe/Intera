// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ComponentResolver —— instance 递归解析
//  职责: 从 instance 图层解析出最终渲染用的子树 + 合并 overrides
//  零 UI 依赖
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Layer, AnimatableProps, ComponentDef } from './types'

// ── 解析结果 ──

export interface ResolvedLayer {
  masterLayerId: string
  props: AnimatableProps
  text?: string
  imageSrc?: string
  children: ResolvedLayer[]
}

// ── 循环检测 ──

function detectCycle(
  componentId: string,
  layers: Record<string, Layer>,
  components: ComponentDef[],
  visited: Set<string>,
): boolean {
  if (visited.has(componentId)) return true
  visited.add(componentId)
  const comp = components.find(c => c.id === componentId)
  if (!comp) return false
  const stack = [comp.rootLayerId]
  while (stack.length) {
    const lid = stack.pop()!
    const layer = layers[lid]
    if (!layer) continue
    if (layer.type === 'instance' && layer.componentId) {
      if (detectCycle(layer.componentId, layers, components, visited)) return true
    }
    stack.push(...layer.childrenIds)
  }
  visited.delete(componentId)
  return false
}

/** 检查将 componentId 放入 targetParent 是否会形成循环 */
export function wouldCycle(
  componentId: string,
  layers: Record<string, Layer>,
  components: ComponentDef[],
): boolean {
  return detectCycle(componentId, layers, components, new Set())
}

// ── 解析 instance ──

type Overrides = Record<string, Partial<AnimatableProps & { text?: string; imageSrc?: string }>>

export function resolveInstance(
  instance: Layer,
  layers: Record<string, Layer>,
  components: ComponentDef[],
  depth = 0,
): ResolvedLayer[] {
  if (depth > 10 || instance.type !== 'instance' || !instance.componentId) return []
  const comp = components.find(c => c.id === instance.componentId)
  if (!comp) return []
  const root = layers[comp.rootLayerId]
  if (!root) return []
  const ov = instance.instanceOverrides ?? {}
  return [resolveLayer(root, ov, layers, components, depth)]
}

function resolveLayer(
  layer: Layer,
  overrides: Overrides,
  layers: Record<string, Layer>,
  components: ComponentDef[],
  depth: number,
): ResolvedLayer {
  const ov = overrides[layer.id]
  const props = { ...layer.props }
  let text = layer.text
  let imageSrc = layer.imageSrc

  if (ov) {
    for (const [k, v] of Object.entries(ov)) {
      if (k === 'text') text = v as string
      else if (k === 'imageSrc') imageSrc = v as string
      else if (k in props) (props as Record<string, unknown>)[k] = v
    }
  }

  const children: ResolvedLayer[] = []
  for (const cid of layer.childrenIds) {
    const child = layers[cid]
    if (!child) continue
    if (child.type === 'instance') {
      const nested = resolveInstance(child, layers, components, depth + 1)
      children.push(...nested)
    } else {
      children.push(resolveLayer(child, overrides, layers, components, depth))
    }
  }

  return { masterLayerId: layer.id, props, text, imageSrc, children }
}
