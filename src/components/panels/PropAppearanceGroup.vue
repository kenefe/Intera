<template lang="pug">
.prop-group
  .prop-row
    .prop-field(:class="{ overridden: has('opacity') }")
      span.key-dot(v-if="!isDefaultState" :class="{ active: has('opacity') }" @click.stop="toggleKey('opacity')") ◆
      span.label 透明度
      input.input(type="number" :value="resolved.opacity" step="0.1" min="0" max="1" @change="e => set({ opacity: num(e) })" @blur="$emit('editEnd')")
      button.btn-reset(v-if="has('opacity')" @click.stop="reset('opacity')" title="重置为基础值") ↺
  .prop-row
    .prop-field(:class="{ overridden: has('fill') }")
      span.key-dot(v-if="!isDefaultState" :class="{ active: has('fill') }" @click.stop="toggleKey('fill')") ◆
      span.label 填充
      ColorPicker(:modelValue="resolved.fill" @update:modelValue="v => set({ fill: v })" @change="$emit('editEnd')")
      button.btn-reset(v-if="has('fill')" @click.stop="reset('fill')" title="重置为基础值") ↺
  .prop-row
    .prop-field(:class="{ overridden: has('stroke') || has('strokeWidth') }")
      span.key-dot(v-if="!isDefaultState" :class="{ active: has('strokeWidth') }" @click.stop="toggleKey('strokeWidth')") ◆
      span.label 描边
      label.stroke-toggle
        input.checkbox(type="checkbox" :checked="strokeEnabled" @change="onToggleStroke")
      ColorPicker(
        v-if="strokeEnabled"
        :modelValue="resolved.stroke === 'none' ? '#000000' : resolved.stroke"
        @update:modelValue="v => set({ stroke: v })"
        @change="$emit('editEnd')"
      )
      span.stroke-off(v-else) 无
    .prop-field(v-if="strokeEnabled" :class="{ overridden: has('strokeWidth') }")
      span.label 宽度
      input.input(type="number" :value="dpx(resolved.strokeWidth)" step="1" min="0" @change="e => set({ strokeWidth: px(e) })" @blur="$emit('editEnd')")
      span.unit px
  .prop-row
    .prop-field(:class="{ overridden: has('borderRadius') }")
      span.key-dot(v-if="!isDefaultState" :class="{ active: has('borderRadius') }" @click.stop="toggleKey('borderRadius')") ◆
      span.label 圆角
      input.input(type="number" :value="dpx(resolved.borderRadius)" step="1" min="0" @change="e => set({ borderRadius: px(e) })" @blur="$emit('editEnd')")
      span.unit px
      button.btn-reset(v-if="has('borderRadius')" @click.stop="reset('borderRadius')" title="重置为基础值") ↺
</template>

<script setup lang="ts">
// 外观属性编辑子组件 (透明度/填充/描边/圆角)
import { computed } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import ColorPicker from './ColorPicker.vue'
import { num, px, dpx } from '@/utils/propHelpers'

const props = defineProps<{
  resolved: AnimatableProps
  overrides: Partial<AnimatableProps>
  isDefaultState: boolean
  set: (partial: Partial<AnimatableProps>) => void
  reset: (prop: keyof AnimatableProps) => void
  toggleKey: (prop: keyof AnimatableProps) => void
  ensureSnapshot: () => void
}>()
const emit = defineEmits<{ editEnd: [] }>()

function has(prop: keyof AnimatableProps): boolean {
  return prop in props.overrides
}

const strokeEnabled = computed(() =>
  props.resolved.stroke !== 'none' && props.resolved.strokeWidth > 0,
)

function onToggleStroke(): void {
  props.ensureSnapshot()
  if (strokeEnabled.value) {
    props.set({ stroke: 'none', strokeWidth: 0 })
  } else {
    props.set({ stroke: '#000000', strokeWidth: 2 })
  }
  emit('editEnd')
}
</script>

<style scoped>
@import './prop-shared.css';

/* ── 描边行 ── */

.stroke-toggle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
  margin: 0;
}

.stroke-color {
  flex: 1;
  min-width: 0;
}

.stroke-off {
  font-size: 11px;
  opacity: 0.3;
  flex: 1;
}

/* .key-dot 已迁移至 prop-shared.css */
</style>
