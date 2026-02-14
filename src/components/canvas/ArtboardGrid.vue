<template lang="pug">
.artboard-grid
  .state-group-row(v-for="group in groups" :key="group.id")
    .row-label {{ group.name }}
    .row-artboards
      Artboard(
        v-for="state in group.displayStates"
        :key="state.id"
        :display-state="state"
        :is-active="state.id === group.activeDisplayStateId"
      )
      .add-state-btn(@click="onAddState(group.id)") +
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@store/project'
import Artboard from './Artboard.vue'

const store = useProjectStore()
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
  gap: 12px;
}

.row-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 1px;
  padding-left: 4px;
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
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 20px;
  cursor: pointer;
  align-self: center;
  transition: border-color 0.15s, color 0.15s;
}

.add-state-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.6);
}
</style>
