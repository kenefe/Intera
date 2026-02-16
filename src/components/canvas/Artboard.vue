<template lang="pug">
.artboard(:class="{ active: isActive }")
  .artboard-frame(
    ref="frameRef"
    :style="frameStyle"
    :data-state-id="displayState.id"
  )
  .artboard-label {{ displayState.name }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import type { DisplayState, AnimatableProps } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { DOMRenderer } from '@renderer/DOMRenderer'

const props = defineProps<{
  displayState: DisplayState
  isActive: boolean
  rootLayerId: string | null
}>()

const store = useProjectStore()
const frameRef = ref<HTMLElement>()
const renderer = new DOMRenderer()

// ── 画板尺寸 (组件 → 根图层 resolved 尺寸, 主画面 → canvasSize) ──

const frameStyle = computed(() => {
  if (props.rootLayerId) {
    const r = store.states.getResolvedProps(props.displayState.id, props.rootLayerId)
    if (r) return { width: `${r.width}px`, height: `${r.height}px` }
  }
  return { width: `${store.project.canvasSize.width}px`, height: `${store.project.canvasSize.height}px` }
})

// ── 图层同步 ──

/** 已在 renderer 中创建的图层 ID 集合 */
const rendered = new Set<string>()
/** renderer 是否已挂载到 DOM */
let mounted = false

function syncLayers(): void {
  if (!mounted) return
  const { layers, rootLayerIds } = store.project
  const stateId = props.displayState.id

  // 作用域: 组件 → 仅渲染子树, 主画面 → 全部图层
  const rid = props.rootLayerId
  const scope = rid
    ? new Set([rid, ...store.scene.descendants(rid)])
    : new Set(Object.keys(layers))

  // 移除不在作用域内的图层
  for (const id of rendered) {
    if (!scope.has(id)) { renderer.removeLayer(id); rendered.delete(id) }
  }

  // 创建或更新图层
  for (const id of scope) {
    const layer = layers[id]
    if (!layer) continue
    const resolved = store.states.getResolvedProps(stateId, id)
    if (!resolved) continue
    if (rendered.has(id)) {
      renderer.updateLayer(id, resolved)
    } else {
      renderer.createLayer(id, layer.type, resolved)
      rendered.add(id)
    }
    if (layer.type === 'text') {
      renderer.setTextContent(id, layer.text ?? '', layer.fontSize ?? 16, layer.fontFamily, layer.fontWeight, layer.textAlign)
    }
  }

  // 层级顺序 + 父子关系 (组件根 → 视为画板根)
  for (const id of scope) {
    const layer = layers[id]
    if (!layer) continue
    renderer.setLayerParent(id, id === rid ? null : layer.parentId)
  }
  renderer.setLayerOrder(rid ? [rid] : rootLayerIds)
}

// ── 生命周期 ──

onMounted(() => {
  if (frameRef.value) {
    renderer.mount(frameRef.value)
    mounted = true
    syncLayers()
  }
})

onUnmounted(() => { mounted = false; renderer.destroy() })

watch(() => store.project, syncLayers, { deep: true, flush: 'post' })

// ── 动画帧同步 (弹簧过渡时直接刷新 DOM) ──

watchEffect(() => {
  if (store.liveStateId !== props.displayState.id) return
  for (const [id, vals] of Object.entries(store.liveValues)) {
    if (rendered.has(id)) renderer.updateLayer(id, vals as Partial<AnimatableProps>)
  }
}, { flush: 'sync' })
</script>

<style scoped>
.artboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.artboard-frame {
  background: #1e1e3a;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  position: relative;
  transition: border-color 0.15s;
}

.active .artboard-frame {
  border-color: #5b5bf0;
}

.artboard-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  letter-spacing: 0.5px;
}

.active .artboard-label {
  color: #5b5bf0;
}
</style>
