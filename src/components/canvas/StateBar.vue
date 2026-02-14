<template lang="pug">
.state-bar
  .state-tabs
    .state-tab(
      v-for="state in displayStates"
      :key="state.id"
      :class="{ active: state.id === activeId, animating: state.id === store.liveStateId }"
      @click="onSwitch(state.id)"
    )
      span.state-name {{ state.name }}
      .delete-btn(
        v-if="displayStates.length > 1"
        @click.stop="onDelete(state.id)"
      ) &times;
    .add-btn(@click="onAdd" title="添加状态") +
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@store/project'

const store = useProjectStore()

// ── 当前状态组 (取第一组) ──

const group = computed(() => store.project.stateGroups[0])
const displayStates = computed(() => group.value?.displayStates ?? [])
const activeId = computed(() => group.value?.activeDisplayStateId)

function onSwitch(stateId: string): void {
  if (!group.value || stateId === activeId.value) return
  store.transitionToState(group.value.id, stateId)
}

function onAdd(): void {
  if (!group.value) return
  store.addDisplayState(group.value.id, `状态 ${displayStates.value.length + 1}`)
}

function onDelete(stateId: string): void {
  if (!group.value || displayStates.value.length <= 1) return
  store.removeDisplayState(group.value.id, stateId)
}
</script>

<style scoped>
.state-bar {
  height: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #16162a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.state-tabs { display: flex; gap: 4px; align-items: center; }

.state-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.45);
  transition: background 0.12s, color 0.12s;
  user-select: none;
}

.state-tab:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.7); }
.state-tab.active { background: rgba(91, 91, 240, 0.18); color: #a0a0ff; }
.state-tab.animating { box-shadow: 0 0 0 1px rgba(91, 91, 240, 0.4); }

.state-name { white-space: nowrap; }

.delete-btn {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.1s;
}

.state-tab:hover .delete-btn { opacity: 0.5; }
.delete-btn:hover { opacity: 1 !important; background: rgba(255, 60, 60, 0.2); color: #ff6060; }

.add-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}

.add-btn:hover {
  color: rgba(136, 136, 255, 0.9);
  background: rgba(136, 136, 255, 0.1);
  border-color: rgba(136, 136, 255, 0.3);
}
</style>
