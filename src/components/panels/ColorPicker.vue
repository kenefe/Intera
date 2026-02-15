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
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.12s;
}
.color-swatch:hover { border-color: rgba(136, 136, 255, 0.4); }

.color-dropdown {
  position: absolute;
  top: 30px;
  left: 0;
  z-index: 100;
  background: #2a2a2e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 8px;
  width: 192px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.hex-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #e0e0e0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  padding: 4px 6px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.hex-input:focus { border-color: rgba(136, 136, 255, 0.5); }

.palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
}

.palette-color {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
}
.palette-color:hover { transform: scale(1.15); border-color: rgba(255, 255, 255, 0.4); }
.palette-color.active { border-color: #8888ff; border-width: 2px; }
</style>
