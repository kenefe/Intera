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

type TransitionGroup = Project['stateGroups'][number]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useTransition(project: Project, states: DisplayStateManager) {
  const folmes = new Map<string, FolmeManager>()
  const previewFolmes = new Map<string, FolmeManager>()
  const liveStateId = ref<string | null>(null)
  const previewLiveStateId = ref<string | null>(null)
  const liveValues = shallowReactive<Record<string, Record<string, number>>>({})
  const previewLiveValues = shallowReactive<Record<string, Record<string, number>>>({})
  let gen = 0
  let previewGen = 0

  /** 清理动画残留 (撤销/重做/加载时调用) */
  function cleanup(): void {
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    for (const k of Object.keys(previewLiveValues)) delete previewLiveValues[k]
    liveStateId.value = null
    previewLiveStateId.value = null
    folmes.clear()
    previewFolmes.clear()
  }

  function clearLiveTransition(): void {
    ++gen
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    liveStateId.value = null
    folmes.forEach(fm => fm.cancel())
  }

  function clearPreviewLiveTransition(): void {
    ++previewGen
    for (const k of Object.keys(previewLiveValues)) delete previewLiveValues[k]
    previewLiveStateId.value = null
    previewFolmes.forEach(fm => fm.cancel())
  }

  function resolveGroup(groupId: string, stateId: string): TransitionGroup | undefined {
    return states.findGroup(groupId)
      ?? project.stateGroups.find(g => g.displayStates.some(s => s.id === stateId))
  }

  function runTransition(
    group: TransitionGroup,
    fromId: string | null,
    toId: string,
    mode: 'editor' | 'preview',
  ): void {
    if (!fromId || fromId === toId) return

    // ── 解析两个状态的图层属性 ──
    //    拖拽 liveValues 优先: 若存在，从当前视觉位置起始动画
    //    这样 drag → 状态转换 的动画会从松手处平滑过渡
    const ids = Object.keys(project.layers)
    const fromP: Record<string, AnimatableProps> = {}
    const toP: Record<string, AnimatableProps> = {}
    for (const id of ids) {
      const resolved = states.getResolvedProps(fromId, id) ?? project.layers[id].props
      const sourceLive = mode === 'editor' ? liveValues[id] : previewLiveValues[id]
      const live = sourceLive
      fromP[id] = live ? { ...resolved, ...live } as AnimatableProps : resolved
      toP[id] = states.getResolvedProps(toId, id) ?? project.layers[id].props
    }

    const ts = states.findState(toId)
    if (!ts) return
    const calls = buildTransition(ids, fromP, toP, ts.transition)

    // 清理旧帧 → 启动新过渡
    const liveBag = mode === 'editor' ? liveValues : previewLiveValues
    const liveState = mode === 'editor' ? liveStateId : previewLiveStateId
    const fmBag = mode === 'editor' ? folmes : previewFolmes
    const cur = mode === 'editor' ? ++gen : ++previewGen
    for (const k of Object.keys(liveBag)) delete liveBag[k]
    liveState.value = calls.length ? toId : null

    for (const c of calls) {
      // 预填 liveValues — 避免切换瞬间一帧闪烁
      const numFrom: Record<string, number> = {}
      for (const [k, v] of Object.entries(c.from)) {
        if (typeof v === 'number') numFrom[k] = v
      }
      liveBag[c.layerId] = numFrom

      let fm = fmBag.get(c.layerId)
      if (!fm) { fm = new FolmeManager(); fmBag.set(c.layerId, fm) }
      fm.setTo(c.from)
      fm.to(c.to, {
        ...c.config,
        onUpdate: (vals) => {
          const latest = mode === 'editor' ? gen : previewGen
          if (cur !== latest) return
          liveBag[c.layerId] = vals
        },
        onComplete: () => {
          const latest = mode === 'editor' ? gen : previewGen
          if (cur !== latest) return
          delete liveBag[c.layerId]
          if (!Object.keys(liveBag).length) liveState.value = null
        },
      })
    }
  }

  /** 带弹簧动画的状态切换 */
  function transitionToState(groupId: string, stateId: string): void {
    const group = resolveGroup(groupId, stateId)
    if (!group) return

    let fromId = group.activeDisplayStateId

    // ── 编辑态泄漏防护: 若已处于目标状态，从默认状态出发 (允许重新触发) ──
    if (fromId === stateId) {
      fromId = group.displayStates[0]?.id ?? null
    }

    group.activeDisplayStateId = stateId
    runTransition(group, fromId, stateId, 'editor')
  }

  /** 预览态切换: 显式指定 from 状态，不污染编辑态 activeDisplayStateId */
  function transitionFromState(groupId: string, fromStateId: string | null, toStateId: string): void {
    const group = resolveGroup(groupId, toStateId)
    if (!group) return
    let fromId = fromStateId
    if (fromId === toStateId) {
      fromId = group.displayStates[0]?.id ?? null
    }
    runTransition(group, fromId, toStateId, 'preview')
  }

  /** 即时跳转状态 — 无弹簧动画 (setTo patch 专用) */
  function setToState(groupId: string, stateId: string): void {
    const group = states.findGroup(groupId)
      ?? project.stateGroups.find(g => g.displayStates.some(s => s.id === stateId))
    if (!group) return
    clearLiveTransition()
    group.activeDisplayStateId = stateId
  }

  return {
    liveStateId, liveValues, previewLiveStateId, previewLiveValues,
    transitionToState, transitionFromState, setToState,
    clearLiveTransition, clearPreviewLiveTransition, cleanup,
  }
}
