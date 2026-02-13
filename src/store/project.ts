// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Project Store —— 项目数据中枢
//  职责: 持有项目数据，协调 SceneGraph + DisplayStateManager
//  角色: UI 层与 Engine 层之间的桥梁
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { reactive, shallowReactive, ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Project, Layer, LayerType,
  AnimatableProps, DisplayState, StateGroup,
} from '../engine/scene/types'
import { SceneGraph } from '../engine/scene/SceneGraph'
import { DisplayStateManager } from '../engine/scene/DisplayState'
import { FolmeManager } from '../engine/folme/FolmeManager'
import { buildTransition } from '../engine/scene/SmartAnimate'
import { UndoManager } from '../engine/UndoManager'
import { saveToLocal, loadFromLocal, saveToFile, loadFromFile } from '../engine/ProjectStorage'

// ── 空项目工厂 ──

function createEmptyProject(): Project {
  return {
    id: 'project_1',
    name: '未命名项目',
    canvasSize: { width: 375, height: 812 },
    layers: {},
    rootLayerIds: [],
    stateGroups: [{
      id: 'group_main',
      name: '主画面',
      rootLayerId: null,
      displayStates: [{
        id: 'state_default',
        name: '默认',
        overrides: {},
        transition: { curve: { type: 'spring', damping: 0.95, response: 0.35 } },
      }],
      activeDisplayStateId: 'state_default',
    }],
    variables: [],
    patches: [],
    connections: [],
  }
}

// ── 覆盖清理 (删除图层时级联清理所有状态中的引用) ──

function cleanOverrides(project: Project, layerIds: string[]): void {
  const set = new Set(layerIds)
  const allStates = project.stateGroups.flatMap(g => g.displayStates)
  for (const ds of allStates) {
    for (const lid of set) delete ds.overrides[lid]
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useProjectStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useProjectStore = defineStore('project', () => {
  const project = reactive<Project>(createEmptyProject())

  // 引擎实例 — 直接操作 reactive 数据，Vue 自动追踪变更
  const scene = new SceneGraph(project.layers, project.rootLayerIds)
  const states = new DisplayStateManager(project.stateGroups, project.layers)

  // ═══════════════════════════════════
  //  撤销 / 重做
  // ═══════════════════════════════════

  const history = new UndoManager<string>(50)
  const historyVersion = ref(0)

  const canUndo = computed(() => { historyVersion.value; return history.canUndo })
  const canRedo = computed(() => { historyVersion.value; return history.canRedo })

  /** 拍快照 — 在每次结构性操作前调用 */
  function snapshot(): void {
    history.push(JSON.stringify(project))
    historyVersion.value++
  }

  /**
   * 就地恢复项目数据
   * 关键: splice / delete+assign 保持 reactive proxy 引用不断
   * SceneGraph 和 DisplayStateManager 无需重建
   */
  function restoreFromJSON(json: string): void {
    const snap: Project = JSON.parse(json)

    // 图层字典 — 清空后重新填充
    for (const key of Object.keys(project.layers)) delete project.layers[key]
    Object.assign(project.layers, snap.layers)

    // 数组 — splice 保留引用
    project.rootLayerIds.splice(0, Infinity, ...snap.rootLayerIds)
    project.stateGroups.splice(0, Infinity, ...snap.stateGroups)
    project.variables.splice(0, Infinity, ...snap.variables)
    project.patches.splice(0, Infinity, ...snap.patches)
    project.connections.splice(0, Infinity, ...snap.connections)

    // 标量
    project.name = snap.name
    project.id = snap.id
    project.canvasSize.width = snap.canvasSize.width
    project.canvasSize.height = snap.canvasSize.height

    // 清理动画残留
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    liveStateId.value = null
    folmes.clear()
  }

  function undo(): void {
    const prev = history.undo(JSON.stringify(project))
    if (prev) { restoreFromJSON(prev); historyVersion.value++ }
  }

  function redo(): void {
    const next = history.redo(JSON.stringify(project))
    if (next) { restoreFromJSON(next); historyVersion.value++ }
  }

  // ═══════════════════════════════════
  //  持久化
  // ═══════════════════════════════════

  function save(): void { saveToLocal(project) }
  async function saveFile(): Promise<void> { await saveToFile(project) }

  async function openFile(): Promise<boolean> {
    const data = await loadFromFile()
    if (!data) return false
    snapshot()
    restoreFromJSON(JSON.stringify(data))
    return true
  }

  function loadSaved(): boolean {
    const data = loadFromLocal()
    if (!data) return false
    restoreFromJSON(JSON.stringify(data))
    history.clear()
    return true
  }

  // ═══════════════════════════════════
  //  图层操作
  // ═══════════════════════════════════

  function addLayer(
    type: LayerType, parentId: string | null = null, index?: number, name?: string,
  ): Layer {
    snapshot()
    return scene.add(type, parentId, index, name)
  }

  function removeLayer(id: string): void {
    snapshot()
    cleanOverrides(project, [id, ...scene.descendants(id)])
    scene.remove(id)
  }

  function moveLayer(id: string, parentId: string | null, index?: number): void {
    snapshot()
    scene.move(id, parentId, index)
  }

  // ═══════════════════════════════════
  //  状态组操作
  // ═══════════════════════════════════

  function addStateGroup(name: string, rootLayerId: string | null = null): StateGroup {
    snapshot()
    return states.addGroup(name, rootLayerId)
  }

  function removeStateGroup(groupId: string): void {
    snapshot()
    states.removeGroup(groupId)
  }

  // ═══════════════════════════════════
  //  显示状态操作
  // ═══════════════════════════════════

  function addDisplayState(groupId: string, name: string): DisplayState | undefined {
    snapshot()
    return states.addState(groupId, name)
  }

  function removeDisplayState(groupId: string, stateId: string): void {
    snapshot()
    states.removeState(groupId, stateId)
  }

  function switchState(groupId: string, stateId: string | null): void {
    snapshot()
    const group = states.findGroup(groupId)
    if (group) group.activeDisplayStateId = stateId
  }

  // ═══════════════════════════════════
  //  图层属性 (不自动快照 — 连续操作由调用方负责)
  // ═══════════════════════════════════

  function updateLayerProps(id: string, props: Partial<AnimatableProps>): void {
    const layer = project.layers[id]
    if (layer) Object.assign(layer.props, props)
  }

  // ═══════════════════════════════════
  //  属性覆盖 (不自动快照 — 同上)
  // ═══════════════════════════════════

  function setOverride(stateId: string, layerId: string, props: Partial<AnimatableProps>): void {
    states.setOverride(stateId, layerId, props)
  }

  function clearOverride(stateId: string, layerId: string, prop?: keyof AnimatableProps): void {
    states.clearOverride(stateId, layerId, prop)
  }

  // ═══════════════════════════════════
  //  动画过渡
  // ═══════════════════════════════════

  const folmes = new Map<string, FolmeManager>()
  const liveStateId = ref<string | null>(null)
  const liveValues = shallowReactive<Record<string, Record<string, number>>>({})
  let transitionGen = 0

  /** 带弹簧动画的状态切换 (不自动快照 — 预览模式下由 Patch 触发) */
  function transitionToState(groupId: string, stateId: string): void {
    const group = states.findGroup(groupId)
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

    // 清理旧动画帧
    for (const k of Object.keys(liveValues)) delete liveValues[k]
    const gen = ++transitionGen
    liveStateId.value = calls.length ? stateId : null

    for (const c of calls) {
      // 同步预填 liveValues — 避免 syncLayers 渲染目标状态后一帧闪烁
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
          if (gen !== transitionGen) return
          liveValues[c.layerId] = vals
        },
        onComplete: () => {
          if (gen !== transitionGen) return
          delete liveValues[c.layerId]
          if (!Object.keys(liveValues).length) liveStateId.value = null
        },
      })
    }
  }

  return {
    project,
    scene,
    states,
    liveStateId,
    liveValues,
    // 撤销 / 重做
    canUndo, canRedo, snapshot, undo, redo,
    // 持久化
    save, saveFile, openFile, loadSaved,
    // 操作
    addLayer, removeLayer, moveLayer, updateLayerProps,
    addStateGroup, removeStateGroup,
    addDisplayState, removeDisplayState, switchState, transitionToState,
    setOverride, clearOverride,
  }
})
