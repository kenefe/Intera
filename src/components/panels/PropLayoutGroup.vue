<template lang="pug">
.prop-group
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

<style scoped>
@import './prop-shared.css';

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
