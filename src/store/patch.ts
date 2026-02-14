// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Patch Store —— 交互逻辑中枢
//  职责: 变量 CRUD + Patch 图 CRUD + 运行时执行
//  角色: VariableManager + PatchRuntime 的桥梁
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { defineStore } from 'pinia'
import type { PatchType, Vec2, Patch, PatchConnection, Variable, VariableValue } from '../engine/scene/types'
import { VariableManager } from '../engine/state/VariableManager'
import { PatchRuntime } from '../engine/state/PatchRuntime'
import { createPatch } from '../engine/state/PatchDefs'
import * as Sugar from '../engine/state/SugarPresets'
import { useProjectStore } from './project'

export const usePatchStore = defineStore('patch', () => {
  const project = useProjectStore()
  const p = project.project

  // ── 引擎实例 ──

  const variables = new VariableManager(p.variables)
  const runtime = new PatchRuntime(
    p.patches, p.connections, variables,
    (gid, sid) => project.transitionToState(gid, sid),
    (gid, sid) => project.setToState(gid, sid),
  )

  // ── 变量 CRUD ──

  function addVariable(name: string, type: Variable['type'], defaultValue: VariableValue): Variable {
    project.snapshot()
    const v: Variable = { id: `var_${Date.now()}`, name, type, defaultValue }
    p.variables.push(v)
    variables.sync()
    return v
  }

  function removeVariable(id: string): void {
    project.snapshot()
    const idx = p.variables.findIndex(v => v.id === id)
    if (idx >= 0) p.variables.splice(idx, 1)
  }

  // ── Patch CRUD ──

  function addPatchNode(type: PatchType, pos: Vec2, config?: Record<string, unknown>, name?: string): Patch {
    project.snapshot()
    const patch = createPatch(type, pos, config, name)
    p.patches.push(patch)
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
  }

  function updatePatchPos(id: string, pos: Vec2): void {
    const patch = p.patches.find(n => n.id === id)
    if (patch) Object.assign(patch.position, pos)
  }

  // ── 连线 CRUD ──

  function addConnection(fromId: string, fromPort: string, toId: string, toPort: string): PatchConnection | null {
    // ── 防重复连线 ──
    const dup = p.connections.some(c =>
      c.fromPatchId === fromId && c.fromPortId === fromPort
      && c.toPatchId === toId && c.toPortId === toPort,
    )
    if (dup) return null

    project.snapshot()
    const conn: PatchConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromPatchId: fromId, fromPortId: fromPort,
      toPatchId: toId, toPortId: toPort,
    }
    p.connections.push(conn)
    return conn
  }

  function removeConnection(id: string): void {
    project.snapshot()
    const idx = p.connections.findIndex(c => c.id === id)
    if (idx >= 0) p.connections.splice(idx, 1)
  }

  // ── 触发 ──

  function fireTrigger(layerId: string, event: string): void {
    runtime.triggerByLayer(layerId, event)
  }

  // ── Sugar 预设 ──

  function applyButtonFeedback(layerId: string): void {
    const gid = p.stateGroups[0]?.id
    if (gid) {
      project.snapshot()
      Sugar.buttonFeedback(project.states, p.patches, p.connections, layerId, gid)
    }
  }

  function applyToggleExpand(layerId: string): void {
    const gid = p.stateGroups[0]?.id
    if (gid) {
      project.snapshot()
      Sugar.toggleExpand(project.states, p.patches, p.connections, p.variables, layerId, gid)
      variables.sync()
    }
  }

  return {
    variables, runtime,
    addVariable, removeVariable,
    addPatchNode, removePatch, updatePatchPos,
    addConnection, removeConnection,
    fireTrigger,
    applyButtonFeedback, applyToggleExpand,
  }
})
