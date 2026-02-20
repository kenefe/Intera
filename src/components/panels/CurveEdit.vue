<template lang="pug">
.curve-edit
  select.type-select(:value="curve.type" @change="onType" data-testid="curve-type")
    option(value="spring") 弹簧
    option(value="friction") 摩擦
    option(value="bezier") 贝塞尔
    option(value="linear") 线性
  template(v-if="curve.type === 'spring'")
    .param-row
      span.param-label 响应
      input.param-slider(type="range" min="0.05" max="2" step="0.01" :value="curve.response ?? 0.35" @input="e => emit('update', { response: num(e) })" data-testid="curve-response" title="响应")
      input.param-input(type="number" min="0.05" max="2" step="0.01" :value="(curve.response ?? 0.35).toFixed(2)" @change="e => emit('update', { response: num(e) })" data-testid="curve-response-input")
    .param-row
      span.param-label 阻尼
      input.param-slider(type="range" min="0.01" max="2" step="0.01" :value="curve.damping ?? 0.95" @input="e => emit('update', { damping: num(e) })" data-testid="curve-damping" title="阻尼")
      input.param-input(type="number" min="0.01" max="2" step="0.01" :value="(curve.damping ?? 0.95).toFixed(2)" @change="e => emit('update', { damping: num(e) })" data-testid="curve-damping-input")
    CurvePreview(:curve="curve")
  template(v-if="curve.type === 'friction'")
    .param-row
      span.param-label 摩擦
      input.param-slider(type="range" min="0.01" max="1" step="0.01" :value="curve.friction ?? 0.48" @input="e => emit('update', { friction: num(e) })" data-testid="curve-friction" title="摩擦")
      input.param-input(type="number" min="0.01" max="1" step="0.01" :value="(curve.friction ?? 0.48).toFixed(2)" @change="e => emit('update', { friction: num(e) })" data-testid="curve-friction-input")
    CurvePreview(:curve="curve")
  template(v-if="curve.type === 'bezier' || curve.type === 'linear'")
    .param-row
      span.param-label 时长
      input.param-slider(type="range" min="0.05" max="3" step="0.05" :value="curve.duration ?? 0.3" @input="e => emit('update', { duration: num(e) })" data-testid="curve-duration" title="时长")
      input.param-input(type="number" min="0.05" max="3" step="0.05" :value="(curve.duration ?? 0.3).toFixed(2)" @change="e => emit('update', { duration: num(e) })" data-testid="curve-duration-input")
    CurvePreview(:curve="curve")
</template>

<script setup lang="ts">
import type { CurveConfig, CurveType } from '@engine/scene/types'
import { num } from '@/utils/propHelpers'
import CurvePreview from './CurvePreview.vue'

const props = defineProps<{ curve: CurveConfig }>()

const emit = defineEmits<{
  update: [partial: Partial<CurveConfig>]
}>()

// 切换类型时重置为该类型的默认参数
const DEFAULTS: Record<CurveType, CurveConfig> = {
  spring:   { type: 'spring', damping: 0.95, response: 0.35 },
  friction: { type: 'friction', friction: 0.48 },
  bezier:   { type: 'bezier', controlPoints: [0.25, 0.1, 0.25, 1], duration: 0.3 },
  linear:   { type: 'linear', duration: 0.3 },
}

function onType(e: Event): void {
  emit('update', { ...DEFAULTS[(e.target as HTMLSelectElement).value as CurveType] })
}
</script>

<style scoped>
.curve-edit { display: flex; flex-direction: column; gap: var(--sp-1); }

.type-select {
  width: 100%;
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.type-select:focus { border-color: var(--accent-border); }

.param-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.param-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  min-width: 30px;
}

.param-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  outline: none;
}

.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: box-shadow var(--duration-fast);
}

.param-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.param-input {
  width: 48px;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-align: right;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 2px var(--sp-1);
  outline: none;
  -moz-appearance: textfield;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.param-input::-webkit-inner-spin-button,
.param-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.param-input:focus {
  border-color: var(--accent-border);
  background: rgba(255, 255, 255, 0.06);
}
</style>
