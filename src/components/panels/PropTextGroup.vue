<template lang="pug">
.prop-group
  .prop-label 文本
  .prop-row
    textarea.text-input(
      :value="layer?.text ?? ''"
      @input="onTextInput"
      @keydown="onTextKeydown"
      @blur="$emit('editEnd')"
      rows="2"
      placeholder="输入文本..."
    )
  .prop-row
    .prop-field
      span.label 字号
      input.input(type="number" :value="layer?.fontSize ?? 16" step="1" min="1" @change="onFontSizeChange" @blur="$emit('editEnd')")
      span.unit px
  .prop-row
    .prop-field
      span.label 字体
      select.select-input(
        :value="layer?.fontFamily ?? 'system-ui, sans-serif'"
        @change="onFontFamilyChange"
      )
        option(value="system-ui, sans-serif") 系统默认
        option(value="'Inter', sans-serif") Inter
        option(value="'Noto Sans SC', sans-serif") 思源黑体
        option(value="serif") 衬线体
        option(value="monospace") 等宽体
  .prop-row
    .prop-field
      span.label 字重
      select.select-input(
        :value="layer?.fontWeight ?? '400'"
        @change="onFontWeightChange"
      )
        option(value="300") 细体
        option(value="400") 常规
        option(value="500") 中等
        option(value="600") 半粗
        option(value="700") 粗体
  .prop-row
    .prop-field
      span.label 对齐
      .align-group
        button.align-btn(:class="{ active: (layer?.textAlign ?? 'left') === 'left' }" @click="setTextAlign('left')") 左
        button.align-btn(:class="{ active: layer?.textAlign === 'center' }" @click="setTextAlign('center')") 中
        button.align-btn(:class="{ active: layer?.textAlign === 'right' }" @click="setTextAlign('right')") 右
</template>

<script setup lang="ts">
// 文本属性编辑子组件
import type { Layer } from '@engine/scene/types'

const props = defineProps<{ layer: Layer | null, ensureSnapshot: () => void }>()
const emit = defineEmits<{ editEnd: [] }>()

function onTextInput(e: Event): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.text = (e.target as HTMLTextAreaElement).value
}

// Enter → 确认 (blur)，Shift+Enter → 换行
function onTextKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ;(e.target as HTMLTextAreaElement).blur()
  }
}

function onFontSizeChange(e: Event): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.fontSize = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 16)
}

function onFontFamilyChange(e: Event): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.fontFamily = (e.target as HTMLSelectElement).value
}

function onFontWeightChange(e: Event): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.fontWeight = (e.target as HTMLSelectElement).value
}

function setTextAlign(align: string): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.textAlign = align
}
</script>

<style scoped>
@import './prop-shared.css';

/* ── 文本输入框 ── */

.text-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 6px 8px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  resize: vertical;
  outline: none;
  transition: border-color 0.12s, background 0.12s;
  min-height: 36px;
}
.text-input:hover { border-color: rgba(255, 255, 255, 0.2); }
.text-input:focus { border-color: rgba(136, 136, 255, 0.5); background: rgba(255, 255, 255, 0.1); }

/* ── 下拉选择框 ── */

.select-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  padding: 4px 0;
  cursor: pointer;
  min-width: 0;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
.select-input option {
  background: #1e1e2e;
  color: #e0e0e0;
}

/* ── 对齐按钮组 ── */

.align-group {
  display: flex;
  gap: 2px;
  flex: 1;
}

.align-btn {
  flex: 1;
  padding: 3px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.12s;
}
.align-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.align-btn.active {
  background: rgba(136, 136, 255, 0.2);
  border-color: rgba(136, 136, 255, 0.4);
  color: #aaaaff;
  font-weight: 600;
}
</style>
