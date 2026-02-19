// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  clonePatches —— 为 instance 克隆 master Patch 子图
//  职责: 复制 patch + connection，重映射 layerId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Patch, PatchConnection, Layer, ComponentDef } from '../scene/types'
import { makeId } from '../idFactory'

interface CloneResult {
  patches: Patch[]
  connections: PatchConnection[]
}

/** 为所有 instance 图层克隆 master 的 patch 子图 */
export function clonePatchesForInstances(
  layers: Record<string, Layer>,
  components: ComponentDef[],
  patches: Patch[],
  connections: PatchConnection[],
): CloneResult {
  const extra: CloneResult = { patches: [], connections: [] }

  for (const layer of Object.values(layers)) {
    if (layer.type !== 'instance' || !layer.componentId) continue
    const comp = components.find(c => c.id === layer.componentId)
    if (!comp || comp.patchIds.length === 0) continue
    cloneForInstance(layer.id, comp, patches, connections, extra)
  }
  return extra
}

function cloneForInstance(
  instanceId: string, comp: ComponentDef,
  patches: Patch[], connections: PatchConnection[],
  out: CloneResult,
): void {
  const patchSet = new Set(comp.patchIds)
  const idMap = new Map<string, string>()

  // 克隆 patch 节点
  for (const p of patches) {
    if (!patchSet.has(p.id)) continue
    const newId = makeId('patch')
    idMap.set(p.id, newId)
    const cfg = remapConfig(p.config, comp.rootLayerId, instanceId)
    out.patches.push({ ...p, id: newId, config: cfg })
  }

  // 克隆 connection
  for (const c of connections) {
    const from = idMap.get(c.fromPatchId)
    const to = idMap.get(c.toPatchId)
    if (!from || !to) continue
    out.connections.push({
      id: makeId('conn'),
      fromPatchId: from, fromPortId: c.fromPortId,
      toPatchId: to, toPortId: c.toPortId,
    })
  }
}

function remapConfig(cfg: Patch['config'], masterRoot: string, instanceId: string): Patch['config'] {
  const clone = { ...cfg }
  if ('layerId' in clone && (clone as { layerId?: string }).layerId === masterRoot) {
    (clone as { layerId?: string }).layerId = instanceId
  }
  return clone
}
