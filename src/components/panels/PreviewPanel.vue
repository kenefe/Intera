<template lang="pug">
.preview-panel
  .preview-header
    span.preview-title Preview
    span.state-badge(v-if="activeStateName") {{ activeStateName }}
    button.reset-btn(@click="onReset") Reset
  .preview-device(ref="containerRef")
    .preview-frame(
      ref="frameRef"
      :style="frameStyle"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
    )
  .preview-hint(v-if="hintText") {{ hintText }}
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PreviewPanel —— 实时交互预览
//  职责: 渲染 + 手势 + Level 0 自动循环
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  核心策略:
//  - 有 Patch → 正常 Patch 执行链路
//  - 无 Patch + 2个以上状态 → 点击自动循环
//  - 只有1个状态 → 提示用户添加第二个状态
//

import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'
import { DOMRenderer } from '@renderer/DOMRenderer'
import { usePreviewGesture } from '@/composables/usePreviewGesture'

const store = useProjectStore()
const patchStore = usePatchStore()
const preview = usePreviewGesture()

const containerRef = ref<HTMLElement>()
const frameRef = ref<HTMLElement>()
const renderer = new DOMRenderer()
const rendered = new Set<string>()

// ═══════════════════════════════════
//  自适应缩放
// ═══════════════════════════════════

const PAD = 12
const containerSize = ref({ w: 240, h: 400 })

const scale = computed(() => {
  const cw = store.project.canvasSize.width
  const ch = store.project.canvasSize.height
  const aw = Math.max(1, containerSize.value.w - PAD * 2)
  const ah = Math.max(1, containerSize.value.h - PAD * 2)
  return Math.min(aw / cw, ah / ch, 1)
})

const frameStyle = computed(() => {
  const cw = store.project.canvasSize.width
  const ch = store.project.canvasSize.height
  const s = scale.value
  const ox = (containerSize.value.w - cw * s) / 2
  const oy = (containerSize.value.h - ch * s) / 2
  return {
    width: `${cw}px`,
    height: `${ch}px`,
    transform: `translate(${ox}px, ${oy}px) scale(${s})`,
    transformOrigin: '0 0',
  }
})

// ═══════════════════════════════════
//  状态信息
// ═══════════════════════════════════

const activeStateId = computed(() =>
  store.project.stateGroups[0]?.activeDisplayStateId ?? null,
)

const stateList = computed(() =>
  store.project.stateGroups[0]?.displayStates ?? [],
)

const activeStateName = computed(() =>
  stateList.value.find(s => s.id === activeStateId.value)?.name ?? null,
)

const hasLayers = computed(() => Object.keys(store.project.layers).length > 0)

const hasTouchPatches = computed(() =>
  store.project.patches.some(p => p.type === 'touch'),
)

// ── 引导提示: 渐进式指引用户完成 Level 0 ──

const hasOverrides = computed(() =>
  stateList.value.some(s =>
    Object.values(s.overrides).some(o => Object.keys(o).length > 0),
  ),
)

const hintText = computed(() => {
  if (!hasLayers.value) return '按 R 绘制矩形开始设计'
  if (stateList.value.length < 2) return '画布底部 ＋ 添加第二个状态'
  if (!hasOverrides.value) return '选中图层修改属性，创造状态差异'
  if (!hasTouchPatches.value) return '点击此处预览动画'
  return ''
})

// ═══════════════════════════════════
//  手势 + Auto-cycle
// ═══════════════════════════════════

const canAutoCycle = computed(() =>
  !hasTouchPatches.value && stateList.value.length >= 2,
)

let downTs = 0, downX = 0, downY = 0

function onDown(e: PointerEvent): void {
  downTs = performance.now()
  downX = e.clientX; downY = e.clientY
  preview.down(e)
}

function onMove(e: PointerEvent): void {
  preview.move(e)
}

function onUp(e: PointerEvent): void {
  preview.up(e)
  // Level 0: 无 Patch 时点击自动循环状态
  const dt = performance.now() - downTs
  const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
  if (dt < 300 && dist < 10 && canAutoCycle.value) autoCycle()
}

function autoCycle(): void {
  const group = store.project.stateGroups[0]
  if (!group) return
  const list = group.displayStates
  const idx = list.findIndex(s => s.id === group.activeDisplayStateId)
  const next = list[(idx + 1) % list.length]
  if (next) store.transitionToState(group.id, next.id)
}

// ═══════════════════════════════════
//  图层渲染
// ═══════════════════════════════════

function syncLayers(): void {
  const { layers, rootLayerIds } = store.project
  const stateId = activeStateId.value
  if (!stateId) return

  const allIds = new Set(Object.keys(layers))

  for (const id of rendered) {
    if (!allIds.has(id)) { renderer.removeLayer(id); rendered.delete(id) }
  }

  for (const id of allIds) {
    const resolved = store.states.getResolvedProps(stateId, id)
    if (!resolved) continue
    const live = store.liveValues[id]
    const merged = live ? { ...resolved, ...live } : resolved
    if (rendered.has(id)) {
      renderer.updateLayer(id, merged)
    } else {
      renderer.createLayer(id, layers[id].type, merged as AnimatableProps)
      rendered.add(id)
    }
  }

  for (const id of allIds) {
    const layer = layers[id]
    if (layer) renderer.setLayerParent(id, layer.parentId)
  }
  renderer.setLayerOrder(rootLayerIds)
}

// ── 动画帧同步 ──

watchEffect(() => {
  for (const [id, vals] of Object.entries(store.liveValues)) {
    if (rendered.has(id)) renderer.updateLayer(id, vals as Partial<AnimatableProps>)
  }
}, { flush: 'sync' })

// ═══════════════════════════════════
//  重置
// ═══════════════════════════════════

function onReset(): void {
  patchStore.runtime.reset()
  patchStore.variables.reset()
  const group = store.project.stateGroups[0]
  if (group?.displayStates[0]) {
    store.transitionToState(group.id, group.displayStates[0].id)
  }
}

// ═══════════════════════════════════
//  生命周期
// ═══════════════════════════════════

let resizeObs: ResizeObserver | null = null

onMounted(() => {
  if (frameRef.value) { renderer.mount(frameRef.value); syncLayers() }
  if (containerRef.value) {
    resizeObs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      containerSize.value = { w: width, h: height }
    })
    resizeObs.observe(containerRef.value)
  }
})

onUnmounted(() => {
  renderer.destroy()
  preview.destroy()
  resizeObs?.disconnect()
})

watch(() => store.project, syncLayers, { deep: true })
watch(activeStateId, syncLayers)
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  flex: 3;
  min-height: 200px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.4;
}

.state-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(91, 91, 240, 0.18);
  color: #a0a0ff;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reset-btn {
  margin-left: auto;
  padding: 2px 8px;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.reset-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

.preview-device {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.preview-frame {
  background: #1e1e3a;
  border-radius: 8px;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.preview-hint {
  padding: 6px 12px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
</style>
