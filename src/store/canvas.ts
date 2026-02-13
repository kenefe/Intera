// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Canvas Store —— 画布视口
//  职责: zoom / pan / 选区管理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// ── 常量 ──

const MIN_ZOOM = 0.1
const MAX_ZOOM = 10

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useCanvasStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useCanvasStore = defineStore('canvas', () => {
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const selectedLayerIds = ref<string[]>([])

  // ── 衍生 ──

  const hasSelection = computed(() => selectedLayerIds.value.length > 0)

  // ── 视口操作 ──

  function setZoom(z: number): void {
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
  }

  function setPan(x: number, y: number): void {
    panX.value = x
    panY.value = y
  }

  function resetViewport(): void {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
  }

  // ── 选区操作 ──

  function select(ids: string[]): void {
    selectedLayerIds.value = ids
  }

  function addToSelection(id: string): void {
    if (!selectedLayerIds.value.includes(id)) {
      selectedLayerIds.value.push(id)
    }
  }

  function removeFromSelection(id: string): void {
    selectedLayerIds.value = selectedLayerIds.value.filter(i => i !== id)
  }

  function toggleSelection(id: string): void {
    if (selectedLayerIds.value.includes(id)) {
      removeFromSelection(id)
    } else {
      addToSelection(id)
    }
  }

  function clearSelection(): void {
    selectedLayerIds.value = []
  }

  return {
    zoom, panX, panY, selectedLayerIds, hasSelection,
    setZoom, setPan, resetViewport,
    select, addToSelection, removeFromSelection, toggleSelection, clearSelection,
  }
})
