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
  template(v-if="curve.type === 'friction'")
    .param-row
      span.param-label 摩擦
      input.param-slider(type="range" min="0.01" max="1" step="0.01" :value="curve.friction ?? 0.48" @input="e => emit('update', { friction: num(e) })" data-testid="curve-friction" title="摩擦")
      input.param-input(type="number" min="0.01" max="1" step="0.01" :value="(curve.friction ?? 0.48).toFixed(2)" @change="e => emit('update', { friction: num(e) })" data-testid="curve-friction-input")
  template(v-if="curve.type === 'bezier' || curve.type === 'linear'")
    .param-row
      span.param-label 时长
      input.param-slider(type="range" min="0.05" max="3" step="0.05" :value="curve.duration ?? 0.3" @input="e => emit('update', { duration: num(e) })" data-testid="curve-duration" title="时长")
      input.param-input(type="number" min="0.05" max="3" step="0.05" :value="(curve.duration ?? 0.3).toFixed(2)" @change="e => emit('update', { duration: num(e) })" data-testid="curve-duration-input")
</template>

<script setup lang="ts">
import type { CurveConfig, CurveType } from '@engine/scene/types'

defineProps<{ curve: CurveConfig }>()

const emit = defineEmits<{
  update: [partial: Partial<CurveConfig>]
}>()

function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value) || 0
}

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
.curve-edit { display: flex; flex-direction: column; gap: 4px; }

.type-select {
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  font-size: 11px;
  outline: none;
  cursor: pointer;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-label {
  font-size: 10px;
  opacity: 0.4;
  min-width: 30px;
}

.param-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
}

.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8888ff;
  cursor: pointer;
}

.param-input {
  width: 48px;
  font-size: 10px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-align: right;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #e0e0e0;
  padding: 2px 4px;
  outline: none;
  -moz-appearance: textfield;
}
.param-input::-webkit-inner-spin-button,
.param-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.param-input:focus {
  border-color: rgba(136, 136, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
}
</style>
