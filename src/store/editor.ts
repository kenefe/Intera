// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Editor Store —— 编辑器状态
//  职责: 当前工具 + Patch 面板开关
//  预览已迁移为常驻面板，不再有模式切换
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref } from 'vue'
import { defineStore } from 'pinia'

// ── 类型 ──

export type ToolType = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'text'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  useEditorStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useEditorStore = defineStore('editor', () => {
  const tool = ref<ToolType>('select')
  const showPatchEditor = ref(false)

  // ── 工具切换 ──

  function setTool(t: ToolType): void { tool.value = t }

  // ── Patch 面板切换 ──

  function togglePatchEditor(): void { showPatchEditor.value = !showPatchEditor.value }

  return {
    tool, showPatchEditor,
    setTool, togglePatchEditor,
  }
})
