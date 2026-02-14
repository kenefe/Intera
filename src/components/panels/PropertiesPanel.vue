<template lang="pug">
.properties-panel
  template(v-if="resolved")
    .section-title 属性
    //- ── 位置 ──
    .prop-group
      .prop-label 位置
      .prop-row
        .prop-field
          span.label X
          input.input(type="number" :value="resolved.x" @change="e => set({ x: num(e) })" @blur="onEditEnd")
        .prop-field
          span.label Y
          input.input(type="number" :value="resolved.y" @change="e => set({ y: num(e) })" @blur="onEditEnd")
    //- ── 尺寸 ──
    .prop-group
      .prop-label 尺寸
      .prop-row
        .prop-field
          span.label W
          input.input(type="number" :value="resolved.width" @change="e => set({ width: num(e) })" @blur="onEditEnd")
        .prop-field
          span.label H
          input.input(type="number" :value="resolved.height" @change="e => set({ height: num(e) })" @blur="onEditEnd")
    //- ── 变换 ──
    .prop-group
      .prop-label 变换
      .prop-row
        .prop-field
          span.label 旋转
          input.input(type="number" :value="resolved.rotation" @change="e => set({ rotation: num(e) })" @blur="onEditEnd")
      .prop-row
        .prop-field
          span.label 缩放X
          input.input(type="number" :value="resolved.scaleX" step="0.1" @change="e => set({ scaleX: num(e) })" @blur="onEditEnd")
        .prop-field
          span.label 缩放Y
          input.input(type="number" :value="resolved.scaleY" step="0.1" @change="e => set({ scaleY: num(e) })" @blur="onEditEnd")
    //- ── 外观 ──
    .prop-group
      .prop-label 外观
      .prop-row
        .prop-field
          span.label 透明度
          input.input(type="number" :value="resolved.opacity" step="0.1" min="0" max="1" @change="e => set({ opacity: num(e) })" @blur="onEditEnd")
      .prop-row
        .prop-field
          span.label 填充
          input.color-input(type="color" :value="resolved.fill" @input="e => set({ fill: str(e) })" @change="onEditEnd")
      .prop-row
        .prop-field
          span.label 描边
          input.color-input(type="color" :value="resolved.stroke" @input="e => set({ stroke: str(e) })" @change="onEditEnd")
        .prop-field
          span.label 宽度
          input.input(type="number" :value="resolved.strokeWidth" min="0" @change="e => set({ strokeWidth: num(e) })" @blur="onEditEnd")
      .prop-row
        .prop-field
          span.label 圆角
          input.input(type="number" :value="resolved.borderRadius" min="0" @change="e => set({ borderRadius: num(e) })" @blur="onEditEnd")
  .empty-state(v-else) 未选中图层
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

const canvas = useCanvasStore()
const store = useProjectStore()

// ── 当前激活状态 ──

const activeStateId = computed(() =>
  store.project.stateGroups[0]?.activeDisplayStateId ?? null,
)

// ── 选中图层 ──

const layerId = computed(() => canvas.selectedLayerIds[0] ?? null)

// ── 合并后的属性 (基础 + 覆盖) ──

const resolved = computed<AnimatableProps | null>(() => {
  if (!layerId.value || !activeStateId.value) return null
  return store.states.getResolvedProps(activeStateId.value, layerId.value) ?? null
})

function num(e: Event): number { return parseFloat((e.target as HTMLInputElement).value) || 0 }
function str(e: Event): string { return (e.target as HTMLInputElement).value }

/** 编辑前拍快照 — 保证属性变更可撤销 */
let snapped = false
function ensureSnapshot(): void {
  if (!snapped) { store.snapshot(); snapped = true }
}

// ── 默认状态判定 ──

const isDefaultState = computed(() => {
  const group = store.project.stateGroups[0]
  return group?.displayStates[0]?.id === activeStateId.value
})

/** 状态感知写入: 默认状态 → 更新基础; 非默认 → 创建覆盖 */
function set(partial: Partial<AnimatableProps>): void {
  if (!layerId.value || !activeStateId.value) return
  ensureSnapshot()
  if (isDefaultState.value) {
    store.updateLayerProps(layerId.value, partial)
  } else {
    store.setOverride(activeStateId.value, layerId.value, partial)
  }
}

/** 编辑结束 — 重置快照标记 */
function onEditEnd(): void { snapped = false }
</script>

<style scoped>
.properties-panel { padding: 12px; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  margin-bottom: 12px;
}

.prop-group { margin-bottom: 12px; }

.prop-label {
  font-size: 10px;
  opacity: 0.4;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.prop-row { display: flex; gap: 6px; margin-bottom: 4px; }

.prop-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 3px 6px;
  transition: border-color 0.12s, background 0.12s;
}
.prop-field:hover {
  border-color: rgba(255, 255, 255, 0.2);
}
.prop-field:focus-within {
  border-color: rgba(136, 136, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.label { font-size: 10px; opacity: 0.45; min-width: 14px; }

.input {
  flex: 1;
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  width: 100%;
  outline: none;
  padding: 4px 0;
}

.color-input {
  width: 100%;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  background: none;
  cursor: pointer;
  transition: border-color 0.12s;
}
.color-input:hover { border-color: rgba(136, 136, 255, 0.4); }

.empty-state {
  padding: 40px 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.3;
}
</style>
