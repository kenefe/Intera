<template lang="pug">
.state-bar
  //- ── 多组选择器 (仅多于一组时显示) ──
  .group-selector(v-if="groups.length > 1")
    .group-pill(
      v-for="g in groups" :key="g.id"
      :class="{ active: g.id === canvas.activeGroupId }"
      @click="canvas.setActiveGroup(g.id)"
    ) {{ g.name }}
    .group-divider
  //- ── 状态标签页 ──
  .state-tabs
    .state-tab(
      v-for="(state, idx) in displayStates"
      :key="state.id"
      :class="{ active: state.id === activeId, animating: state.id === store.liveStateId }"
      @click="onSwitch(state.id)"
      @contextmenu.prevent="openCtx(state.id, idx, $event)"
    )
      input.state-rename-input(
        v-if="editId === state.id"
        :value="state.name"
        @input="onRenameInput(state.id, $event)"
        @blur="doneRename"
        @keydown.enter="doneRename"
        @keydown.escape="doneRename"
        @click.stop
      )
      span.state-name(v-else @dblclick.stop="beginRename(state.id)") {{ state.name }}
      .delete-btn(
        v-if="idx > 0 && displayStates.length > 1"
        @click.stop="onDelete(state.id)"
      ) &times;
    .add-btn(@click="onAdd" title="添加状态") +
  ContextMenu(
    v-if="ctx.show"
    :x="ctx.x" :y="ctx.y" :items="ctxItems"
    @close="ctx.show = false"
    @select="onCtxAction"
  )
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  StateBar —— 状态切换栏
//  职责: 状态切换 + 增删 + 重命名 + 右键菜单
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed, ref, reactive, nextTick } from 'vue'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import ContextMenu from '../ContextMenu.vue'
import type { MenuItem } from '../ContextMenu.vue'

const store = useProjectStore()
const canvas = useCanvasStore()

// ── 当前状态组 (跟随 activeGroupId) ──

const groups = computed(() => store.project.stateGroups)
const group = computed(() =>
  groups.value.find(g => g.id === canvas.activeGroupId) ?? groups.value[0],
)
const displayStates = computed(() => group.value?.displayStates ?? [])
const activeId = computed(() => group.value?.activeDisplayStateId)

function onSwitch(stateId: string): void {
  if (!group.value || stateId === activeId.value) return
  store.transitionToState(group.value.id, stateId)
}

function onAdd(): void {
  if (!group.value) return
  store.addDisplayState(group.value.id, `状态 ${displayStates.value.length + 1}`)
}

function onDelete(stateId: string): void {
  if (!group.value || displayStates.value.length <= 1) return
  store.removeDisplayState(group.value.id, stateId)
}

// ━━━ 双击重命名 ━━━

const editId = ref<string | null>(null)

function beginRename(id: string): void {
  editId.value = id
  nextTick(() => {
    const el = document.querySelector('.state-rename-input') as HTMLInputElement
    el?.focus(); el?.select()
  })
}

function onRenameInput(id: string, e: Event): void {
  const state = displayStates.value.find(s => s.id === id)
  if (state) state.name = (e.target as HTMLInputElement).value
}

function doneRename(): void { editId.value = null }

// ━━━ 右键菜单 ━━━

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
  else if (action === 'dup') onDup(ctx.stateId)
  else if (action === 'del') onDelete(ctx.stateId)
}

function onDup(id: string): void {
  if (!group.value) return
  const src = displayStates.value.find(s => s.id === id)
  if (!src) return
  const ns = store.addDisplayState(group.value.id, src.name + ' 副本')
  if (ns) {
    for (const [lid, props] of Object.entries(src.overrides)) {
      store.setOverride(ns.id, lid, { ...props })
    }
  }
}
</script>

<style scoped>
.state-bar {
  height: 36px; min-height: 36px; display: flex; align-items: center;
  padding: 0 12px; background: #16162a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.state-tabs { display: flex; gap: 4px; align-items: center; }

.state-tab {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 4px; font-size: 11px;
  cursor: pointer; color: rgba(255, 255, 255, 0.45);
  transition: background 0.12s, color 0.12s; user-select: none;
}
.state-tab:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.7); }
.state-tab.active {
  background: rgba(91, 91, 240, 0.28); color: #b8b8ff;
  box-shadow: inset 0 -2px 0 #7070ff;
  font-weight: 600;
}
.state-tab.animating { box-shadow: 0 0 0 1px rgba(91, 91, 240, 0.4); }

.state-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }

.state-rename-input {
  background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(91, 91, 240, 0.5);
  border-radius: 3px; color: inherit; font: inherit; padding: 1px 6px;
  outline: none; max-width: 100px;
}

.delete-btn {
  width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;
  border-radius: 2px; font-size: 10px; opacity: 0; transition: opacity 0.1s;
}
.state-tab:hover .delete-btn { opacity: 0.5; }
.delete-btn:hover { opacity: 1 !important; background: rgba(255, 60, 60, 0.2); color: #ff6060; }

.add-btn {
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; font-size: 15px; font-weight: 500;
  color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.12); cursor: pointer;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}
.add-btn:hover {
  color: rgba(136, 136, 255, 0.9); background: rgba(136, 136, 255, 0.1);
  border-color: rgba(136, 136, 255, 0.3);
}

/* ── 组选择器 ── */
.group-selector { display: flex; gap: 3px; align-items: center; margin-right: 4px; }

.group-pill {
  padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 500;
  color: rgba(255, 255, 255, 0.35); cursor: pointer;
  transition: background 0.12s, color 0.12s; user-select: none;
  letter-spacing: 0.3px;
}
.group-pill:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }
.group-pill.active { background: rgba(91, 91, 240, 0.2); color: #9090ff; }

.group-divider {
  width: 1px; height: 16px; background: rgba(255, 255, 255, 0.1); margin: 0 6px;
}
</style>
