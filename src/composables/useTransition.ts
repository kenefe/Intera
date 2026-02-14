// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useTransition —— 弹簧动画过渡
//  职责: 状态间差异过渡 (FolmeManager 驱动)
//  从 project store 拆分，保持单一职责
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, shallowReactive } from 'vue'
import type { Project, AnimatableProps } from '@engine/scene/types'
import type { DisplayStateManager } from '@engine/scene/DisplayState'
import { FolmeManager } from '@engine/folme/FolmeManager'
import { buildTransition } from '@engine/scene/SmartAnimate'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useTransition(project: Project, states: DisplayStateManager) {
  const folmes = new Map<string, FolmeManager>()
  const liveStateId = ref<string | null>(null)
  const liveValues = shallowReactive<Record<string, Record<string, number>>>({})
  let gen = 0

  /** 清理动画残留 (撤销/重做/加载时调用) */
  function cleanup(): void {
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    liveStateId.value = null
    folmes.clear()
  }

  /** 带弹簧动画的状态切换 */
  function transitionToState(groupId: string, stateId: string): void {
    const group = states.findGroup(groupId)
      ?? project.stateGroups.find(g => g.displayStates.some(s => s.id === stateId))
    if (!group) return
    const fromId = group.activeDisplayStateId
    group.activeDisplayStateId = stateId
    if (!fromId || fromId === stateId) return

    // 解析两个状态的图层属性
    const ids = Object.keys(project.layers)
    const fromP: Record<string, AnimatableProps> = {}
    const toP: Record<string, AnimatableProps> = {}
    for (const id of ids) {
      fromP[id] = states.getResolvedProps(fromId, id) ?? project.layers[id].props
      toP[id] = states.getResolvedProps(stateId, id) ?? project.layers[id].props
    }

    const ts = states.findState(stateId)
    if (!ts) return
    const calls = buildTransition(ids, fromP, toP, ts.transition)

    // 清理旧帧 → 启动新过渡
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    const cur = ++gen
    liveStateId.value = calls.length ? stateId : null

    for (const c of calls) {
      // 预填 liveValues — 避免切换瞬间一帧闪烁
      const numFrom: Record<string, number> = {}
      for (const [k, v] of Object.entries(c.from)) {
        if (typeof v === 'number') numFrom[k] = v
      }
      liveValues[c.layerId] = numFrom

      let fm = folmes.get(c.layerId)
      if (!fm) { fm = new FolmeManager(); folmes.set(c.layerId, fm) }
      fm.setTo(c.from)
      fm.to(c.to, {
        ...c.config,
        onUpdate: (vals) => {
          if (cur !== gen) return
          liveValues[c.layerId] = vals
        },
        onComplete: () => {
          if (cur !== gen) return
          delete liveValues[c.layerId]
          if (!Object.keys(liveValues).length) liveStateId.value = null
        },
      })
    }
  }

  /** 即时跳转状态 — 无弹簧动画 (setTo patch 专用) */
  function setToState(groupId: string, stateId: string): void {
    const group = states.findGroup(groupId)
      ?? project.stateGroups.find(g => g.displayStates.some(s => s.id === stateId))
    if (!group) return
    ++gen
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    liveStateId.value = null
    folmes.forEach(fm => fm.cancel())
    group.activeDisplayStateId = stateId
  }

  return { liveStateId, liveValues, transitionToState, setToState, cleanup }
}
