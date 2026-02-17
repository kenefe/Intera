<template lang="pug">
.artboard-grid
  .state-group-row(
    v-for="group in groups" :key="group.id"
    :class="{ active: group.id === canvas.activeGroupId }"
    @click="canvas.setActiveGroup(group.id)"
  )
    .row-label {{ group.name }}
    .row-artboards
      Artboard(
        v-for="state in group.displayStates"
        :key="state.id"
        :display-state="state"
        :is-active="state.id === group.activeDisplayStateId"
        :root-layer-id="group.rootLayerId"
      )
      .add-state-btn(@click.stop="onAddState(group.id)") +
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import Artboard from './Artboard.vue'

const store = useProjectStore()
const canvas = useCanvasStore()
const groups = computed(() => store.project.stateGroups)

function onAddState(groupId: string): void {
  const group = groups.value.find(g => g.id === groupId)
  const count = group?.displayStates.length ?? 0
  store.addDisplayState(groupId, `状态 ${count + 1}`)
}
</script>

<style scoped>
.artboard-grid {
  display: flex;
  flex-direction: column;
  gap: 120px;
  padding: 80px;
}

.state-group-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  cursor: pointer;
}

.state-group-row.active > .row-label { color: var(--accent-light); }

.row-label {
  font-size: var(--text-base);
  color: var(--text-tertiary);
  letter-spacing: 1px;
  padding-left: var(--sp-1);
  transition: color var(--duration-fast);
}

.row-artboards {
  display: flex;
  gap: 80px;
  align-items: flex-start;
}

.add-state-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-lg);
  color: var(--text-disabled);
  font-size: 20px;
  cursor: pointer;
  align-self: center;
  transition: border-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}

.add-state-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent-light);
  background: var(--accent-bg);
}
</style>
