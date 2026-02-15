<template lang="pug">
.prop-group
  .prop-label 布局
  .prop-row
    .prop-field
      span.label 方向
      .align-group
        button.align-btn(:class="{ active: layoutDir === 'free' }" @click="setLayoutDir('free')") 自由
        button.align-btn(:class="{ active: layoutDir === 'horizontal' }" @click="setLayoutDir('horizontal')") 横向
        button.align-btn(:class="{ active: layoutDir === 'vertical' }" @click="setLayoutDir('vertical')") 纵向
  .prop-row(v-if="layoutDir !== 'free'")
    .prop-field
      span.label 间距
      input.input(type="number" :value="layer?.layoutProps.gap ?? 0" step="1" min="0" @change="onGapChange" @blur="$emit('editEnd')")
      span.unit px
</template>

<script setup lang="ts">
// 布局属性编辑子组件 (仅容器类型)
import { computed } from 'vue'
import type { Layer } from '@engine/scene/types'

const props = defineProps<{ layer: Layer | null, ensureSnapshot: () => void }>()
defineEmits<{ editEnd: [] }>()

const layoutDir = computed(() => props.layer?.layoutProps.layout ?? 'free')

function setLayoutDir(dir: string): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.layoutProps.layout = dir as 'free' | 'horizontal' | 'vertical'
}

function onGapChange(e: Event): void {
  if (!props.layer) return
  props.ensureSnapshot()
  props.layer.layoutProps.gap = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0)
}
</script>
