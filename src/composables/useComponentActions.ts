// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useComponentActions —— 组件 CRUD
//  职责: createComponent / createInstance / updateOverride / detach
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project, ComponentDef, AnimatableProps, Layer } from '../engine/scene/types'
import { makeId } from '../engine/idFactory'
import { wouldCycle } from '../engine/scene/ComponentResolver'

type OverrideVal = Partial<AnimatableProps & { text?: string; imageSrc?: string }>

export function useComponentActions(project: Project) {

  function createComponent(frameLayerId: string, name?: string): ComponentDef | undefined {
    const layer = project.layers[frameLayerId]
    if (!layer || (layer.type !== 'frame' && layer.type !== 'group')) return undefined

    const sg = project.stateGroups.find(g => g.rootLayerId === frameLayerId)
    if (!sg) return undefined

    const comp: ComponentDef = {
      id: makeId('comp'),
      name: name ?? layer.name,
      rootLayerId: frameLayerId,
      stateGroupId: sg.id,
      patchIds: [],
      exposedProps: {},
    }
    project.components.push(comp)
    return comp
  }

  function createInstance(componentId: string, parentId: string | null, index?: number): Layer | undefined {
    if (wouldCycle(componentId, project.layers, project.components)) return undefined
    const comp = project.components.find(c => c.id === componentId)
    if (!comp) return undefined
    const master = project.layers[comp.rootLayerId]
    if (!master) return undefined

    const id = makeId('layer')
    const inst: Layer = {
      id, name: `${comp.name} (instance)`, type: 'instance',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: { ...master.props }, layoutProps: { ...master.layoutProps },
      componentId, instanceOverrides: {},
    }
    project.layers[id] = inst

    // 挂到父级
    if (parentId && project.layers[parentId]) {
      inst.parentId = parentId
      const parent = project.layers[parentId]
      const idx = index ?? parent.childrenIds.length
      parent.childrenIds.splice(idx, 0, id)
    } else {
      const idx = index ?? project.rootLayerIds.length
      project.rootLayerIds.splice(idx, 0, id)
    }
    return inst
  }

  function updateInstanceOverride(instanceId: string, masterLayerId: string, props: OverrideVal): void {
    const inst = project.layers[instanceId]
    if (!inst || inst.type !== 'instance') return
    if (!inst.instanceOverrides) inst.instanceOverrides = {}
    inst.instanceOverrides[masterLayerId] = {
      ...(inst.instanceOverrides[masterLayerId] ?? {}),
      ...props,
    }
  }

  function detachComponent(componentId: string): void {
    const idx = project.components.findIndex(c => c.id === componentId)
    if (idx >= 0) project.components.splice(idx, 1)
  }

  return { createComponent, createInstance, updateInstanceOverride, detachComponent }
}
