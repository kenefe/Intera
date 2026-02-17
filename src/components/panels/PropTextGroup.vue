<template lang="pug">
.prop-group
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--sp-2) var(--sp-3);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-family: var(--font-mono);
  resize: vertical;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
  min-height: 36px;
}

.text-input:hover { border-color: var(--border-hover); }
.text-input:focus { border-color: var(--accent-border); background: rgba(255, 255, 255, 0.06); }

/* ── 下拉选择框 ── */

.select-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  color: var(--text-primary);
  font-size: var(--text-base);
  font-family: inherit;
  outline: none;
  padding: var(--sp-1) 0;
  cursor: pointer;
  min-width: 0;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.select-input option {
  background: var(--surface-2);
  color: var(--text-primary);
}

/* ── 对齐按钮组 ── */

.align-group { display: flex; gap: 2px; flex: 1; }

.align-btn {
  flex: 1;
  padding: 3px 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.align-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.align-btn.active {
  background: var(--accent-bg-hover);
  border-color: var(--accent-border);
  color: var(--accent-text);
  font-weight: 600;
}
</style>
