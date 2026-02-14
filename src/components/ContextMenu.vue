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
  position: fixed; z-index: 9999; min-width: 180px; padding: 4px;
  background: #252540; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.ctx-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; border-radius: 4px; font-size: 12px;
  cursor: pointer; color: rgba(255, 255, 255, 0.8); transition: background 0.08s;
}
.ctx-item:hover { background: rgba(91, 91, 240, 0.2); }
.ctx-item.disabled { opacity: 0.3; pointer-events: none; }

.shortcut { font-size: 10px; opacity: 0.4; margin-left: 16px; }
.ctx-sep { height: 1px; background: rgba(255, 255, 255, 0.08); margin: 4px 0; }
</style>
