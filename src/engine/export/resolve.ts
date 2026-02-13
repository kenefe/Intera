// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  resolve —— 导出模块共享属性解析
//  从原始 Project 数据解析属性 (不依赖 DisplayStateManager)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project, AnimatableProps } from '../scene/types'

/** 解析指定 state + layer 的最终属性 (base + override) */
export function resolveProps(project: Project, stateId: string, layerId: string): AnimatableProps {
  const base = project.layers[layerId]?.props
  if (!base) return defaultProps()
  const state = project.stateGroups.flatMap(g => g.displayStates).find(s => s.id === stateId)
  const overrides = state?.overrides[layerId]
  return overrides ? { ...base, ...overrides } : { ...base }
}

function defaultProps(): AnimatableProps {
  return {
    x: 0, y: 0, width: 100, height: 100, rotation: 0,
    scaleX: 1, scaleY: 1, opacity: 1, borderRadius: 0,
    fill: '#cccccc', stroke: 'none', strokeWidth: 0,
  }
}
