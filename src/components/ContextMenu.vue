<template lang="pug">
Teleport(to="body")
  .ctx-overlay(@mousedown="$emit('close')" @contextmenu.prevent="$emit('close')")
  .ctx-menu(:style="{ left: x + 'px', top: y + 'px' }")
    template(v-for="(item, i) in items" :key="i")
      .ctx-sep(v-if="item.divider")
      .ctx-item(v-else :class="{ disabled: item.disabled }" @click="!item.disabled && select(item.id)")
        span {{ item.label }}
        span.shortcut(v-if="item.shortcut") {{ item.shortcut }}
</template>

<script lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  右键菜单项类型 —— 可复用
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface MenuItem {
  id?: string
  label?: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
}
</script>

<script setup lang="ts">
defineProps<{ x: number; y: number; items: MenuItem[] }>()
const emit = defineEmits<{ close: []; select: [id: string] }>()
function select(id?: string) { if (id) { emit('select', id); emit('close') } }
</script>

<style scoped>
.ctx-overlay { position: fixed; inset: 0; z-index: 9998; }

.ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  padding: var(--sp-1);
  background: var(--surface-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.ctx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  cursor: pointer;
  color: var(--text-primary);
  transition: background var(--duration-fast) var(--ease-out);
}

.ctx-item:hover { background: var(--accent-bg); }
.ctx-item.disabled { opacity: 0.3; pointer-events: none; }

.shortcut {
  font-size: var(--text-xs);
  color: var(--text-disabled);
  margin-left: var(--sp-5);
}

.ctx-sep {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--sp-1) 0;
}
</style>
