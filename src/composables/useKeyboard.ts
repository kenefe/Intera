// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useKeyboard —— 全局键盘快捷键
//  职责: 工具切换 + 删除 + 撤销/重做 + 保存
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@store/canvas'
import { useEditorStore } from '@store/editor'
import type { ToolType } from '@store/editor'
import { useProjectStore } from '@store/project'

// ── 工具映射 ──

const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select', f: 'frame', r: 'rectangle', o: 'ellipse', t: 'text',
}

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

    // 其余快捷键在 input 内不生效 (Delete/Backspace 留给输入框)
    if (inInput) return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = [...canvas.selectedLayerIds]
      canvas.clearSelection()
      for (const id of ids) project.removeLayer(id)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
