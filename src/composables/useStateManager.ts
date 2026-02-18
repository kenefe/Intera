import { ref, computed, reactive, nextTick } from 'vue'
import type { MenuItem } from '../components/ContextMenu.vue'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import { useActiveGroup } from '@/composables/useActiveGroup'

export function useStateManager() {
  const store = useProjectStore()
  const canvas = useCanvasStore()
  const { activeGroup } = useActiveGroup()

  const groups = computed(() => store.project.stateGroups)
  const displayStates = computed(() => activeGroup.value?.displayStates ?? [])
  const activeId = computed(() => activeGroup.value?.activeDisplayStateId)

  function onSwitchState(id: string): void {
    if (!activeGroup.value || id === activeId.value) return
    store.transitionToState(activeGroup.value.id, id)
  }
  function onAddState(): void {
    if (!activeGroup.value) return
    store.addDisplayState(activeGroup.value.id, `状态 ${displayStates.value.length + 1}`)
  }
  function onDeleteState(id: string): void {
    if (!activeGroup.value || displayStates.value.length <= 1) return
    store.removeDisplayState(activeGroup.value.id, id)
  }

  const editId = ref<string | null>(null)
  function beginRename(id: string): void {
    editId.value = id
    nextTick(() => { const el = document.querySelector('.rename-input') as HTMLInputElement; el?.focus(); el?.select() })
  }
  function onRenameInput(id: string, e: Event): void {
    const s = displayStates.value.find(s => s.id === id)
    if (s) s.name = (e.target as HTMLInputElement).value
  }
  function doneRename(): void { editId.value = null }

  const ctx = reactive({ show: false, x: 0, y: 0, stateId: '', idx: 0 })
  function openCtx(id: string, idx: number, e: MouseEvent): void {
    Object.assign(ctx, { show: true, x: e.clientX, y: e.clientY, stateId: id, idx })
  }
  const ctxItems = computed<MenuItem[]>(() => [
    { id: 'rename', label: '重命名', shortcut: '双击' },
    { id: 'dup', label: '复制状态' },
    { divider: true },
    { id: 'del', label: '删除', disabled: ctx.idx === 0 || displayStates.value.length <= 1 },
  ])
  function onCtxAction(action: string): void {
    ctx.show = false
    if (action === 'rename') beginRename(ctx.stateId)
    else if (action === 'dup') onDupState(ctx.stateId)
    else if (action === 'del') onDeleteState(ctx.stateId)
  }
  function onDupState(id: string): void {
    if (!activeGroup.value) return
    const src = displayStates.value.find(s => s.id === id)
    if (!src) return
    const ns = store.addDisplayState(activeGroup.value.id, src.name + ' 副本')
    if (ns) { for (const [lid, props] of Object.entries(src.overrides)) store.setOverride(ns.id, lid, { ...props }) }
  }

  function switchGroup(id: string): void { canvas.setActiveGroup(id) }

  return {
    groups, displayStates, activeId, editId, ctx, ctxItems,
    switchGroup, onSwitchState, onAddState, onDeleteState,
    beginRename, onRenameInput, doneRename,
    openCtx, onCtxAction,
  }
}
