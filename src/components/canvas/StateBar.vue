<template lang="pug">
.state-bar
  .group-selector(v-if="groups.length > 1")
    .group-pill(
      v-for="g in groups" :key="g.id"
      :class="{ active: g.id === canvas.activeGroupId }"
      @click="canvas.setActiveGroup(g.id)"
    ) {{ g.name }}
    .group-divider
  .state-strip
    .state-card(
      v-for="(state, idx) in displayStates"
      :key="state.id"
      :class="{ active: state.id === activeId, animating: state.id === store.liveStateId }"
      @click="onSwitch(state.id)"
      @contextmenu.prevent="openCtx(state.id, idx, $event)"
    )
      svg.state-thumb(:viewBox="thumbViewBox")
        rect(
          v-for="b in thumbBlocks(state)" :key="b.id"
          :x="b.x" :y="b.y" :width="b.w" :height="b.h"
          :rx="b.r" :fill="b.fill" :opacity="b.opacity"
        )
      .state-label
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
    .add-card(@click="onAdd" title="添加状态")
      .add-icon +
      .add-text 新状态
  ContextMenu(
    v-if="ctx.show"
    :x="ctx.x" :y="ctx.y" :items="ctxItems"
    @close="ctx.show = false"
    @select="onCtxAction"
  )
</template>

<script setup lang="ts">
import { computed, ref, reactive, nextTick } from 'vue'
import type { DisplayState, AnimatableProps } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import ContextMenu from '../ContextMenu.vue'
import type { MenuItem } from '../ContextMenu.vue'

const store = useProjectStore()
const canvas = useCanvasStore()

const groups = computed(() => store.project.stateGroups)
const group = computed(() =>
  groups.value.find(g => g.id === canvas.activeGroupId) ?? groups.value[0],
)
const displayStates = computed(() => group.value?.displayStates ?? [])
const activeId = computed(() => group.value?.activeDisplayStateId)

// ── 缩略图 ──

const cSize = computed(() => store.project.canvasSize)
const thumbViewBox = computed(() => `0 0 ${cSize.value.width} ${cSize.value.height}`)

interface Block { id: string; x: number; y: number; w: number; h: number; r: number; fill: string; opacity: number }

function thumbBlocks(state: DisplayState): Block[] {
  const layers = store.project.layers
  return Object.values(layers).map(l => {
    const p = l.props
    const o = state.overrides[l.id] ?? {}
    const merged: AnimatableProps = { ...p, ...o }
    return {
      id: l.id, x: merged.x, y: merged.y,
      w: merged.width, h: merged.height,
      r: Math.min(merged.borderRadius, merged.width / 2, merged.height / 2),
      fill: merged.fill || '#666',
      opacity: merged.opacity,
    }
  })
}

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

// ── 重命名 ──
const editId = ref<string | null>(null)
function beginRename(id: string): void {
  editId.value = id
  nextTick(() => {
    const el = document.querySelector('.state-rename-input') as HTMLInputElement
    el?.focus(); el?.select()
  })
}
function onRenameInput(id: string, e: Event): void {
  const s = displayStates.value.find(s => s.id === id)
  if (s) s.name = (e.target as HTMLInputElement).value
}
function doneRename(): void { editId.value = null }

// ── 右键菜单 ──
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
    for (const [lid, props] of Object.entries(src.overrides))
      store.setOverride(ns.id, lid, { ...props })
  }
}
</script>

<style scoped>
.state-bar {
  height: 80px;
  min-height: 80px;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-4);
  background: var(--surface-1);
  border-top: 1px solid var(--border-subtle);
  gap: var(--sp-2);
}
.state-strip {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  flex: 1;
  padding: 6px 0;
}
.state-card {
  width: 72px;
  min-width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: 4px;
  transition: background var(--duration-fast) var(--ease-out);
  position: relative;
}
.state-card:hover { background: rgba(255,255,255,0.04); }
.state-card.active {
  background: var(--accent-bg);
  box-shadow: 0 0 0 1.5px var(--accent-border);
}
.state-card.animating { box-shadow: 0 0 0 1.5px var(--accent); }
.state-thumb {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  background: var(--surface-0);
  border: 1px solid var(--border-subtle);
}
.state-card.active .state-thumb { border-color: var(--accent-border); }
.state-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-align: center;
  width: 100%;
  overflow: hidden;
}
.state-card.active .state-label { color: var(--accent-text); font-weight: 600; }
.state-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.state-rename-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--accent-border);
  border-radius: 3px;
  color: inherit;
  font: inherit;
  padding: 0 2px;
  outline: none;
  text-align: center;
}
.delete-btn {
  position: absolute;
  top: 2px; right: 2px;
  width: 14px; height: 14px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px;
  font-size: 10px;
  opacity: 0;
  transition: opacity var(--duration-fast);
}
.state-card:hover .delete-btn { opacity: 0.5; }
.delete-btn:hover { opacity: 1 !important; background: var(--danger-bg); color: var(--danger); }
.add-card {
  width: 72px; min-width: 72px;
  height: 60px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-default);
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast);
}
.add-card:hover { border-color: var(--accent-border); background: var(--accent-bg); }
.add-icon { font-size: 16px; color: var(--text-tertiary); }
.add-card:hover .add-icon { color: var(--accent-light); }
.add-text { font-size: 9px; color: var(--text-disabled); }
.add-card:hover .add-text { color: var(--accent-text); }

/* ── 组选择器 ── */
.group-selector { display: flex; gap: 2px; align-items: center; margin-right: var(--sp-1); }
.group-pill {
  padding: 3px var(--sp-3); border-radius: var(--radius-sm);
  font-size: var(--text-xs); font-weight: 500; color: var(--text-tertiary);
  cursor: pointer; user-select: none;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.group-pill:hover { background: rgba(255,255,255,0.06); color: var(--text-secondary); }
.group-pill.active { background: var(--accent-bg); color: var(--accent-text); }
.group-divider { width: 1px; height: 16px; background: var(--border-default); margin: 0 var(--sp-2); }
</style>
