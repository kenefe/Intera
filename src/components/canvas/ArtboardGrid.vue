<template lang="pug">
.artboard-grid
  .state-group-row(
    v-for="group in groups" :key="group.id"
    :class="{ active: group.id === canvas.activeGroupId }"
    @click="canvas.setActiveGroup(group.id)"
  )
    .row-label {{ group.name }}
    .row-artboards
      .artboard-slot(
        v-for="(state, idx) in group.displayStates" :key="state.id"
        @contextmenu.prevent="openCtx(group.id, state.id, idx, group.displayStates.length, $event)"
      )
        Artboard(
          :display-state="state"
          :is-active="state.id === group.activeDisplayStateId"
          :root-layer-id="group.rootLayerId"
          @click.stop="onClickState(group.id, state.id)"
        )
        .artboard-name-row
          input.rename-input(
            v-if="editId === state.id" :value="state.name"
            @input="onRenameInput(state.id, $event)"
            @blur="doneRename" @keydown.enter="doneRename" @keydown.escape="doneRename"
            @click.stop
          )
          span.artboard-name(v-else @dblclick.stop="beginRename(state.id)") {{ state.name }}
      .add-state-btn(@click.stop="onAddState(group.id)") +
  ContextMenu(
    v-if="ctx.show"
    :x="ctx.x" :y="ctx.y" :items="ctxItems"
    @close="ctx.show = false"
    @select="onCtxAction"
  )
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick } from 'vue'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import Artboard from './Artboard.vue'
import ContextMenu from '../ContextMenu.vue'
import type { MenuItem } from '../ContextMenu.vue'

const store = useProjectStore()
const canvas = useCanvasStore()
const groups = computed(() => store.project.stateGroups)

function onAddState(groupId: string): void {
  const g = groups.value.find(g => g.id === groupId)
  store.addDisplayState(groupId, `状态 ${(g?.displayStates.length ?? 0) + 1}`)
}

function onClickState(groupId: string, stateId: string): void {
  store.transitionToState(groupId, stateId)
}

// ── 重命名 ──
const editId = ref<string | null>(null)
function beginRename(id: string): void {
  editId.value = id
  nextTick(() => { const el = document.querySelector('.rename-input') as HTMLInputElement; el?.focus(); el?.select() })
}
function onRenameInput(id: string, e: Event): void {
  for (const g of groups.value) {
    const s = g.displayStates.find(s => s.id === id)
    if (s) { s.name = (e.target as HTMLInputElement).value; return }
  }
}
function doneRename(): void { editId.value = null }

// ── 右键菜单 ──
const ctx = reactive({ show: false, x: 0, y: 0, groupId: '', stateId: '', idx: 0, total: 0 })
function openCtx(gid: string, sid: string, idx: number, total: number, e: MouseEvent): void {
  Object.assign(ctx, { show: true, x: e.clientX, y: e.clientY, groupId: gid, stateId: sid, idx, total })
}
const ctxItems = computed<MenuItem[]>(() => [
  { id: 'rename', label: '重命名', shortcut: '双击' },
  { id: 'dup', label: '复制状态' },
  { divider: true },
  { id: 'del', label: '删除', disabled: ctx.idx === 0 || ctx.total <= 1 },
])
function onCtxAction(action: string): void {
  ctx.show = false
  if (action === 'rename') beginRename(ctx.stateId)
  else if (action === 'dup') onDup()
  else if (action === 'del') store.removeDisplayState(ctx.groupId, ctx.stateId)
}
function onDup(): void {
  const g = groups.value.find(g => g.id === ctx.groupId)
  const src = g?.displayStates.find(s => s.id === ctx.stateId)
  if (!src || !g) return
  const ns = store.addDisplayState(g.id, src.name + ' 副本')
  if (ns) { for (const [lid, props] of Object.entries(src.overrides)) store.setOverride(ns.id, lid, { ...props }) }
}
</script>

<style scoped>
.artboard-grid {
  display: flex;
  flex-direction: column;
  gap: 120px;
  padding: 80px;
}

.state-group-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  cursor: pointer;
}

.state-group-row.active > .row-label { color: var(--accent-light); }

.row-label {
  font-size: var(--text-base);
  color: var(--text-tertiary);
  letter-spacing: 1px;
  padding-left: var(--sp-1);
  transition: color var(--duration-fast);
}

.row-artboards {
  display: flex;
  gap: 80px;
  align-items: flex-start;
}

.artboard-slot { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); }

.artboard-name-row { text-align: center; }
.artboard-name {
  font-size: var(--text-sm); color: var(--text-tertiary);
  cursor: default; user-select: none;
}
.rename-input {
  background: rgba(255,255,255,0.06); border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--text-sm);
  padding: 1px 4px; outline: none; text-align: center; width: 100px;
}

.add-state-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-lg);
  color: var(--text-disabled);
  font-size: 20px;
  cursor: pointer;
  align-self: center;
  transition: border-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}

.add-state-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent-light);
  background: var(--accent-bg);
}
</style>
