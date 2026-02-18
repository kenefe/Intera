// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Project Store —— 项目数据中枢
//  职责: 持有项目数据，协调 SceneGraph + DisplayStateManager
//  角色: UI 层与 Engine 层之间的桥梁
//  动画过渡已拆分至 composables/useTransition.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { reactive, ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Project, Layer, LayerType,
  AnimatableProps, DisplayState, StateGroup,
} from '../engine/scene/types'
import { SceneGraph } from '../engine/scene/SceneGraph'
import { DisplayStateManager } from '../engine/scene/DisplayState'
import { UndoManager } from '../engine/UndoManager'
import { saveToLocal, loadFromLocal, saveToFile, loadFromFile } from '../engine/ProjectStorage'
import { useTransition } from '../composables/useTransition'

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
  for (const ds of project.stateGroups.flatMap(g => g.displayStates)) {
    for (const lid of set) delete ds.overrides[lid]
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useProjectStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useProjectStore = defineStore('project', () => {
  const project = reactive<Project>(createEmptyProject())
  const scene = new SceneGraph(project.layers, project.rootLayerIds)
  const states = new DisplayStateManager(project.stateGroups, project.layers)
  const transition = useTransition(project, states)

  const history = new UndoManager<string>(50)
  const historyVersion = ref(0)

  const canUndo = computed(() => { historyVersion.value; return history.canUndo })
  const canRedo = computed(() => { historyVersion.value; return history.canRedo })

  function snapshot(): void {
    history.push(JSON.stringify(project))
    historyVersion.value++
  }

  /** 就地恢复 — splice/delete+assign 保持 reactive 引用不断 */
  function restoreFromJSON(json: string): void {
    const snap: Project = JSON.parse(json)
    for (const key of Object.keys(project.layers)) delete project.layers[key]
    Object.assign(project.layers, snap.layers)
    project.rootLayerIds.splice(0, Infinity, ...snap.rootLayerIds)
    project.stateGroups.splice(0, Infinity, ...snap.stateGroups)
    project.variables.splice(0, Infinity, ...snap.variables)
    project.patches.splice(0, Infinity, ...snap.patches)
    project.connections.splice(0, Infinity, ...snap.connections)
    project.name = snap.name
    project.id = snap.id
    project.canvasSize.width = snap.canvasSize.width
    project.canvasSize.height = snap.canvasSize.height
    scene.syncIdCounter()
    transition.cleanup()
  }

  function undo(): boolean {
    const prev = history.undo(JSON.stringify(project))
    if (prev) { restoreFromJSON(prev); historyVersion.value++; return true }
    return false
  }

  function redo(): boolean {
    const next = history.redo(JSON.stringify(project))
    if (next) { restoreFromJSON(next); historyVersion.value++; return true }
    return false
  }


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


  function addStateGroup(name: string, rootLayerId: string | null = null): StateGroup {
    snapshot()
    return states.addGroup(name, rootLayerId)
  }

  function removeStateGroup(groupId: string): void { snapshot(); states.removeGroup(groupId) }

  function addDisplayState(groupId: string, name: string): DisplayState | undefined {
    snapshot()
    return states.addState(groupId, name)
  }

  function removeDisplayState(groupId: string, stateId: string): void {
    snapshot(); states.removeState(groupId, stateId)
  }

  function switchState(groupId: string, stateId: string | null): void {
    snapshot()
    const group = states.findGroup(groupId)
    if (group) group.activeDisplayStateId = stateId
  }


  function updateLayerProps(id: string, props: Partial<AnimatableProps>): void {
    const layer = project.layers[id]
    if (layer) Object.assign(layer.props, props)
  }

  function setOverride(stateId: string, layerId: string, props: Partial<AnimatableProps>): void {
    states.setOverride(stateId, layerId, props)
  }

  function clearOverride(stateId: string, layerId: string, prop?: keyof AnimatableProps): void {
    states.clearOverride(stateId, layerId, prop)
  }

  return {
    project, scene, states,
    liveStateId: transition.liveStateId,
    liveValues: transition.liveValues,
    previewLiveStateId: transition.previewLiveStateId,
    previewLiveValues: transition.previewLiveValues,
    canUndo, canRedo, snapshot, undo, redo,
    save, saveFile, openFile, loadSaved,
    addLayer, removeLayer, moveLayer, updateLayerProps,
    addStateGroup, removeStateGroup,
    addDisplayState, removeDisplayState, switchState,
    transitionToState: transition.transitionToState,
    transitionFromState: transition.transitionFromState,
    setToState: transition.setToState,
    clearLiveTransition: transition.clearLiveTransition,
    clearPreviewLiveTransition: transition.clearPreviewLiveTransition,
    setOverride, clearOverride,
  }
})
