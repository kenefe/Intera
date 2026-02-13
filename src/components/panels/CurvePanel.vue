<template lang="pug">
.curve-panel
  .section-title 过渡曲线
  template(v-if="activeState")
    //- ── 全局曲线 ──
    .curve-group
      .group-label 全局
      CurveEdit(:curve="activeState.transition.curve" @update="setGlobal")

    //- ── 元素级覆盖 + 延迟 + 属性级覆盖 ──
    template(v-if="layer")
      .curve-group
        label.group-header
          input.toggle(type="checkbox" :checked="!!elemCurve" @change="toggleElem")
          span.group-label 元素覆盖
        CurveEdit(v-if="elemCurve" :curve="elemCurve" @update="setElem")

      //- 属性级覆盖 (仅关键属性)
      template(v-if="keyedProps.length")
        .curve-group(v-for="prop in keyedProps" :key="prop")
          label.group-header
            input.toggle(type="checkbox" :checked="!!getPropCurve(prop)" @change="toggleProp(prop)")
            span.group-label {{ prop }}
          CurveEdit(v-if="getPropCurve(prop)" :curve="getPropCurve(prop)" @update="p => setProp(prop, p)")

      //- 延迟
      .curve-group
        .group-label 延迟
        .delay-row
          input.delay-input(type="number" :value="elemDelay" @change="onDelay" min="0" step="50")
          span.delay-unit ms
  .empty-state(v-else) 无激活状态
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurveConfig, AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'
import CurveEdit from './CurveEdit.vue'

const canvas = useCanvasStore()
const store = useProjectStore()

// ── 当前上下文 ──

const group = computed(() => store.project.stateGroups[0])

const activeState = computed(() => {
  const id = group.value?.activeDisplayStateId
  return id ? store.states.findState(id) : undefined
})

const layer = computed(() => {
  const id = canvas.selectedLayerIds[0]
  return id ? store.scene.get(id) : undefined
})

const layerId = computed(() => layer.value?.id ?? '')

// ── 元素级曲线 ──

const elemCurve = computed(() =>
  activeState.value?.transition.elementCurves?.[layerId.value],
)

// ── 关键属性列表 (已设置覆盖的属性才可配置属性级曲线) ──

const keyedProps = computed<(keyof AnimatableProps)[]>(() => {
  if (!layer.value || !activeState.value) return []
  return store.states.getKeyProps(activeState.value.id, layer.value.id)
})

// ── 延迟 ──

const elemDelay = computed(() =>
  activeState.value?.transition.delays?.[layerId.value] ?? 0,
)

// ── 全局曲线 ──

function setGlobal(partial: Partial<CurveConfig>): void {
  if (!activeState.value) return
  Object.assign(activeState.value.transition.curve, partial)
}

// ── 元素级 ──

function toggleElem(): void {
  if (!activeState.value || !layerId.value) return
  const tc = activeState.value.transition
  if (!tc.elementCurves) tc.elementCurves = {}
  if (tc.elementCurves[layerId.value]) {
    delete tc.elementCurves[layerId.value]
  } else {
    tc.elementCurves[layerId.value] = { ...tc.curve }
  }
}

function setElem(partial: Partial<CurveConfig>): void {
  const curve = activeState.value?.transition.elementCurves?.[layerId.value]
  if (curve) Object.assign(curve, partial)
}

// ── 属性级 ──

function getPropCurve(prop: keyof AnimatableProps): CurveConfig | undefined {
  return activeState.value?.transition.propertyCurves?.[layerId.value]?.[prop]
}

function toggleProp(prop: keyof AnimatableProps): void {
  if (!activeState.value || !layerId.value) return
  const tc = activeState.value.transition
  if (!tc.propertyCurves) tc.propertyCurves = {}
  if (!tc.propertyCurves[layerId.value]) tc.propertyCurves[layerId.value] = {}
  const map = tc.propertyCurves[layerId.value]
  if (map[prop]) {
    delete map[prop]
    if (!Object.keys(map).length) delete tc.propertyCurves[layerId.value]
  } else {
    map[prop] = elemCurve.value ? { ...elemCurve.value } : { ...tc.curve }
  }
}

function setProp(prop: keyof AnimatableProps, partial: Partial<CurveConfig>): void {
  const curve = activeState.value?.transition.propertyCurves?.[layerId.value]?.[prop]
  if (curve) Object.assign(curve, partial)
}

// ── 延迟 ──

function onDelay(e: Event): void {
  if (!activeState.value || !layerId.value) return
  const tc = activeState.value.transition
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  if (!tc.delays) tc.delays = {}
  if (val <= 0) delete tc.delays[layerId.value]
  else tc.delays[layerId.value] = val
}
</script>

<style scoped>
.curve-panel { padding: 12px; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  margin-bottom: 10px;
}

.curve-group {
  margin-bottom: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.group-label {
  font-size: 10px;
  opacity: 0.45;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  margin-bottom: 6px;
}

.toggle {
  width: 12px;
  height: 12px;
  accent-color: #8888ff;
  cursor: pointer;
}

.delay-row { display: flex; align-items: center; gap: 6px; }

.delay-input {
  width: 80px;
  padding: 4px 6px;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  outline: none;
}

.delay-unit { font-size: 10px; opacity: 0.35; }

.empty-state {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.3;
}
</style>
