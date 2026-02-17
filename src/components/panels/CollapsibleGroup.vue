<template lang="pug">
.collapsible-group
  .group-header(@click="open = !open")
    span.chevron(:class="{ collapsed: !open }") ▾
    span.group-title {{ title }}
  .group-body(v-show="open")
    slot
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ title: string; collapsed?: boolean }>()
const open = ref(!props.collapsed)
watch(() => props.collapsed, v => { open.value = !v })
</script>

<style scoped>
.collapsible-group { margin-bottom: var(--sp-3); }

.group-header {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) 0;
  cursor: pointer;
  user-select: none;
}

.group-title {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
  transition: color var(--duration-fast);
}

.group-header:hover .group-title { color: var(--text-secondary); }

.chevron {
  font-size: var(--text-xs);
  color: var(--text-disabled);
  transition: transform var(--duration-normal) var(--ease-out),
              color var(--duration-fast);
  display: inline-block;
  width: 12px;
  text-align: center;
}

.group-header:hover .chevron { color: var(--text-tertiary); }
.chevron.collapsed { transform: rotate(-90deg); }

.group-body { padding-left: 0; }
</style>
