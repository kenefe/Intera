<template lang="pug">
.layer-panel
  .section-title 图层
  .layer-list
    .layer-item(
      v-for="node in flatNodes"
      :key="node.id"
      :class="{ selected: isSelected(node.id) }"
      :style="{ paddingLeft: node.depth * 16 + 8 + 'px' }"
      @click="onSelect(node.id, $event)"
    )
      .layer-icon {{ iconOf(node.id) }}
      .layer-name {{ nameOf(node.id) }}
  .empty-state(v-if="!flatNodes.length") 空画布 — 按 R 绘制矩形
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Layer } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

const canvas = useCanvasStore()
const project = useProjectStore()

// ── 类型图标 ──

const ICONS: Record<string, string> = {
  frame: 'F', rectangle: 'R', ellipse: 'O', text: 'T', image: 'I', group: 'G',
}

// ── 将树结构扁平化 (DFS, 带深度) ──

interface FlatNode { id: string; depth: number }

const flatNodes = computed<FlatNode[]>(() => {
  const result: FlatNode[] = []
  const stack: Array<{ id: string; depth: number }> = []
  // 逆序压栈以保持正序输出
  const roots = project.project.rootLayerIds
  for (let i = roots.length - 1; i >= 0; i--) stack.push({ id: roots[i], depth: 0 })
  while (stack.length) {
    const { id, depth } = stack.pop()!
    result.push({ id, depth })
    const kids = project.project.layers[id]?.childrenIds ?? []
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i], depth: depth + 1 })
  }
  return result
})

function isSelected(id: string): boolean { return canvas.selectedLayerIds.includes(id) }
function iconOf(id: string): string { return ICONS[project.project.layers[id]?.type] ?? '?' }
function nameOf(id: string): string { return project.project.layers[id]?.name ?? '' }

function onSelect(id: string, e: MouseEvent): void {
  if (e.shiftKey || e.metaKey) canvas.toggleSelection(id)
  else canvas.select([id])
}
</script>

<style scoped>
.layer-panel { padding: 12px 0; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  padding: 0 12px;
  margin-bottom: 8px;
}

.layer-list { display: flex; flex-direction: column; }

.layer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.1s;
}

.layer-item:hover { background: rgba(255, 255, 255, 0.04); }
.layer-item.selected { background: rgba(91, 91, 240, 0.15); color: #a0a0ff; }

.layer-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.5;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

.layer-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.empty-state {
  padding: 40px 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.3;
}
</style>
