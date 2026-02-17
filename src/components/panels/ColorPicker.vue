<template lang="pug">
.color-picker(@click.stop)
  .color-swatch(@click="toggle" :style="{ background: modelValue }")
  .color-dropdown(v-if="open")
    input.hex-input(
      ref="hexRef"
      type="text"
      :value="modelValue"
      maxlength="7"
      @input="onHex"
      @keydown.enter="close"
      @blur="close"
    )
    .palette
      .palette-color(
        v-for="c in PALETTE"
        :key="c"
        :style="{ background: c }"
        :class="{ active: c === modelValue }"
        @mousedown.prevent="pick(c)"
      )
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: []
}>()

const open = ref(false)
const hexRef = ref<HTMLInputElement>()

const PALETTE = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6',
  '#AF52DE', '#FF2D55', '#A2845E', '#8E8E93', '#48484A', '#636366',
  '#D9D9D9', '#F2F2F7', '#FF6961', '#FFB347', '#FDFD96', '#77DD77',
  '#89CFF0', '#B39EB5', '#CB99C9', '#FFD1DC', '#E6C9A8', '#CFCFC4',
]

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => hexRef.value?.select())
}

function close() {
  // 延迟关闭，让 palette mousedown 先触发
  setTimeout(() => { open.value = false }, 150)
}

function pick(c: string) {
  emit('update:modelValue', c)
  emit('change')
  open.value = false
}

function onHex(e: Event) {
  let v = (e.target as HTMLInputElement).value.trim()
  if (!v.startsWith('#')) v = '#' + v
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    emit('update:modelValue', v)
  }
}
</script>

<style scoped>
.color-picker { position: relative; flex: 1; min-width: 0; }

.color-swatch {
  width: 100%;
  height: 26px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.color-swatch:hover { border-color: var(--accent-border); }

.color-dropdown {
  position: absolute;
  top: 30px;
  left: 0;
  z-index: 100;
  background: var(--surface-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--sp-3);
  width: 192px;
  box-shadow: var(--shadow-lg);
}

.hex-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  padding: var(--sp-1) var(--sp-2);
  outline: none;
  margin-bottom: var(--sp-3);
  box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.hex-input:focus { border-color: var(--accent-border); }

.palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
}

.palette-color {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast);
}

.palette-color:hover {
  transform: scale(1.12);
  border-color: var(--border-hover);
}

.palette-color.active { border-color: var(--accent); border-width: 2px; }
</style>
