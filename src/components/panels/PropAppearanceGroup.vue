<template lang="pug">
.prop-group
  .prop-label 外观
  .prop-row
    .prop-field(:class="{ overridden: has('opacity') }")
      span.label 透明度
      input.input(type="number" :value="resolved.opacity" step="0.1" min="0" max="1" @change="e => set({ opacity: num(e) })" @blur="$emit('editEnd')")
      button.btn-reset(v-if="has('opacity')" @click.stop="reset('opacity')" title="重置为基础值") ↺
  .prop-row
    .prop-field(:class="{ overridden: has('fill') }")
      span.label 填充
      input.color-input(type="color" :value="resolved.fill" @input="e => set({ fill: str(e) })" @change="$emit('editEnd')")
      button.btn-reset(v-if="has('fill')" @click.stop="reset('fill')" title="重置为基础值") ↺
  .prop-row
    .prop-field(:class="{ overridden: has('stroke') || has('strokeWidth') }")
      span.label 描边
      label.stroke-toggle
        input.checkbox(type="checkbox" :checked="strokeEnabled" @change="onToggleStroke")
      input.color-input.stroke-color(
        v-if="strokeEnabled"
        type="color"
        :value="resolved.stroke === 'none' ? '#000000' : resolved.stroke"
        @input="e => set({ stroke: str(e) })"
        @change="$emit('editEnd')"
      )
      span.stroke-off(v-else) 无
    .prop-field(v-if="strokeEnabled" :class="{ overridden: has('strokeWidth') }")
      span.label 宽度
      input.input(type="number" :value="dpx(resolved.strokeWidth)" step="1" min="0" @change="e => set({ strokeWidth: px(e) })" @blur="$emit('editEnd')")
      span.unit px
  .prop-row
    .prop-field(:class="{ overridden: has('borderRadius') }")
      span.label 圆角
      input.input(type="number" :value="dpx(resolved.borderRadius)" step="1" min="0" @change="e => set({ borderRadius: px(e) })" @blur="$emit('editEnd')")
      span.unit px
      button.btn-reset(v-if="has('borderRadius')" @click.stop="reset('borderRadius')" title="重置为基础值") ↺
</template>

<script setup lang="ts">
// 外观属性编辑子组件 (透明度/填充/描边/圆角)
import { computed } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'

const props = defineProps<{
  resolved: AnimatableProps
  overrides: Partial<AnimatableProps>
  isDefaultState: boolean
  set: (partial: Partial<AnimatableProps>) => void
  reset: (prop: keyof AnimatableProps) => void
  ensureSnapshot: () => void
}>()
const emit = defineEmits<{ editEnd: [] }>()

function has(prop: keyof AnimatableProps): boolean {
  return prop in props.overrides
}

// 工具函数
function num(e: Event): number { return parseFloat((e.target as HTMLInputElement).value) || 0 }
function px(e: Event): number { return Math.round(num(e)) }
function dpx(v: number | undefined): number { return Math.round(v ?? 0) }
function str(e: Event): string { return (e.target as HTMLInputElement).value }

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
