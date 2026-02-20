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
import type { Patch } from '@engine/scene/types'
import { patchCategory } from '@engine/state/PatchDefs'
import { usePatchNodeConfig } from '@composables/usePatchNodeConfig'

const props = defineProps<{ patch: Patch; selected: boolean; connectedKeys: Set<string> }>()
defineEmits<{ delete: [] }>()

const category = patchCategory(props.patch.type)
const CONFIG_TYPES = [
  'touch', 'drag', 'to', 'setTo', 'delay',
  'condition', 'toggleVariable', 'setVariable',
  'behaviorDrag', 'behaviorScroll', 'transition',
]
const showConfig = CONFIG_TYPES.includes(props.patch.type)

const {
  cfgLayerId, cfgGroupId, cfgStateId, cfgDuration, cfgVariableId,
  cfgCompareValue, cfgValue, cfgAxis, cfgFromStateId, cfgToStateId, cfgInputRange,
  layers, groups, states, vars,
  onLayerPick, onGroupPick, onStatePick, onDelayChange, onVarPick,
  onCompareChange, onValueChange, onAxisPick, onFromStatePick, onToStatePick,
  onRangeLoChange, onRangeHiChange, onAddVar,
} = usePatchNodeConfig(() => props.patch)
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
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04);
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
  opacity: 0;
  transition: background var(--duration-fast), color var(--duration-fast), opacity var(--duration-fast);
}

.patch-node:hover .btn-delete { opacity: 1; }

.btn-delete:hover { background: rgba(239, 68, 68, 0.4); color: #fff; }

/* ── 分类配色 (鲜明但不刺眼) ── */
.cat-trigger  .node-header { background: #1b5e3b; }
.cat-logic    .node-header { background: #7c5a1e; }
.cat-action   .node-header { background: #3b3b8f; }
.cat-behavior .node-header { background: #7a2d5a; }

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
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.port-label.out { text-align: right; flex: 1; }
</style>
