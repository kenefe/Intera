// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useKeyboard —— 全局键盘快捷键
//  职责: 工具切换 + 删除 + 撤销/重做 + 保存 + 方向键微调
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import type { ToolType } from '@store/editor'
import { useProjectStore } from '@store/project'

// ── 常量 ──

const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select', f: 'frame', r: 'rectangle', o: 'ellipse', t: 'text',
}

const ARROW_DELTA: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1],
  ArrowLeft: [-1, 0], ArrowRight: [1, 0],
}

const NUDGE_SMALL = 1
const NUDGE_BIG = 10

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  composable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useKeyboard(): void {
  const canvas = useCanvasStore()
  const editor = useEditorStore()
  const project = useProjectStore()

  /** 是否正在编辑文本内容 (文本 input / textarea / contentEditable) */
  function isEditingText(e: KeyboardEvent): boolean {
    const el = e.target as HTMLElement
    if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true
    if (el.tagName === 'INPUT') {
      const t = (el as HTMLInputElement).type
      return t === 'text' || t === 'search' || t === 'url' || t === 'email' || t === 'password'
    }
    return false
  }

  /** 方向键微调选中图层 (1px / Shift+10px) */
  function nudge(dx: number, dy: number): void {
    const ids = canvas.selectedLayerIds
    if (!ids.length) return

    const group = project.project.stateGroups[0]
    const stateId = group?.activeDisplayStateId
    if (!stateId) return

    project.snapshot()
    const isDefault = group.displayStates[0]?.id === stateId

    for (const lid of ids) {
      const cur = project.states.getResolvedProps(stateId, lid)
      if (!cur) continue
      const nx = Math.round(cur.x + dx)
      const ny = Math.round(cur.y + dy)
      if (isDefault) {
        project.updateLayerProps(lid, { x: nx, y: ny })
      } else {
        project.setOverride(stateId, lid, { x: nx, y: ny })
      }
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    const meta = e.metaKey || e.ctrlKey

    // ── 全局修饰键 (输入框内也生效) ──

    if (meta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault(); project.undo(); return
    }
    if (meta && e.key === 'z' && e.shiftKey) {
      e.preventDefault(); project.redo(); return
    }
    if (meta && e.key === 's') {
      e.preventDefault(); project.save(); return
    }

    // ── 工具快捷键 — 文本编辑中除外，数值/颜色 input 中仍生效 ──

    const tool = TOOL_KEYS[e.key]
    if (tool) {
      if (isEditingText(e)) { /* 文本输入中，让出按键 */ }
      else {
        if (inInput) { e.preventDefault(); (e.target as HTMLElement).blur() }
        editor.setTool(tool)
        return
      }
    }

    // 其余快捷键在 input 内不生效
    if (inInput) return

    // ── 方向键微调 ──

    const delta = ARROW_DELTA[e.key]
    if (delta) {
      e.preventDefault()
      const step = e.shiftKey ? NUDGE_BIG : NUDGE_SMALL
      nudge(delta[0] * step, delta[1] * step)
      return
    }

    // ── 删除 ──

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = [...canvas.selectedLayerIds]
      canvas.clearSelection()
      for (const id of ids) project.removeLayer(id)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
