<template lang="pug">
.layer-panel
  .section-title 图层
  .layer-list
    .layer-item(
      v-for="node in flatNodes" :key="node.id"
      :class="layerCls(node)"
      :style="{ paddingLeft: node.depth * 16 + 4 + 'px' }"
      :aria-label="'图层: ' + nameOf(node.id)"
      draggable="true"
      @click="onSelect(node.id, $event)"
      @dragstart.stop="dd.start(node.id, $event)"
      @dragover.stop.prevent="dd.over(node.id, $event)"
      @dragend="dd.end()"
      @drop.prevent="dd.drop()"
      @contextmenu.prevent="openCtx(node.id, $event)"
    )
      span.expand(v-if="hasKids(node.id)" @click.stop="toggleFold(node.id)")
        | {{ folded.has(node.id) ? '▸' : '▾' }}
      span.expand.blank(v-else)
      LayerIcon(:type="typeOf(node.id)" :active="isSelected(node.id)")
      input.layer-name-input(
        v-if="editId === node.id"
        :value="nameOf(node.id)"
        @input="onRenameInput(node.id, $event)"
        @blur="doneRename"
        @keydown.enter="doneRename"
        @keydown.escape="doneRename"
        @click.stop
      )
      span.layer-name(v-else @dblclick.stop="beginRename(node.id)") {{ nameOf(node.id) }}
      span.layer-delete(@click.stop="onDelete(node.id)") ×
  .empty-state(v-if="!flatNodes.length") 空画布 — 按 R 绘制矩形
  ContextMenu(
    v-if="ctx.show"
    :x="ctx.x" :y="ctx.y" :items="ctxItems"
    @close="ctx.show = false"
    @select="onCtxAction"
  )
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LayerPanel —— 图层树面板
//  职责: 展示图层树、折叠/展开、拖拽排序、重命名、右键菜单
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed, ref, reactive, nextTick } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'
import { useLayerDrag } from '@composables/useLayerDrag'
import ContextMenu from '../ContextMenu.vue'
import type { MenuItem } from '../ContextMenu.vue'
import LayerIcon from './LayerIcon.vue'

const canvas = useCanvasStore()
const project = useProjectStore()
const patchStore = usePatchStore()
const dd = useLayerDrag()

// ━━━ 折叠 / 展开 ━━━

const folded = ref(new Set<string>())

function toggleFold(id: string): void {
  const s = folded.value
  s.has(id) ? s.delete(id) : s.add(id)
}

function hasKids(id: string): boolean {
  return (project.project.layers[id]?.childrenIds.length ?? 0) > 0
}

// ━━━ 树扁平化 (深度优先, 含折叠跳过) ━━━

interface FlatNode { id: string; depth: number }

const flatNodes = computed<FlatNode[]>(() => {
  const result: FlatNode[] = []
  const stack: FlatNode[] = []
  const roots = project.project.rootLayerIds
  for (let i = roots.length - 1; i >= 0; i--) stack.push({ id: roots[i], depth: 0 })
  while (stack.length) {
    const node = stack.pop()!
    result.push(node)
    if (folded.value.has(node.id)) continue
    const kids = project.project.layers[node.id]?.childrenIds ?? []
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i], depth: node.depth + 1 })
  }
  return result
})

// ━━━ 查询 ━━━

function typeOf(id: string): string { return project.project.layers[id]?.type ?? 'rectangle' }
function nameOf(id: string): string { return project.project.layers[id]?.name ?? '' }
function isSelected(id: string): boolean { return canvas.selectedLayerIds.includes(id) }

function onSelect(id: string, e: MouseEvent): void {
  e.shiftKey || e.metaKey ? canvas.toggleSelection(id) : canvas.select([id])
}

// ━━━ 重命名 (双击) ━━━

const editId = ref<string | null>(null)

function beginRename(id: string): void {
  editId.value = id
  nextTick(() => {
    const el = document.querySelector('.layer-name-input') as HTMLInputElement
    el?.focus(); el?.select()
  })
}

function onRenameInput(id: string, e: Event): void {
  const l = project.project.layers[id]
  if (l) l.name = (e.target as HTMLInputElement).value
}

function doneRename(): void { editId.value = null }

// ━━━ 删除 ━━━

function onDelete(id: string): void { project.removeLayer(id); canvas.select([]) }

// ━━━ 拖拽样式 ━━━

function layerCls(n: FlatNode) {
  return {
    'layer-item': true,
    selected: isSelected(n.id),
    'drop-before': dd.state.overId === n.id && dd.state.pos === 'before',
    'drop-inside': dd.state.overId === n.id && dd.state.pos === 'inside',
    'drop-after': dd.state.overId === n.id && dd.state.pos === 'after',
  }
}

// ━━━ 右键菜单 ━━━

const ctx = reactive({ show: false, x: 0, y: 0, id: '' })

function openCtx(id: string, e: MouseEvent): void {
  canvas.select([id])
  Object.assign(ctx, { show: true, x: e.clientX, y: e.clientY, id })
}

const ctxLayer = computed(() => project.project.layers[ctx.id])

const ctxItems = computed<MenuItem[]>(() => [
  { id: 'rename', label: '重命名', shortcut: '双击' },
  { id: 'dup', label: '复制图层', shortcut: '⌘D' },
  { divider: true },
  { id: 'sugar-btn', label: '⚡ 按钮反馈' },
  { id: 'sugar-toggle', label: '⚡ 卡片展开' },
  { divider: true },
  { id: 'comp', label: '创建组件', disabled: ctxLayer.value?.type !== 'frame' },
  { divider: true },
  { id: 'up', label: '上移一层', shortcut: '⌘[' },
  { id: 'down', label: '下移一层', shortcut: '⌘]' },
  { divider: true },
  { id: 'del', label: '删除', shortcut: 'Del' },
])

function onCtxAction(action: string): void {
  ctx.show = false
  const id = ctx.id
  const actions: Record<string, () => void> = {
    rename: () => beginRename(id),
    dup: () => dupLayer(id),
    comp: () => makeComponent(id),
    'sugar-btn': () => patchStore.applyButtonFeedback(id),
    'sugar-toggle': () => patchStore.applyToggleExpand(id),
    up: () => moveUp(id),
    down: () => moveDown(id),
    del: () => onDelete(id),
  }
  actions[action]?.()
}

// ━━━ 创建组件 (Frame → 独立 StateGroup) ━━━

function makeComponent(id: string): void {
  const layer = project.project.layers[id]
  if (!layer || layer.type !== 'frame') return
  const g = project.addStateGroup(layer.name, id)
  const s = project.addDisplayState(g.id, '默认')
  if (s) project.switchState(g.id, s.id)
}

function dupLayer(id: string): void {
  const l = project.project.layers[id]
  if (!l) return
  const c = project.addLayer(l.type, l.parentId, undefined, l.name + ' 副本')
  project.updateLayerProps(c.id, { ...l.props })
  if (l.text !== undefined) { c.text = l.text; c.fontSize = l.fontSize }
  canvas.select([c.id])
}

function moveUp(id: string): void {
  const l = project.project.layers[id]
  if (!l) return
  const arr = l.parentId ? project.project.layers[l.parentId]?.childrenIds ?? [] : project.project.rootLayerIds
  const i = arr.indexOf(id)
  if (i > 0) project.moveLayer(id, l.parentId, i - 1)
}

function moveDown(id: string): void {
  const l = project.project.layers[id]
  if (!l) return
  const arr = l.parentId ? project.project.layers[l.parentId]?.childrenIds ?? [] : project.project.rootLayerIds
  const i = arr.indexOf(id)
  if (i < arr.length - 1) project.moveLayer(id, l.parentId, i + 2)
}
</script>

<style scoped>
.layer-panel { padding: var(--sp-4) 0; }

.section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-tertiary);
  padding: 0 var(--sp-4);
  margin-bottom: var(--sp-3);
}

.layer-list { display: flex; flex-direction: column; }

.layer-item {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-3);
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--text-secondary);
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  user-select: none;
}

.layer-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.layer-item.selected {
  background: var(--accent-bg);
  color: var(--accent-text);
}

/* ── 拖拽放置指示 ── */
.layer-item.drop-before { box-shadow: inset 0 2px 0 0 var(--accent); }
.layer-item.drop-after  { box-shadow: inset 0 -2px 0 0 var(--accent); }
.layer-item.drop-inside {
  background: var(--accent-bg);
  outline: 1px dashed var(--accent-border);
}

/* ── 展开/折叠箭头 ── */
.expand {
  width: 14px;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
  transition: color var(--duration-fast);
}

.expand:hover { color: var(--text-primary); }
.expand.blank { cursor: default; }

.layer-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-name-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  color: inherit;
  font: inherit;
  padding: 1px var(--sp-1);
  outline: none;
}

/* ── 删除按钮 ── */
.layer-delete {
  opacity: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity var(--duration-fast), background var(--duration-fast);
}

.layer-item:hover .layer-delete { opacity: 0.4; }

.layer-delete:hover {
  opacity: 1 !important;
  background: var(--danger-bg);
  color: var(--danger);
}

.empty-state {
  padding: 40px var(--sp-5);
  text-align: center;
  font-size: var(--text-base);
  color: var(--text-disabled);
}
</style>
