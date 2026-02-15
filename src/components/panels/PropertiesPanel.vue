<template lang="pug">
.properties-panel
  template(v-if="resolved")
    //- ── 图层信息 ──
    .layer-header
      .layer-type {{ typeLabel }}
      .layer-name {{ layerName }}
      .state-badge(v-if="!isDefaultState") 覆盖

    //- ── 文本 (仅 text 类型) ──
    PropTextGroup(v-if="isTextLayer" :layer="layer" :ensureSnapshot="ensureSnapshot" @editEnd="onEditEnd")

    //- ── 布局 (仅容器类型) ──
    PropLayoutGroup(v-if="isFrameLayer" :layer="layer" :ensureSnapshot="ensureSnapshot" @editEnd="onEditEnd")

    //- ── 位置 + 尺寸 (可折叠) ──
    CollapsibleGroup(title="位置 / 尺寸")
      .prop-row
        .prop-field(:class="{ overridden: has('x') }")
          span.label X
          input.input(type="number" :value="dpx(resolved.x)" step="1" @change="e => set({ x: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('x')" @click.stop="reset('x')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('y') }")
          span.label Y
          input.input(type="number" :value="dpx(resolved.y)" step="1" @change="e => set({ y: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('y')" @click.stop="reset('y')" title="重置为基础值") ↺
      .prop-row
        .prop-field(:class="{ overridden: has('width') }")
          span.label W
          input.input(type="number" :value="dpx(resolved.width)" step="1" @change="e => set({ width: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('width')" @click.stop="reset('width')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('height') }")
          span.label H
          input.input(type="number" :value="dpx(resolved.height)" step="1" @change="e => set({ height: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('height')" @click.stop="reset('height')" title="重置为基础值") ↺

    //- ── 变换 (可折叠，默认收起) ──
    CollapsibleGroup(title="变换" :collapsed="true")
      .prop-row
        .prop-field(:class="{ overridden: has('rotation') }")
          span.label 旋转
          input.input(type="number" :value="dpx(resolved.rotation)" step="1" @change="e => set({ rotation: px(e) })" @blur="onEditEnd")
          span.unit °
          button.btn-reset(v-if="has('rotation')" @click.stop="reset('rotation')" title="重置为基础值") ↺
      .prop-row
        .prop-field(:class="{ overridden: has('scaleX') }")
          span.label 缩放X
          input.input(type="number" :value="resolved.scaleX" step="0.1" @change="e => set({ scaleX: num(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('scaleX')" @click.stop="reset('scaleX')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('scaleY') }")
          span.label 缩放Y
          input.input(type="number" :value="resolved.scaleY" step="0.1" @change="e => set({ scaleY: num(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('scaleY')" @click.stop="reset('scaleY')" title="重置为基础值") ↺

    //- ── 外观 ──
    PropAppearanceGroup(
      v-if="resolved"
      :resolved="resolved"
      :overrides="overrides"
      :isDefaultState="isDefaultState"
      :set="set"
      :reset="reset"
      :ensureSnapshot="ensureSnapshot"
      @editEnd="onEditEnd"
    )

  .empty-state(v-else) 未选中图层
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PropertiesPanel —— 属性检查器
//  职责: 展示 + 编辑选中图层的 AnimatableProps
//  关键: 状态感知写入 + 覆盖标记 + 描边开关
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'
import PropTextGroup from './PropTextGroup.vue'
import PropLayoutGroup from './PropLayoutGroup.vue'
import PropAppearanceGroup from './PropAppearanceGroup.vue'
import CollapsibleGroup from './CollapsibleGroup.vue'

const canvas = useCanvasStore()
const store = useProjectStore()

// ── 当前激活状态 ──

const activeStateId = computed(() =>
  store.project.stateGroups[0]?.activeDisplayStateId ?? null,
)

// ── 选中图层 ──

const layerId = computed(() => canvas.selectedLayerIds[0] ?? null)

const layer = computed(() =>
  layerId.value ? store.project.layers[layerId.value] ?? null : null,
)

// ── 图层信息 ──

const TYPE_LABELS: Record<string, string> = {
  rectangle: '矩形', ellipse: '椭圆', frame: '容器',
  text: '文本', image: '图片', group: '分组',
}

const typeLabel = computed(() => layer.value ? TYPE_LABELS[layer.value.type] ?? layer.value.type : '')
const layerName = computed(() => layer.value?.name ?? '')
const isTextLayer = computed(() => layer.value?.type === 'text')
const isFrameLayer = computed(() => layer.value?.type === 'frame')
const layoutDir = computed(() => layer.value?.layoutProps.layout ?? 'free')

// ── 合并后属性 ──

const resolved = computed<AnimatableProps | null>(() => {
  if (!layerId.value || !activeStateId.value) return null
  return store.states.getResolvedProps(activeStateId.value, layerId.value) ?? null
})

// ── 默认状态判定 ──

const isDefaultState = computed(() => {
  const group = store.project.stateGroups[0]
  return group?.displayStates[0]?.id === activeStateId.value
})

// ── 覆盖检测 (仅非默认状态时生效) ──

const overrides = computed<Partial<AnimatableProps>>(() => {
  if (isDefaultState.value || !activeStateId.value || !layerId.value) return {}
  return store.states.getOverrides(activeStateId.value, layerId.value)
})

function has(prop: keyof AnimatableProps): boolean {
  return prop in overrides.value
}

// ── 工具函数 ──

function num(e: Event): number { return parseFloat((e.target as HTMLInputElement).value) || 0 }
function px(e: Event): number { return Math.round(num(e)) }
function dpx(v: number | undefined): number { return Math.round(v ?? 0) }
function str(e: Event): string { return (e.target as HTMLInputElement).value }

// ── 快照管理 ──

let snapped = false
function ensureSnapshot(): void {
  if (!snapped) { store.snapshot(); snapped = true }
}

// ── 状态感知写入 ──

function set(partial: Partial<AnimatableProps>): void {
  if (!layerId.value || !activeStateId.value) return
  ensureSnapshot()
  if (isDefaultState.value) {
    store.updateLayerProps(layerId.value, partial)
  } else {
    store.setOverride(activeStateId.value, layerId.value, partial)
  }
}

// ── 重置覆盖 (清除单个属性回到基础值) ──

function reset(prop: keyof AnimatableProps): void {
  if (!layerId.value || !activeStateId.value || isDefaultState.value) return
  ensureSnapshot()
  store.clearOverride(activeStateId.value, layerId.value, prop)
  onEditEnd()
}

function onEditEnd(): void { snapped = false }
</script>

<style scoped>
.properties-panel { padding: 12px; }

/* ── 图层信息头 ── */

.layer-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.layer-type {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.layer-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
  flex-shrink: 0;
}

/* ── 属性分组 ── */

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

/* 覆盖态 —— 橙色边框提示 */
.prop-field.overridden {
  border-color: rgba(255, 152, 0, 0.4);
  background: rgba(255, 152, 0, 0.05);
}
.prop-field.overridden:hover {
  border-color: rgba(255, 152, 0, 0.6);
}

.label { font-size: 10px; opacity: 0.45; min-width: 32px; flex-shrink: 0; white-space: nowrap; }

.unit {
  font-size: 9px;
  opacity: 0.35;
  flex-shrink: 0;
}

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
  min-width: 0;
  -moz-appearance: textfield;
}
/* 隐藏 number input spinner 箭头 — 防止误触 */
.input::-webkit-inner-spin-button,
.input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.color-input {
  width: 100%;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  background: none;
  cursor: pointer;
  transition: border-color 0.12s;
  flex: 1;
}
.color-input:hover { border-color: rgba(136, 136, 255, 0.4); }

/* ── 重置按钮 ── */

.btn-reset {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s;
  padding: 0;
}
.btn-reset:hover { background: rgba(255, 152, 0, 0.35); }

.empty-state {
  padding: 40px 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.3;
}
</style>
