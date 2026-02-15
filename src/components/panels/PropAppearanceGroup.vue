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

<style scoped>
/* ── 外观区统一样式 ── */

.prop-group { margin-bottom: 12px; }
.prop-label { font-size: 10px; opacity: 0.4; margin-bottom: 6px; letter-spacing: 0.5px; }
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
.prop-field:hover { border-color: rgba(255, 255, 255, 0.2); }
.prop-field:focus-within { border-color: rgba(136, 136, 255, 0.5); background: rgba(255, 255, 255, 0.1); }
.prop-field.overridden { border-color: rgba(255, 152, 0, 0.4); background: rgba(255, 152, 0, 0.05); }

.label {
  font-size: 10px;
  opacity: 0.45;
  min-width: 32px;
  flex-shrink: 0;
  white-space: nowrap;
}

.unit { font-size: 9px; opacity: 0.35; flex-shrink: 0; }

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

/* ── 描边行 ── */

.stroke-toggle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.checkbox {
  width: 14px;
  height: 14px;
  accent-color: #8888ff;
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
</style>
