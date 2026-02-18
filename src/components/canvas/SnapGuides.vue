<template lang="pug">
svg.snap-guides(v-if="guides.length")
  line(
    v-for="(g, i) in guides" :key="i"
    :x1="g.axis === 'x' ? px(g.pos) : 0"
    :y1="g.axis === 'y' ? py(g.pos) : 0"
    :x2="g.axis === 'x' ? px(g.pos) : '100%'"
    :y2="g.axis === 'y' ? py(g.pos) : '100%'"
    stroke="#f43f5e" stroke-width="1" stroke-dasharray="3,3"
  )
</template>

<script setup lang="ts">
import type { GuideLine } from '@composables/useSnapGuides'
import { useCanvasStore } from '@store/canvas'

defineProps<{ guides: GuideLine[] }>()
const canvas = useCanvasStore()

function px(v: number) { return canvas.panX + v * canvas.zoom }
function py(v: number) { return canvas.panY + v * canvas.zoom }
</script>

<style scoped>
.snap-guides {
  position: absolute; inset: 0; pointer-events: none; z-index: 999;
  width: 100%; height: 100%;
}
</style>
