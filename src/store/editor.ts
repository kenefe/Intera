// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Editor Store —— 编辑器状态
//  职责: 当前工具选择
//  预览 / Patch 均为常驻面板，无需切换
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

  function setTool(t: ToolType): void { tool.value = t }

  return { tool, setTool }
})
