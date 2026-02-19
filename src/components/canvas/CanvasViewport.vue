<template lang="pug">
.canvas-viewport(
  ref="viewportRef"
  @wheel.prevent="onWheel"
  @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
  @contextmenu.prevent="onContextMenu"
  @drop.prevent="onDrop"
  @dragover.prevent
)
  .canvas-world(:style="worldStyle")
    ArtboardGrid
  .marquee-box(v-if="interaction.marquee.value.visible" :style="marqueeStyle")
  SelectionOverlay
  SnapGuides(:guides="interaction.guides.value")
  ContextMenu(
    v-if="ctx.show"
    :x="ctx.x" :y="ctx.y" :items="ctxItems"
    @close="ctx.show = false"
    @select="onCtxAction"
  )
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CanvasViewport —— 设计画布
//  职责: 缩放 / 平移 / 图层交互 / 绘制工具
//  预览交互已迁移到 PreviewPanel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import { useLayerInteraction, findLayerIdFromTarget } from '@/composables/useLayerInteraction'
import { useDrawTool } from '@/composables/useDrawTool'
import { useTextTool } from '@/composables/useTextTool'
import { useKeyboard } from '@/composables/useKeyboard'
import ArtboardGrid from './ArtboardGrid.vue'
import SelectionOverlay from './SelectionOverlay.vue'
import SnapGuides from './SnapGuides.vue'
import ContextMenu from '../ContextMenu.vue'
import type { MenuItem } from '../ContextMenu.vue'

const canvas = useCanvasStore()
const editor = useEditorStore()
const project = useProjectStore()
const viewportRef = ref<HTMLElement>()

const interaction = useLayerInteraction(viewportRef)
const draw = useDrawTool(viewportRef)
const text = useTextTool(viewportRef)
useKeyboard()

// ── 缩放/平移 → CSS transform ──

const worldStyle = computed(() => ({
  transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
  transformOrigin: '0 0',
}))

const marqueeStyle = computed(() => {
  const box = interaction.marquee.value
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  }
})

const ctx = reactive({ show: false, x: 0, y: 0 })
const ctxItems = computed<MenuItem[]>(() => {
  const id = canvas.selectedLayerIds[0]
  const layer = id ? project.project.layers[id] : null
  const single = canvas.selectedLayerIds.length === 1
  return [
    { id: 'dup', label: '复制图层', shortcut: '⌘D' },
    { id: 'comp', label: '创建组件', disabled: !single || layer?.type !== 'frame' },
    { divider: true },
    { id: 'del', label: '删除', shortcut: 'Del' },
  ]
})

// ── 滚轮/触控板 → 缩放 or 平移 ──
//
// macOS 触控板捏合 → ctrlKey: true → 缩放
// 触控板双指滚动   → ctrlKey: false → 平移
// 鼠标 Ctrl+滚轮   → ctrlKey: true → 缩放

function onWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    // ── 缩放 (捏合手势 / Ctrl+滚轮) ──
    const rect = viewportRef.value!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const step = e.deltaMode === 1 ? e.deltaY * 0.05 : e.deltaY * 0.005
    const z = canvas.zoom * Math.exp(-step)
    canvas.setPan(
      mx - (mx - canvas.panX) * (z / canvas.zoom),
      my - (my - canvas.panY) * (z / canvas.zoom),
    )
    canvas.setZoom(z)
  } else {
    // ── 平移 (双指滚动 / 鼠标滚轮) ──
    const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    canvas.setPan(canvas.panX - dx, canvas.panY - dy)
  }
}

// ── 空格 + 拖拽平移 ──

let spaceDown = false
let panning = false
let sx = 0, sy = 0, spx = 0, spy = 0

function onKeyDown(e: KeyboardEvent): void { if (e.code === 'Space' && !e.repeat) spaceDown = true }
function onKeyUp(e: KeyboardEvent): void { if (e.code === 'Space') { spaceDown = false; panning = false } }

function onPointerDown(e: PointerEvent): void {
  if (spaceDown) {
    panning = true; sx = e.clientX; sy = e.clientY; spx = canvas.panX; spy = canvas.panY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    return
  }
  interaction.down(e); draw.down(e); text.down(e)
}

function onPointerMove(e: PointerEvent): void {
  if (panning) { canvas.setPan(spx + e.clientX - sx, spy + e.clientY - sy); return }
  interaction.move(e); draw.move(e)
}

function onPointerUp(e: PointerEvent): void {
  panning = false
  interaction.up(); draw.up(e); text.up()
}

function onContextMenu(e: MouseEvent): void {
  if (editor.tool !== 'select') return
  const id = findLayerIdFromTarget(e.target)
  if (id && !canvas.selectedLayerIds.includes(id)) canvas.select([id])
  if (!id && canvas.selectedLayerIds.length === 0) return
  Object.assign(ctx, { show: true, x: e.clientX, y: e.clientY })
}

function onCtxAction(action: string): void {
  ctx.show = false
  const ids = [...canvas.selectedLayerIds]
  const actions: Record<string, () => void> = {
    dup: () => duplicateSelection(ids),
    comp: () => makeComponent(ids[0]),
    del: () => deleteSelection(ids),
  }
  actions[action]?.()
}

function duplicateSelection(ids: string[]): void {
  const created: string[] = []
  for (const id of ids) {
    const l = project.project.layers[id]
    if (!l) continue
    const c = project.addLayer(l.type, l.parentId, undefined, `${l.name} 副本`)
    project.updateLayerProps(c.id, { ...l.props, x: l.props.x + 12, y: l.props.y + 12 })
    if (l.text !== undefined) { c.text = l.text; c.fontSize = l.fontSize }
    created.push(c.id)
  }
  if (created.length) canvas.select(created)
}

function makeComponent(id?: string): void {
  if (!id) return
  const layer = project.project.layers[id]
  if (!layer || layer.type !== 'frame') return
  // 确保有 StateGroup（没有则创建）
  let sg = project.project.stateGroups.find(g => g.rootLayerId === id)
  if (!sg) {
    sg = project.addStateGroup(layer.name, id)
    const s = project.addDisplayState(sg.id, '默认')
    if (s) project.switchState(sg.id, s.id)
  }
  // 创建 ComponentDef
  project.createComponent(id, layer.name)
}

function deleteSelection(ids: string[]): void {
  for (const id of ids) project.removeLayer(id)
  canvas.clearSelection()
}

// ── 初始适配 — 画板缩放+居中至可视区域 ──

function contentBounds(): { w: number; h: number } {
  const p = project.project
  const { width: cw, height: ch } = p.canvasSize
  let maxW = 0, totalH = 80 // 顶部 padding
  for (let i = 0; i < p.stateGroups.length; i++) {
    const n = p.stateGroups[i].displayStates.length
    maxW = Math.max(maxW, n * cw + (n - 1) * 80 + 80 + 48)
    totalH += 30 + ch + 20 // 行标签 + 画板 + 底标签
    if (i < p.stateGroups.length - 1) totalH += 120
  }
  return { w: maxW + 160, h: totalH + 80 }
}

function fitViewport(): void {
  const vp = viewportRef.value
  if (!vp) return
  const { w, h } = contentBounds()
  canvas.fitToViewport(w, h, vp.clientWidth, vp.clientHeight)
}

// ── 图片导入 (拖拽 + 粘贴) ──

function fileToDataURL(file: File): Promise<string> {
  return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(file) })
}

async function importImage(file: File, cx?: number, cy?: number): Promise<void> {
  const src = await fileToDataURL(file)
  const img = new Image()
  img.src = src
  await img.decode()
  let w = img.naturalWidth, h = img.naturalHeight
  const max = 400
  if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s) }
  const layer = project.addLayer('image', null, undefined, file.name.replace(/\.\w+$/, ''))
  layer.imageSrc = src
  project.updateLayerProps(layer.id, { width: w, height: h, x: (cx ?? 100), y: (cy ?? 100) })
  canvas.select([layer.id])
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  const file = [...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'))
  if (!file) return
  const rect = viewportRef.value!.getBoundingClientRect()
  const cx = (e.clientX - rect.left - canvas.panX) / canvas.zoom
  const cy = (e.clientY - rect.top - canvas.panY) / canvas.zoom
  importImage(file, cx, cy)
}

function onPaste(e: ClipboardEvent): void {
  const file = [...(e.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
  if (file) { e.preventDefault(); importImage(file) }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('paste', onPaste)
  requestAnimationFrame(fitViewport)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('paste', onPaste)
})
</script>

<style scoped>
.canvas-viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  cursor: default;
  background: var(--surface-0);
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.024) 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.marquee-box {
  position: absolute;
  border: 1px solid var(--accent);
  background: var(--accent-bg);
  pointer-events: none;
  z-index: 6;
}
</style>
