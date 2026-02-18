import { computed } from 'vue'
import type { Patch, PatchConfig } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'

export function usePatchNodeConfig(getPatch: () => Patch) {
  const project = useProjectStore()
  const patchStore = usePatchStore()

  const c = () => getPatch().config
  const cfgLayerId = computed(() => { const v = c(); return 'layerId' in v ? (v.layerId as string | undefined) : undefined })
  const cfgGroupId = computed(() => { const v = c(); return 'groupId' in v ? (v.groupId as string | undefined) : undefined })
  const cfgStateId = computed(() => { const v = c(); return 'stateId' in v ? (v.stateId as string | undefined) : undefined })
  const cfgDuration = computed(() => { const v = c(); return v.type === 'delay' ? v.duration : undefined })
  const cfgVariableId = computed(() => { const v = c(); return 'variableId' in v ? (v.variableId as string | undefined) : undefined })
  const cfgCompareValue = computed(() => { const v = c(); return v.type === 'condition' ? v.compareValue : undefined })
  const cfgValue = computed(() => { const v = c(); return v.type === 'setVariable' ? v.value : undefined })
  const cfgAxis = computed(() => { const v = c(); return 'axis' in v ? (v.axis as string | undefined) : undefined })
  const cfgFromStateId = computed(() => { const v = c(); return v.type === 'transition' ? v.fromStateId : undefined })
  const cfgToStateId = computed(() => { const v = c(); return v.type === 'transition' ? v.toStateId : undefined })
  const cfgInputRange = computed(() => { const v = c(); return v.type === 'transition' ? v.inputRange : undefined })

  const layers = computed(() => Object.values(project.project.layers).map(l => ({ id: l.id, name: l.name })))
  const groups = computed(() => project.project.stateGroups.map(g => ({ id: g.id, name: g.name })))
  const states = computed(() => {
    const gid = cfgGroupId.value
    const group = gid ? project.project.stateGroups.find(g => g.id === gid) : null
    return group ? group.displayStates.map(s => ({ id: s.id, name: s.name })) : []
  })
  const vars = computed(() => project.project.variables.map(v => ({ id: v.id, name: v.name })))

  function cfg(): PatchConfig | null {
    return project.project.patches.find(p => p.id === getPatch().id)?.config ?? null
  }

  function onLayerPick(e: Event): void {
    const cc = cfg(); if (cc && 'layerId' in cc) { cc.layerId = (e.target as HTMLSelectElement).value; patchStore.runtime.rebuild() }
  }
  function onGroupPick(e: Event): void {
    const cc = cfg(); if (!cc) return
    const gid = (e.target as HTMLSelectElement).value
    if ('groupId' in cc) cc.groupId = gid || undefined
    if ('stateId' in cc) cc.stateId = undefined
    if (cc.type === 'transition') { cc.fromStateId = undefined; cc.toStateId = undefined }
  }
  function onStatePick(e: Event): void { const cc = cfg(); if (cc && 'stateId' in cc) cc.stateId = (e.target as HTMLSelectElement).value }
  function onDelayChange(e: Event): void { const cc = cfg(); if (cc?.type === 'delay') cc.duration = Number((e.target as HTMLInputElement).value) || 1000 }
  function onVarPick(e: Event): void { const cc = cfg(); if (cc && 'variableId' in cc) cc.variableId = (e.target as HTMLSelectElement).value }

  function parseVal(v: string): string | number | boolean {
    if (v === 'true') return true; if (v === 'false') return false
    if (!isNaN(Number(v)) && v !== '') return Number(v); return v
  }
  function onCompareChange(e: Event): void { const cc = cfg(); if (cc?.type === 'condition') cc.compareValue = parseVal((e.target as HTMLInputElement).value) }
  function onValueChange(e: Event): void { const cc = cfg(); if (cc?.type === 'setVariable') cc.value = parseVal((e.target as HTMLInputElement).value) }
  function onAxisPick(e: Event): void { const cc = cfg(); if (cc && 'axis' in cc) cc.axis = (e.target as HTMLSelectElement).value as 'x' | 'y' | 'both' }
  function onFromStatePick(e: Event): void { const cc = cfg(); if (cc?.type === 'transition') cc.fromStateId = (e.target as HTMLSelectElement).value || undefined }
  function onToStatePick(e: Event): void { const cc = cfg(); if (cc?.type === 'transition') cc.toStateId = (e.target as HTMLSelectElement).value || undefined }
  function onRangeLoChange(e: Event): void { const cc = cfg(); if (cc?.type === 'transition') { cc.inputRange = [Number((e.target as HTMLInputElement).value) || 0, cc.inputRange?.[1] ?? 1] } }
  function onRangeHiChange(e: Event): void { const cc = cfg(); if (cc?.type === 'transition') { cc.inputRange = [cc.inputRange?.[0] ?? 0, Number((e.target as HTMLInputElement).value) || 1] } }
  function onAddVar(): void {
    const n = vars.value.length
    const v = patchStore.addVariable(n === 0 ? 'isToggled' : `isToggled_${n + 1}`, 'boolean', false)
    const cc = cfg(); if (cc && 'variableId' in cc) cc.variableId = v.id
  }

  return {
    cfgLayerId, cfgGroupId, cfgStateId, cfgDuration, cfgVariableId,
    cfgCompareValue, cfgValue, cfgAxis, cfgFromStateId, cfgToStateId, cfgInputRange,
    layers, groups, states, vars,
    onLayerPick, onGroupPick, onStatePick, onDelayChange, onVarPick,
    onCompareChange, onValueChange, onAxisPick, onFromStatePick, onToStatePick,
    onRangeLoChange, onRangeHiChange, onAddVar,
  }
}
