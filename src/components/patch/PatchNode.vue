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
        :class="{ connected: connectedKeys.has(patch.id + ':' + port.id) }"
      )
      .port-label {{ port.name }}
    .port-row(v-for="port in patch.outputs" :key="port.id")
      .port-label.out {{ port.name }}
      .port-dot.port-out(
        :data-patch-id="patch.id"
        :data-port-id="port.id"
        :data-port-dir="'out'"
        :class="{ connected: connectedKeys.has(patch.id + ':' + port.id) }"
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

    //- To / SetTo → 目标组 + 状态选择
    template(v-if="patch.type === 'to' || patch.type === 'setTo'")
      .cfg-row
        .cfg-label 目标
        select.cfg-select(@change="onGroupPick")
          option(value="" :selected="!cfgGroupId") 选择…
          option(
            v-for="g in groups" :key="g.id" :value="g.id"
            :selected="cfgGroupId === g.id"
          ) {{ g.name }}
      .cfg-row
        .cfg-label 状态
        select.cfg-select(@change="onStatePick" :disabled="!cfgGroupId")
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

    //- Transition → 图层 + 目标组 + 起始/结束状态 + 输入范围
    template(v-if="patch.type === 'transition'")
      .cfg-row
        .cfg-label 图层
        select.cfg-select(@change="onLayerPick")
          option(value="" :selected="!cfgLayerId") 选择…
          option(
            v-for="l in layers" :key="l.id" :value="l.id"
            :selected="cfgLayerId === l.id"
          ) {{ l.name }}
      .cfg-row
        .cfg-label 目标
        select.cfg-select(@change="onGroupPick")
          option(value="" :selected="!cfgGroupId") 选择…
          option(
            v-for="g in groups" :key="g.id" :value="g.id"
            :selected="cfgGroupId === g.id"
          ) {{ g.name }}
      .cfg-row
        .cfg-label 起始
        select.cfg-select(@change="onFromStatePick" :disabled="!cfgGroupId")
          option(value="" :selected="!cfgFromStateId") 选择…
          option(
            v-for="s in states" :key="s.id" :value="s.id"
            :selected="cfgFromStateId === s.id"
          ) {{ s.name }}
      .cfg-row
        .cfg-label 结束
        select.cfg-select(@change="onToStatePick" :disabled="!cfgGroupId")
          option(value="" :selected="!cfgToStateId") 选择…
          option(
            v-for="s in states" :key="s.id" :value="s.id"
            :selected="cfgToStateId === s.id"
          ) {{ s.name }}
      .cfg-row
        .cfg-label 范围
        input.cfg-input(
          type="number" :value="cfgInputRange?.[0] ?? 0"
          @change="onRangeLoChange" style="width: 48px"
        )
        span ~
        input.cfg-input(
          type="number" :value="cfgInputRange?.[1] ?? 1"
          @change="onRangeHiChange" style="width: 48px"
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
const props = defineProps<{ patch: Patch; selected: boolean; connectedKeys: Set<string> }>()
defineEmits<{ delete: [] }>()
const project = useProjectStore()
const patchStore = usePatchStore()

const category = patchCategory(props.patch.type)

// ── 可配置节点类型 ──

const CONFIG_TYPES = [
  'touch', 'drag', 'to', 'setTo', 'delay',
  'condition', 'toggleVariable', 'setVariable',
  'behaviorDrag', 'behaviorScroll', 'transition',
]
const showConfig = CONFIG_TYPES.includes(props.patch.type)

// ── 模板用 config 访问器 (避免 union 直接访问) ──

const cfgLayerId = computed(() => {
  const c = props.patch.config
  return 'layerId' in c ? (c.layerId as string | undefined) : undefined
})
const cfgGroupId = computed(() => {
  const c = props.patch.config
  return 'groupId' in c ? (c.groupId as string | undefined) : undefined
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

// ── Transition 专用 ──
const cfgFromStateId = computed(() => {
  const c = props.patch.config
  return c.type === 'transition' ? c.fromStateId : undefined
})
const cfgToStateId = computed(() => {
  const c = props.patch.config
  return c.type === 'transition' ? c.toStateId : undefined
})
const cfgInputRange = computed(() => {
  const c = props.patch.config
  return c.type === 'transition' ? c.inputRange : undefined
})

// ── 数据源 ──

const layers = computed(() =>
  Object.values(project.project.layers).map(l => ({ id: l.id, name: l.name })),
)

// ── 目标组列表 (主画面 + 组件) ──
const groups = computed(() =>
  project.project.stateGroups.map(g => ({ id: g.id, name: g.name })),
)

// ── 状态列表: 用 config.groupId 解析目标组 ──
const states = computed(() => {
  const gid = cfgGroupId.value
  const group = gid
    ? project.project.stateGroups.find(g => g.id === gid)
    : null
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

function onGroupPick(e: Event): void {
  const c = cfg(); if (!c) return
  const gid = (e.target as HTMLSelectElement).value
  if ('groupId' in c) c.groupId = gid || undefined
  if ('stateId' in c) c.stateId = undefined
  // Transition: 切换目标组 → 清空两端状态
  if (c.type === 'transition') { c.fromStateId = undefined; c.toStateId = undefined }
}

function onStatePick(e: Event): void {
  const c = cfg(); if (!c) return
  if ('stateId' in c) c.stateId = (e.target as HTMLSelectElement).value
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

// ── Transition 专用事件 ──

function onFromStatePick(e: Event): void {
  const c = cfg()
  if (c?.type === 'transition') c.fromStateId = (e.target as HTMLSelectElement).value || undefined
}
function onToStatePick(e: Event): void {
  const c = cfg()
  if (c?.type === 'transition') c.toStateId = (e.target as HTMLSelectElement).value || undefined
}
function onRangeLoChange(e: Event): void {
  const c = cfg()
  if (c?.type === 'transition') {
    const lo = Number((e.target as HTMLInputElement).value) || 0
    c.inputRange = [lo, c.inputRange?.[1] ?? 1]
  }
}
function onRangeHiChange(e: Event): void {
  const c = cfg()
  if (c?.type === 'transition') {
    const hi = Number((e.target as HTMLInputElement).value) || 1
    c.inputRange = [c.inputRange?.[0] ?? 0, hi]
  }
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
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border-default);
  user-select: none;
  cursor: grab;
  transition: box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.patch-node:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.patch-node.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1.5px var(--accent-border), var(--shadow-md);
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: var(--text-sm);
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
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.btn-delete:hover { background: rgba(239, 68, 68, 0.4); color: #fff; }

/* ── 分类配色 (更柔和的色调) ── */
.cat-trigger  .node-header { background: #1a4d35; }
.cat-logic    .node-header { background: #4d3d1a; }
.cat-action   .node-header { background: #2d2d6b; }
.cat-behavior .node-header { background: #4d1a3d; }

.node-ports { padding: var(--sp-1) 0; }

.port-row {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: var(--sp-2);
}

.port-row:has(.out) { flex-direction: row; justify-content: flex-end; }

.port-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: var(--surface-2);
  flex-shrink: 0;
  cursor: crosshair;
  position: relative;
  transition: background var(--duration-fast), border-color var(--duration-fast), box-shadow var(--duration-fast);
}

/* 扩大命中区域 (24×24) */
.port-dot::after {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: 50%;
}

.port-dot:hover {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 6px rgba(99, 102, 241, 0.5);
}

/* 已连接端口 — 实心圆点 */
.port-dot.connected { background: var(--accent); border-color: var(--accent); }

/* 输出端口着色以区分方向 */
.port-out { border-color: rgba(99, 102, 241, 0.35); }

.port-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.port-label.out { text-align: right; flex: 1; }
</style>
