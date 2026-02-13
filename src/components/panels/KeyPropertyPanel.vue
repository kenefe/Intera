<template lang="pug">
.key-property-panel
  template(v-if="layer")
    .section-title 关键属性
    .key-list
      .key-item(
        v-for="prop in PROPS"
        :key="prop.key"
        :class="{ keyed: isKeyed(prop.key) }"
        @click="toggleKey(prop.key)"
      )
        .key-diamond(:class="{ active: isKeyed(prop.key) }") ◆
        .key-label {{ prop.label }}
  .empty-state(v-else) 选中图层以标记关键属性
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'
import { useCanvasStore } from '@store/canvas'
import { useProjectStore } from '@store/project'

const canvas = useCanvasStore()
const store = useProjectStore()

// ── 可标记的属性列表 ──

const PROPS: Array<{ key: keyof AnimatableProps; label: string }> = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'width', label: '宽度' },
  { key: 'height', label: '高度' },
  { key: 'rotation', label: '旋转' },
  { key: 'scaleX', label: '缩放 X' },
  { key: 'scaleY', label: '缩放 Y' },
  { key: 'opacity', label: '透明度' },
  { key: 'borderRadius', label: '圆角' },
  { key: 'fill', label: '填充' },
  { key: 'strokeWidth', label: '描边宽' },
]

// ── 状态 ──

const group = computed(() => store.project.stateGroups[0])
const activeStateId = computed(() => group.value?.activeDisplayStateId ?? null)

const layer = computed(() => {
  const id = canvas.selectedLayerIds[0]
  return id ? store.scene.get(id) : undefined
})

const overrides = computed(() => {
  if (!layer.value || !activeStateId.value) return {}
  return store.states.getOverrides(activeStateId.value, layer.value.id)
})

function isKeyed(prop: keyof AnimatableProps): boolean {
  return prop in overrides.value
}

function toggleKey(prop: keyof AnimatableProps): void {
  if (!layer.value || !activeStateId.value) return
  if (isKeyed(prop)) {
    store.clearOverride(activeStateId.value, layer.value.id, prop)
  } else {
    // 将当前基础值复制为覆盖值
    const val = layer.value.props[prop]
    store.setOverride(activeStateId.value, layer.value.id, { [prop]: val })
  }
}
</script>

<style scoped>
.key-property-panel { padding: 12px; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  margin-bottom: 8px;
}

.key-list { display: flex; flex-direction: column; gap: 1px; }

.key-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.1s, color 0.1s;
}

.key-item:hover { background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.7); }
.key-item.keyed { color: #a0a0ff; }

.key-diamond {
  font-size: 8px;
  opacity: 0.2;
  transition: opacity 0.1s, color 0.1s;
}

.key-diamond.active { opacity: 1; color: #8888ff; }

.key-label { flex: 1; }

.empty-state {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.3;
}
</style>
