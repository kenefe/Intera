// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SmartAnimate —— 状态间动画桥梁
//  职责: 对比两个状态 → 生成 folme.to() 调用
//  纯函数模块，零副作用
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AnimatableProps, TransitionConfig, CurveConfig } from './types'
import type { ToConfig, SpecialConfig, IForce, IEasing } from '../folme/types'
import { FolmeEase } from '../folme/FolmeEase'

// ── 可动画数值属性 (fill/stroke 为字符串，不参与弹簧插值) ──

const NUMERIC_KEYS: (keyof AnimatableProps)[] = [
  'x', 'y', 'width', 'height', 'rotation',
  'scaleX', 'scaleY', 'opacity', 'borderRadius', 'strokeWidth',
]

// ── 输出类型 ──

export interface TransitionCall {
  layerId: string
  from: Record<string, number>
  to: Record<string, number>
  config: ToConfig
}

// ── CurveConfig → IForce | IEasing ──

export function curveToEase(c: CurveConfig): IForce | IEasing {
  switch (c.type) {
    case 'spring':   return FolmeEase.spring(c.damping ?? 0.95, c.response ?? 0.35)
    case 'friction': return FolmeEase.friction(c.friction)
    case 'bezier': {
      const cp = c.controlPoints ?? [0.25, 0.1, 0.25, 1]
      return FolmeEase.bezier(cp[0], cp[1], cp[2], cp[3], c.duration)
    }
    case 'linear':   return FolmeEase.linear(c.duration)
  }
}

// ── 数值属性差异 ──

function diffNumeric(
  from: AnimatableProps, to: AnimatableProps,
): { from: Record<string, number>; to: Record<string, number> } | null {
  const f: Record<string, number> = {}
  const t: Record<string, number> = {}
  let changed = false
  for (const k of NUMERIC_KEYS) {
    const fv = from[k] as number, tv = to[k] as number
    if (fv !== tv) { f[k] = fv; t[k] = tv; changed = true }
  }
  return changed ? { from: f, to: t } : null
}

// ── 三级曲线解析: 属性级 > 元素级 > 全局 ──

function buildConfig(layerId: string, tc: TransitionConfig): ToConfig {
  const config: ToConfig = {
    ease: curveToEase(tc.elementCurves?.[layerId] ?? tc.curve),
  }

  // 元素级延迟 (ms → s)
  const elemDelay = tc.delays?.[layerId]
  if (elemDelay !== undefined) config.delay = elemDelay / 1000

  // 属性级覆盖（曲线 override，delay 叠加）
  const pc = tc.propertyCurves?.[layerId]
  const pd = tc.propertyDelays?.[layerId]
  if (pc || pd) {
    config.special = config.special ?? {}
    const allProps = new Set([...Object.keys(pc ?? {}), ...Object.keys(pd ?? {})])
    for (const prop of allProps) {
      const entry: SpecialConfig = config.special[prop] ?? {}
      if (pc?.[prop]) entry.ease = curveToEase(pc[prop])
      if (pd?.[prop]) entry.delay = (config.delay ?? 0) + pd[prop] / 1000
      config.special[prop] = entry
    }
  }

  return config
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  buildTransition —— 主入口
//  对比所有图层在两个状态下的数值差异
//  返回可直接传给 FolmeManager.to() 的调用列表
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildTransition(
  layerIds: string[],
  fromProps: Record<string, AnimatableProps>,
  toProps: Record<string, AnimatableProps>,
  tc: TransitionConfig,
): TransitionCall[] {
  const calls: TransitionCall[] = []
  for (const id of layerIds) {
    const a = fromProps[id], b = toProps[id]
    if (!a || !b) continue
    const diff = diffNumeric(a, b)
    if (!diff) continue
    calls.push({ layerId: id, from: diff.from, to: diff.to, config: buildConfig(id, tc) })
  }
  return calls
}
