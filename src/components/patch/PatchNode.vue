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

  //- ── 节点配置区 ──
  .node-config(v-if="showConfig")

    //- Touch / Drag → 图层选择
    template(v-if="patch.type === 'touch' || patch.type === 'drag'")
      .cfg-row
        .cfg-label 图层
        select.cfg-select(@change="onLayerPick")
          option(value="" :selected="!patch.config.layerId") 选择…
          option(
            v-for="l in layers" :key="l.id" :value="l.id"
            :selected="patch.config.layerId === l.id"
          ) {{ l.name }}

    //- To / SetTo → 状态选择
    template(v-if="patch.type === 'to' || patch.type === 'setTo'")
      .cfg-row
        .cfg-label 状态
        select.cfg-select(@change="onStatePick")
          option(value="" :selected="!patch.config.stateId") 选择…
          option(
            v-for="s in states" :key="s.id" :value="s.id"
            :selected="patch.config.stateId === s.id"
          ) {{ s.name }}

    //- Delay → 延迟时长
    template(v-if="patch.type === 'delay'")
      .cfg-row
        .cfg-label 延迟
        input.cfg-input(
          type="number" min="0" step="100"
          :value="patch.config.duration ?? 1000"
          @change="onDelayChange"
        )
        .cfg-unit ms

    //- Condition → 变量 + 比较值
    template(v-if="patch.type === 'condition'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!patch.config.variableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="patch.config.variableId === v.id"
          ) {{ v.name }}
      .cfg-row
        .cfg-label 等于
        input.cfg-input(
          :value="String(patch.config.compareValue ?? '')"
          @change="onCompareChange"
        )

    //- ToggleVariable → 变量选择
    template(v-if="patch.type === 'toggleVariable'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!patch.config.variableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="patch.config.variableId === v.id"
          ) {{ v.name }}

    //- SetVariable → 变量 + 值
    template(v-if="patch.type === 'setVariable'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!patch.config.variableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="patch.config.variableId === v.id"
          ) {{ v.name }}
      .cfg-row
        .cfg-label 值
        input.cfg-input(
          :value="String(patch.config.value ?? '')"
          @change="onValueChange"
        )
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchNode —— Patch 节点 UI
//  职责: 端口展示 + 内联配置编辑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed } from 'vue'
import type { Patch } from '@engine/scene/types'
import { patchCategory } from '@engine/state/PatchDefs'
import { useProjectStore } from '@store/project'

const props = defineProps<{ patch: Patch }>()
const project = useProjectStore()

const category = patchCategory(props.patch.type)

// ── 可配置节点类型 ──

const CONFIG_TYPES = ['touch', 'drag', 'to', 'setTo', 'delay', 'condition', 'toggleVariable', 'setVariable']
const showConfig = CONFIG_TYPES.includes(props.patch.type)

// ── 数据源 ──

const layers = computed(() =>
  Object.values(project.project.layers).map(l => ({ id: l.id, name: l.name })),
)

const states = computed(() => {
  const group = project.project.stateGroups[0]
  return group ? group.displayStates.map(s => ({ id: s.id, name: s.name })) : []
})

const vars = computed(() =>
  project.project.variables.map(v => ({ id: v.id, name: v.name })),
)

// ── 配置写入 (直接修改 reactive 数据) ──

function cfg(): Record<string, unknown> | null {
  return project.project.patches.find(p => p.id === props.patch.id)?.config ?? null
}

function onLayerPick(e: Event): void {
  const c = cfg(); if (c) c.layerId = (e.target as HTMLSelectElement).value
}

function onStatePick(e: Event): void {
  const c = cfg(); if (!c) return
  c.stateId = (e.target as HTMLSelectElement).value
  c.groupId = project.project.stateGroups[0]?.id
}

function onDelayChange(e: Event): void {
  const c = cfg(); if (c) c.duration = Number((e.target as HTMLInputElement).value) || 1000
}

function onVarPick(e: Event): void {
  const c = cfg(); if (c) c.variableId = (e.target as HTMLSelectElement).value
}

function onCompareChange(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  const c = cfg(); if (!c) return
  // 尝试解析为布尔/数字, 否则字符串
  if (v === 'true') c.compareValue = true
  else if (v === 'false') c.compareValue = false
  else if (!isNaN(Number(v)) && v !== '') c.compareValue = Number(v)
  else c.compareValue = v
}

function onValueChange(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  const c = cfg(); if (!c) return
  if (v === 'true') c.value = true
  else if (v === 'false') c.value = false
  else if (!isNaN(Number(v)) && v !== '') c.value = Number(v)
  else c.value = v
}
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

/* ── 配置区 ── */

.node-config {
  padding: 4px 8px 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.cfg-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
}

.cfg-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  min-width: 28px;
  flex-shrink: 0;
}

.cfg-select {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  color: #ccc;
  font-size: 10px;
  padding: 2px 4px;
  cursor: pointer;
}

.cfg-input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  color: #ccc;
  font-size: 10px;
  padding: 2px 4px;
  outline: none;
}

.cfg-unit {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
