<template lang="pug">
.intent-panel(v-if="layerIntents.length || canAdd")
  .intent-header
    span.intent-title 交互
    button.intent-add(v-if="canAdd" @click="onAdd" title="添加交互") +
  .intent-list
    .intent-row(v-for="it in layerIntents" :key="it.id")
      span.intent-trigger {{ triggerLabel(it.trigger) }}
      span.intent-arrow →
      span.intent-action {{ actionLabel(it.action) }}
      button.intent-del(@click="onRemove(it.id)" title="删除") ×
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Intent, IntentTrigger, IntentAction } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { useCanvasStore } from '@store/canvas'
import { usePatchStore } from '@store/patch'
import { makeId } from '@engine/idFactory'

const project = useProjectStore()
const canvas = useCanvasStore()
const patch = usePatchStore()

const layerId = computed(() => canvas.selectedLayerIds[0] ?? null)
const layerIntents = computed(() =>
  layerId.value ? project.project.intents.filter(i => i.layerId === layerId.value) : []
)
const canAdd = computed(() => {
  if (!layerId.value) return false
  const g = project.project.stateGroups[0]
  return !!g && g.displayStates.length >= 2
})

function triggerLabel(t: IntentTrigger): string {
  return ({ tap: '点击', down: '按下', up: '松手', longPress: '长按' } as Record<string, string>)[t] ?? t
}

function actionLabel(a: IntentAction): string {
  const g = project.project.stateGroups[0]
  if (!g) return '?'
  if (a.kind === 'switch') {
    const na = g.displayStates.find(s => s.id === a.stateA)?.name ?? '?'
    const nb = g.displayStates.find(s => s.id === a.stateB)?.name ?? '?'
    return `切换 ${na} ↔ ${nb}`
  }
  if (a.kind === 'to' || a.kind === 'setTo') {
    const n = g.displayStates.find(s => s.id === a.stateId)?.name ?? '?'
    return `${a.kind === 'to' ? '过渡到' : '跳到'} ${n}`
  }
  if (a.kind === 'scale') return `缩放 ${a.value}`
  return '?'
}

function onAdd(): void {
  const lid = layerId.value
  const g = project.project.stateGroups[0]
  if (!lid || !g || g.displayStates.length < 2) return
  const intent: Intent = {
    id: makeId('intent'),
    layerId: lid,
    groupId: g.id,
    trigger: 'tap',
    action: { kind: 'switch', stateA: g.displayStates[0].id, stateB: g.displayStates[1].id },
  }
  project.addIntent(intent)
  // 自动生成 Switch 节点
  patch.addPatchNode('switch', { x: 40, y: 40 }, {
    layerId: lid, groupId: g.id,
    stateA: g.displayStates[0].id, stateB: g.displayStates[1].id,
  }, '切换')
}

function onRemove(id: string): void {
  project.removeIntent(id)
}
</script>

<style scoped>
.intent-panel { padding: var(--sp-2) var(--sp-3); }
.intent-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-1);
}
.intent-title { font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.intent-add {
  width: 20px; height: 20px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.06); color: var(--text-tertiary);
  font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border: none; transition: background var(--duration-fast);
}
.intent-add:hover { background: var(--accent-bg); color: var(--accent-text); }
.intent-row {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-1) 0; font-size: var(--text-sm);
}
.intent-trigger { color: #6ee7b7; font-weight: 500; }
.intent-arrow { color: var(--text-disabled); }
.intent-action { color: var(--text-primary); flex: 1; }
.intent-del {
  width: 16px; height: 16px; border-radius: var(--radius-sm);
  background: transparent; color: var(--text-disabled); font-size: 11px;
  cursor: pointer; border: none; opacity: 0;
  transition: opacity var(--duration-fast), color var(--duration-fast);
}
.intent-row:hover .intent-del { opacity: 1; }
.intent-del:hover { color: var(--danger); }
</style>
