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
.collapsible-group { margin-bottom: 8px; }

.group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
}

.group-title {
  font-size: 10px;
  opacity: 0.4;
  letter-spacing: 0.5px;
}

.chevron {
  font-size: 10px;
  opacity: 0.35;
  transition: transform 0.15s;
  display: inline-block;
  width: 12px;
  text-align: center;
}
.chevron.collapsed { transform: rotate(-90deg); }

.group-body { padding-left: 0; }
</style>
