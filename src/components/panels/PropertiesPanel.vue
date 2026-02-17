<template lang="pug">
.properties-panel
  template(v-if="resolved")
    //- ── 图层信息 ──
    .layer-header
      .layer-type {{ typeLabel }}
      .layer-name {{ layerName }}
      .state-badge(v-if="!isDefaultState") 覆盖

    //- ── 文本 (仅 text 类型) ──
    CollapsibleGroup(v-if="isTextLayer" title="文本")
      PropTextGroup(:layer="layer" :ensureSnapshot="ensureSnapshot" @editEnd="onEditEnd")

    //- ── 布局 (仅容器类型) ──
    CollapsibleGroup(v-if="isFrameLayer" title="布局")
      PropLayoutGroup(:layer="layer" :ensureSnapshot="ensureSnapshot" @editEnd="onEditEnd")

    //- ── 位置 + 尺寸 (可折叠) ──
    CollapsibleGroup(title="位置 / 尺寸")
      .prop-row
        .prop-field(:class="{ overridden: has('x') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('x') }" @click.stop="toggleKey('x')") ◆
          span.label X
          input.input(type="number" :value="dpx(resolved.x)" step="1" @change="e => set({ x: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('x')" @click.stop="reset('x')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('y') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('y') }" @click.stop="toggleKey('y')") ◆
          span.label Y
          input.input(type="number" :value="dpx(resolved.y)" step="1" @change="e => set({ y: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('y')" @click.stop="reset('y')" title="重置为基础值") ↺
      .prop-row
        .prop-field(:class="{ overridden: has('width') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('width') }" @click.stop="toggleKey('width')") ◆
          span.label W
          input.input(type="number" :value="dpx(resolved.width)" step="1" @change="e => set({ width: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('width')" @click.stop="reset('width')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('height') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('height') }" @click.stop="toggleKey('height')") ◆
          span.label H
          input.input(type="number" :value="dpx(resolved.height)" step="1" @change="e => set({ height: px(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('height')" @click.stop="reset('height')" title="重置为基础值") ↺

    //- ── 变换 (可折叠，默认收起) ──
    CollapsibleGroup(title="变换" :collapsed="true")
      .prop-row
        .prop-field(:class="{ overridden: has('rotation') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('rotation') }" @click.stop="toggleKey('rotation')") ◆
          span.label 旋转
          input.input(type="number" :value="dpx(resolved.rotation)" step="1" @change="e => set({ rotation: px(e) })" @blur="onEditEnd")
          span.unit °
          button.btn-reset(v-if="has('rotation')" @click.stop="reset('rotation')" title="重置为基础值") ↺
      .prop-row
        .prop-field(:class="{ overridden: has('scaleX') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('scaleX') }" @click.stop="toggleKey('scaleX')") ◆
          span.label 缩放X
          input.input(type="number" :value="resolved.scaleX" step="0.1" @change="e => set({ scaleX: num(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('scaleX')" @click.stop="reset('scaleX')" title="重置为基础值") ↺
        .prop-field(:class="{ overridden: has('scaleY') }")
          span.key-dot(v-if="!isDefaultState" :class="{ active: has('scaleY') }" @click.stop="toggleKey('scaleY')") ◆
          span.label 缩放Y
          input.input(type="number" :value="resolved.scaleY" step="0.1" @change="e => set({ scaleY: num(e) })" @blur="onEditEnd")
          button.btn-reset(v-if="has('scaleY')" @click.stop="reset('scaleY')" title="重置为基础值") ↺

    //- ── 外观 ──
    CollapsibleGroup(title="外观")
      PropAppearanceGroup(
        v-if="resolved"
        :resolved="resolved"
        :overrides="overrides"
        :isDefaultState="isDefaultState"
        :set="set"
        :reset="reset"
        :toggleKey="toggleKey"
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
import { useActiveGroup } from '@/composables/useActiveGroup'
import PropTextGroup from './PropTextGroup.vue'
import PropLayoutGroup from './PropLayoutGroup.vue'
import PropAppearanceGroup from './PropAppearanceGroup.vue'
import CollapsibleGroup from './CollapsibleGroup.vue'
import { num, px, dpx, str } from '@/utils/propHelpers'

const canvas = useCanvasStore()
const store = useProjectStore()
const { activeStateId, isDefaultState } = useActiveGroup()

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

// ── 默认状态判定 (由 useActiveGroup 提供) ──

// ── 覆盖检测 (仅非默认状态时生效) ──

const overrides = computed<Partial<AnimatableProps>>(() => {
  if (isDefaultState.value || !activeStateId.value || !layerId.value) return {}
  return store.states.getOverrides(activeStateId.value, layerId.value)
})

function has(prop: keyof AnimatableProps): boolean {
  return prop in overrides.value
}

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

// ── 关键属性开关 (合并自 KeyPropertyPanel) ──

function toggleKey(prop: keyof AnimatableProps): void {
  if (!layerId.value || !activeStateId.value || isDefaultState.value) return
  ensureSnapshot()
  if (has(prop)) {
    store.clearOverride(activeStateId.value, layerId.value, prop)
  } else {
    const base = layer.value?.props[prop]
    if (base !== undefined) store.setOverride(activeStateId.value, layerId.value, { [prop]: base })
  }
}

function onEditEnd(): void { snapped = false }
</script>

<style scoped>
@import './prop-shared.css';

.properties-panel { padding: var(--sp-4); }

/* ── 图层信息头 ── */

.layer-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.layer-type {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.layer-name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-sm);
  background: var(--override-bg);
  color: var(--override);
  flex-shrink: 0;
}

.empty-state {
  padding: 40px var(--sp-5);
  text-align: center;
  font-size: var(--text-base);
  color: var(--text-disabled);
}
</style>
