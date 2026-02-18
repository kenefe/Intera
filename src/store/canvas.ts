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
  const activeGroupId = ref('group_main')

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

  /** 自适应视口 — 缩放+居中内容至可视区域 */
  function fitToViewport(contentW: number, contentH: number, vpW: number, vpH: number): void {
    const PAD = 40 // 舒适留白
    const z = Math.min((vpW - PAD * 2) / contentW, (vpH - PAD * 2) / contentH, 3)
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
    panX.value = (vpW - contentW * zoom.value) / 2
    panY.value = (vpH - contentH * zoom.value) / 2
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

  function setActiveGroup(id: string): void {
    activeGroupId.value = id
  }

  /** 将画布平移到让指定图层居中 */
  function focusOnLayer(lx: number, ly: number, lw: number, lh: number, vpW: number, vpH: number): void {
    const cx = lx + lw / 2, cy = ly + lh / 2
    panX.value = vpW / 2 - cx * zoom.value
    panY.value = vpH / 2 - cy * zoom.value
  }

  return {
    zoom, panX, panY, selectedLayerIds, hasSelection, activeGroupId,
    setZoom, setPan, resetViewport, fitToViewport,
    select, addToSelection, removeFromSelection, toggleSelection, clearSelection,
    setActiveGroup, focusOnLayer,
  }
})
