<template lang="pug">
.patch-node(
  :style="{ left: patch.position.x + 'px', top: patch.position.y + 'px' }"
  :data-patch-id="patch.id"
  :class="'cat-' + category"
)
  .node-header {{ patch.name }}
  .node-ports
    .port-row(v-for="port in patch.inputs" :key="port.id")
      .port-dot.port-in(
        :data-patch-id="patch.id"
        :data-port-id="port.id"
        :data-port-dir="'in'"
      )
      .port-label {{ port.name }}
    .port-row(v-for="port in patch.outputs" :key="port.id")
      .port-label.out {{ port.name }}
      .port-dot.port-out(
        :data-patch-id="patch.id"
        :data-port-id="port.id"
        :data-port-dir="'out'"
      )
</template>

<script setup lang="ts">
import type { Patch } from '@engine/scene/types'
import { patchCategory } from '@engine/state/PatchDefs'

const props = defineProps<{ patch: Patch }>()
const category = patchCategory(props.patch.type)
</script>

<style scoped>
.patch-node {
  position: absolute;
  width: 180px;
  border-radius: 6px;
  overflow: hidden;
  background: #1e1e3a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
  cursor: grab;
  transition: box-shadow 0.12s;
}
.patch-node:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4); }

.node-header {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff;
}

/* 分类配色 */
.cat-trigger .node-header { background: #2a6b4a; }
.cat-logic   .node-header { background: #6b5a2a; }
.cat-action  .node-header { background: #3a3a8b; }

.node-ports { padding: 4px 0; }

.port-row {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: 6px;
}
.port-row:has(.out) { flex-direction: row; justify-content: flex-end; }

.port-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  background: #1e1e3a;
  flex-shrink: 0;
  cursor: crosshair;
  transition: background 0.1s, border-color 0.1s;
}
.port-dot:hover { background: #8888ff; border-color: #8888ff; }

.port-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}
.port-label.out { text-align: right; flex: 1; }
</style>
