<template lang="pug">
.prop-group
  .prop-label 文本
  .prop-row
    textarea.text-input(
      :value="layer?.text ?? ''"
      @input="onTextInput"
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
