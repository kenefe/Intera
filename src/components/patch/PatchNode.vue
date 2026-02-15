<template lang="pug">
.patch-node(
  :style="{ left: patch.position.x + 'px', top: patch.position.y + 'px' }"
  :data-patch-id="patch.id"
  :class="['cat-' + category, { selected }]"
)
  .node-header
    span.header-text {{ patch.name }}
    button.btn-delete(@pointerdown.stop @click.stop="$emit('delete')" title="删除节点")
      svg(width="10" height="10" viewBox="0 0 10 10")
        path(d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round")
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
          option(value="" :selected="!cfgLayerId") 选择…
          option(
            v-for="l in layers" :key="l.id" :value="l.id"
            :selected="cfgLayerId === l.id"
          ) {{ l.name }}

    //- To / SetTo → 状态选择
    template(v-if="patch.type === 'to' || patch.type === 'setTo'")
      .cfg-row
        .cfg-label 状态
        select.cfg-select(@change="onStatePick")
          option(value="" :selected="!cfgStateId") 选择…
          option(
            v-for="s in states" :key="s.id" :value="s.id"
            :selected="cfgStateId === s.id"
          ) {{ s.name }}

    //- Delay → 延迟时长
    template(v-if="patch.type === 'delay'")
      .cfg-row
        .cfg-label 延迟
        input.cfg-input(
          type="number" min="0" step="100"
          :value="cfgDuration ?? 1000"
          @change="onDelayChange"
        )
        .cfg-unit ms

    //- Condition → 变量 + 比较值
    template(v-if="patch.type === 'condition'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!cfgVariableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="cfgVariableId === v.id"
          ) {{ v.name }}
        button.cfg-add(@click="onAddVar" title="新建变量") +
      .cfg-row
        .cfg-label 等于
        input.cfg-input(
          :value="String(cfgCompareValue ?? '')"
          @change="onCompareChange"
        )

    //- ToggleVariable → 变量选择
    template(v-if="patch.type === 'toggleVariable'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!cfgVariableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="cfgVariableId === v.id"
          ) {{ v.name }}
        button.cfg-add(@click="onAddVar" title="新建变量") +

    //- SetVariable → 变量 + 值
    template(v-if="patch.type === 'setVariable'")
      .cfg-row
        .cfg-label 变量
        select.cfg-select(@change="onVarPick")
          option(value="" :selected="!cfgVariableId") 选择…
          option(
            v-for="v in vars" :key="v.id" :value="v.id"
            :selected="cfgVariableId === v.id"
          ) {{ v.name }}
        button.cfg-add(@click="onAddVar" title="新建变量") +
      .cfg-row
        .cfg-label 值
        input.cfg-input(
          :value="String(cfgValue ?? '')"
          @change="onValueChange"
        )

    //- BehaviorDrag / BehaviorScroll → 图层 + 轴
    template(v-if="patch.type === 'behaviorDrag' || patch.type === 'behaviorScroll'")
      .cfg-row
        .cfg-label 图层
        select.cfg-select(@change="onLayerPick")
          option(value="" :selected="!cfgLayerId") 选择…
          option(
            v-for="l in layers" :key="l.id" :value="l.id"
            :selected="cfgLayerId === l.id"
          ) {{ l.name }}
      .cfg-row
        .cfg-label 轴
        select.cfg-select(@change="onAxisPick")
          option(value="both" :selected="cfgAxis === 'both'") 双轴
          option(value="x" :selected="cfgAxis === 'x'") X
          option(value="y" :selected="cfgAxis === 'y'") Y
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchNode —— Patch 节点 UI
//  职责: 端口展示 + 内联配置编辑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { computed } from 'vue'
import type { Patch, PatchConfig } from '@engine/scene/types'
import { patchCategory } from '@engine/state/PatchDefs'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'

const props = defineProps<{ patch: Patch; selected: boolean }>()
defineEmits<{ delete: [] }>()
const project = useProjectStore()
const patchStore = usePatchStore()

const category = patchCategory(props.patch.type)

// ── 可配置节点类型 ──

const CONFIG_TYPES = [
  'touch', 'drag', 'to', 'setTo', 'delay',
  'condition', 'toggleVariable', 'setVariable',
  'behaviorDrag', 'behaviorScroll',
]
const showConfig = CONFIG_TYPES.includes(props.patch.type)

// ── 模板用 config 访问器 (避免 union 直接访问) ──

const cfgLayerId = computed(() => {
  const c = props.patch.config
  return 'layerId' in c ? (c.layerId as string | undefined) : undefined
})
const cfgStateId = computed(() => {
  const c = props.patch.config
  return 'stateId' in c ? (c.stateId as string | undefined) : undefined
})
const cfgDuration = computed(() => {
  const c = props.patch.config
  return c.type === 'delay' ? c.duration : undefined
})
const cfgVariableId = computed(() => {
  const c = props.patch.config
  return 'variableId' in c ? (c.variableId as string | undefined) : undefined
})
const cfgCompareValue = computed(() => {
  const c = props.patch.config
  return c.type === 'condition' ? c.compareValue : undefined
})
const cfgValue = computed(() => {
  const c = props.patch.config
  return c.type === 'setVariable' ? c.value : undefined
})
const cfgAxis = computed(() => {
  const c = props.patch.config
  return 'axis' in c ? (c.axis as string | undefined) : undefined
})

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

function cfg(): PatchConfig | null {
  return project.project.patches.find(p => p.id === props.patch.id)?.config ?? null
}

function onLayerPick(e: Event): void {
  const c = cfg()
  if (c && ('layerId' in c)) {
    c.layerId = (e.target as HTMLSelectElement).value
    // 行为节点配置变更 → 重建 BehaviorInstance
    patchStore.runtime.rebuild()
  }
}

function onStatePick(e: Event): void {
  const c = cfg(); if (!c) return
  if ('stateId' in c) c.stateId = (e.target as HTMLSelectElement).value
  if ('groupId' in c) c.groupId = project.project.stateGroups[0]?.id
}

function onDelayChange(e: Event): void {
  const c = cfg()
  if (c && c.type === 'delay') c.duration = Number((e.target as HTMLInputElement).value) || 1000
}

function onVarPick(e: Event): void {
  const c = cfg()
  if (c && 'variableId' in c) c.variableId = (e.target as HTMLSelectElement).value
}

function onCompareChange(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  const c = cfg()
  if (!c || c.type !== 'condition') return
  if (v === 'true') c.compareValue = true
  else if (v === 'false') c.compareValue = false
  else if (!isNaN(Number(v)) && v !== '') c.compareValue = Number(v)
  else c.compareValue = v
}

function onValueChange(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  const c = cfg()
  if (!c || c.type !== 'setVariable') return
  if (v === 'true') c.value = true
  else if (v === 'false') c.value = false
  else if (!isNaN(Number(v)) && v !== '') c.value = Number(v)
  else c.value = v
}

// ── Behavior 轴选择 ──

function onAxisPick(e: Event): void {
  const c = cfg()
  if (c && 'axis' in c) c.axis = (e.target as HTMLSelectElement).value as 'x' | 'y' | 'both'
}

// ── 就地创建变量 (消除空下拉摩擦) ──

function onAddVar(): void {
  const n = vars.value.length
  const name = n === 0 ? 'isToggled' : `isToggled_${n + 1}`
  const v = patchStore.addVariable(name, 'boolean', false)
  const c = cfg()
  if (c && 'variableId' in c) c.variableId = v.id
}
</script>

<style scoped>
@import './patch-config.css';

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
.patch-node.selected {
  border-color: rgba(136, 136, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(136, 136, 255, 0.3), 0 2px 12px rgba(0, 0, 0, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff;
}
.header-text { flex: 1; }

.btn-delete {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
.btn-delete:hover { background: rgba(255, 80, 80, 0.5); color: #fff; }

/* 分类配色 */
.cat-trigger .node-header { background: #2a6b4a; }
.cat-logic   .node-header { background: #6b5a2a; }
.cat-action  .node-header { background: #3a3a8b; }
.cat-behavior .node-header { background: #6b2a5a; }

.node-ports { padding: 4px 0; }

.port-row {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: 6px;
}
.port-row:has(.out) { flex-direction: row; justify-content: flex-end; }

.port-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  background: #1e1e3a;
  flex-shrink: 0;
  cursor: crosshair;
  position: relative;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
}
/* 扩大命中区域 (24×24) —— 不改变视觉尺寸 */
.port-dot::after {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: 50%;
}
.port-dot:hover {
  background: #8888ff;
  border-color: #8888ff;
  box-shadow: 0 0 6px rgba(136, 136, 255, 0.6);
}
/* 输出端口着色以区分方向 */
.port-out { border-color: rgba(136, 136, 255, 0.4); }

.port-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}
.port-label.out { text-align: right; flex: 1; }

</style>
