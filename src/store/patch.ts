// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Patch Store —— 交互逻辑中枢
//  职责: 变量 CRUD + Patch 图 CRUD + 运行时执行
//  角色: VariableManager + PatchRuntime 的桥梁
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { defineStore } from 'pinia'
import { watch, reactive } from 'vue'
import type { PatchType, Vec2, Patch, PatchConnection, Variable, VariableValue, ConfigFor } from '../engine/scene/types'
import { VariableManager } from '../engine/state/VariableManager'
import { PatchRuntime } from '../engine/state/PatchRuntime'
import { createPatch } from '../engine/state/PatchDefs'
import { makeId } from '../engine/idFactory'
import * as Sugar from '../engine/state/SugarPresets'
import { useProjectStore } from './project'
import { useCanvasStore } from './canvas'

export const usePatchStore = defineStore('patch', () => {
  const project = useProjectStore()
  const p = project.project
  const previewStateByGroupId = reactive<Record<string, string | null>>({})

  function getPreviewStateId(groupId: string): string | null {
    const group = p.stateGroups.find(g => g.id === groupId)
    if (!group) return null
    const sid = previewStateByGroupId[groupId]
    if (sid && group.displayStates.some(s => s.id === sid)) return sid
    return group.activeDisplayStateId ?? group.displayStates[0]?.id ?? null
  }

  function setPreviewState(groupId: string, stateId: string): void {
    previewStateByGroupId[groupId] = stateId
  }

  function transitionPreviewToState(groupId: string, stateId: string): void {
    const fromId = getPreviewStateId(groupId)
    setPreviewState(groupId, stateId)
    project.transitionFromState(groupId, fromId, stateId)
  }

  function setPreviewToState(groupId: string, stateId: string): void {
    setPreviewState(groupId, stateId)
    project.clearPreviewLiveTransition()
  }

  function resetPreviewStates(): void {
    for (const g of p.stateGroups) {
      const defaultId = g.displayStates[0]?.id ?? null
      previewStateByGroupId[g.id] = defaultId
    }
  }


  const variables = new VariableManager(p.variables)
  const runtime = new PatchRuntime(
    p.patches, p.connections, variables,
    transitionPreviewToState,
    setPreviewToState,
  )

  runtime.onDrive = (layerId, fromId, toId, t) => {
    const from = project.states.getResolvedProps(fromId, layerId)
    const to = project.states.getResolvedProps(toId, layerId)
    if (!from || !to) return
    const fa = from as unknown as Record<string, unknown>
    const ta = to as unknown as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const k of Object.keys(fa)) {
      const a = fa[k], b = ta[k]
      if (typeof a === 'number' && typeof b === 'number')
        out[k] = a + (b - a) * t
    }
    project.previewLiveValues[layerId] = out
  }

  watch(
    () => p.patches.length + p.connections.length * 1000,
    () => { runtime.rebuild(); variables.sync() },
  )


  function addVariable(name: string, type: Variable['type'], defaultValue: VariableValue): Variable {
    project.snapshot()
    const v: Variable = { id: makeId('var'), name, type, defaultValue }
    p.variables.push(v)
    variables.sync()
    return v
  }

  function removeVariable(id: string): void {
    project.snapshot()
    const idx = p.variables.findIndex(v => v.id === id)
    if (idx >= 0) p.variables.splice(idx, 1)
  }

  /** 更新变量属性 (重命名 / 改类型 / 改默认值) */
  function updateVariable(id: string, updates: Partial<Pick<Variable, 'name' | 'type' | 'defaultValue'>>): void {
    project.snapshot()
    const v = p.variables.find(v => v.id === id)
    if (v) Object.assign(v, updates)
  }


  function addPatchNode<T extends PatchType>(
    type: T, pos: Vec2,
    config?: Partial<Omit<ConfigFor<T>, 'type'>>,
    name?: string,
  ): Patch {
    project.snapshot()
    const patch = createPatch(type, pos, config, name)
    p.patches.push(patch)
    runtime.rebuild()
    return patch
  }

  function removePatch(id: string): void {
    project.snapshot()
    const idx = p.patches.findIndex(n => n.id === id)
    if (idx >= 0) p.patches.splice(idx, 1)
    // 就地删除 — 保持数组引用 (PatchRuntime 持有同一引用)
    for (let i = p.connections.length - 1; i >= 0; i--) {
      const c = p.connections[i]
      if (c.fromPatchId === id || c.toPatchId === id) p.connections.splice(i, 1)
    }
    runtime.rebuild()
  }

  function updatePatchPos(id: string, pos: Vec2): void {
    const patch = p.patches.find(n => n.id === id)
    if (patch) Object.assign(patch.position, pos)
  }


  function addConnection(fromId: string, fromPort: string, toId: string, toPort: string): PatchConnection | null {
    // ── 防重复连线 ──
    const dup = p.connections.some(c =>
      c.fromPatchId === fromId && c.fromPortId === fromPort
      && c.toPatchId === toId && c.toPortId === toPort,
    )
    if (dup) return null

    project.snapshot()
    const conn: PatchConnection = {
      id: makeId('conn'),
      fromPatchId: fromId, fromPortId: fromPort,
      toPatchId: toId, toPortId: toPort,
    }
    p.connections.push(conn)
    runtime.rebuild()
    return conn
  }

  function removeConnection(id: string): void {
    project.snapshot()
    const idx = p.connections.findIndex(c => c.id === id)
    if (idx >= 0) p.connections.splice(idx, 1)
    runtime.rebuild()
  }


  function fireTrigger(layerId: string, event: string): void {
    runtime.triggerByLayer(layerId, event)
  }


  /** 解析当前激活的状态组 ID (跟随画布选择) */
  function resolveGroupId(): string | undefined {
    const canvas = useCanvasStore()
    return p.stateGroups.find(g => g.id === canvas.activeGroupId)?.id
      ?? p.stateGroups[0]?.id
  }

  function applyButtonFeedback(layerId: string): void {
    const gid = resolveGroupId()
    if (gid) {
      project.snapshot()
      Sugar.buttonFeedback(project.states, p.patches, p.connections, layerId, gid)
    }
  }

  function applyToggleExpand(layerId: string): void {
    const gid = resolveGroupId()
    if (gid) {
      project.snapshot()
      Sugar.toggleExpand(project.states, p.patches, p.connections, p.variables, layerId, gid)
      variables.sync()
    }
  }

  return {
    variables, runtime,
    previewStateByGroupId, getPreviewStateId, setPreviewState,
    transitionPreviewToState, setPreviewToState, resetPreviewStates,
    addVariable, removeVariable, updateVariable,
    addPatchNode, removePatch, updatePatchPos,
    addConnection, removeConnection,
    fireTrigger,
    applyButtonFeedback, applyToggleExpand,
  }
})
