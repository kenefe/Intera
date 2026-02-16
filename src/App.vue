<template lang="pug">
.intera-app
  //- ── 顶部工具栏 ──
  .toolbar
    .toolbar-tools
      .tool-btn(
        v-for="t in tools"
        :key="t.key"
        :data-tool="t.key"
        :class="{ active: editor.tool === t.key }"
        :title="t.tip"
        @click="editor.setTool(t.key)"
      )
        //- 选择工具: 光标箭头
        svg.tool-icon(v-if="t.key === 'select'" viewBox="0 0 16 16" fill="none")
          path(
            d="M5 2v9l2.5-2.5L9.5 13l1.5-1-2-4.5L13 7z"
            stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"
          )
        //- 绘图工具: 复用图层类型图标
        LayerIcon.tool-icon(v-else :type="t.key")
    .toolbar-center
      span.brand Intera
    .toolbar-actions
      button.btn-action(@click="onOpen") Open
      button.btn-action(@click="onSaveFile") Save
      button.btn-action(@click="showExport = true") Export

  //- ── 导出对话框 ──
  ExportDialog(v-if="showExport" @close="showExport = false")

  //- ── 三栏主体 ──
  .main
    .workspace
      .design-row
        .panel-left
          PreviewPanel
          .layers-section
            LayerPanel
        .canvas-area
          CanvasViewport
          StateBar
        .panel-right
          PropertiesPanel
          CurvePanel
      .patch-row
        PatchCanvas
        PatchVarPanel
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import type { ToolType } from '@store/editor'
import CanvasViewport from './components/canvas/CanvasViewport.vue'
import StateBar from './components/canvas/StateBar.vue'
import PreviewPanel from './components/panels/PreviewPanel.vue'
import LayerPanel from './components/panels/LayerPanel.vue'
import PropertiesPanel from './components/panels/PropertiesPanel.vue'
import CurvePanel from './components/panels/CurvePanel.vue'
import PatchCanvas from './components/patch/PatchCanvas.vue'
import PatchVarPanel from './components/patch/PatchVarPanel.vue'
import LayerIcon from './components/panels/LayerIcon.vue'
const ExportDialog = defineAsyncComponent(() => import('./components/ExportDialog.vue'))

const editor = useEditorStore()
const project = useProjectStore()
const showExport = ref(false)

const tools: Array<{ key: ToolType; tip: string }> = [
  { key: 'select',    tip: '选择 (V)' },
  { key: 'frame',     tip: '容器 (F)' },
  { key: 'rectangle', tip: '矩形 (R)' },
  { key: 'ellipse',   tip: '椭圆 (O)' },
  { key: 'text',      tip: '文本 (T)' },
]

// ── 文件操作 ──

async function onOpen(): Promise<void> { await project.openFile() }
async function onSaveFile(): Promise<void> { await project.saveFile() }

// ── 生命周期: 自动恢复 + 自动保存 ──

onMounted(() => {
  project.loadSaved()
  window.addEventListener('beforeunload', project.save)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', project.save)
})
</script>

<style scoped>
.intera-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

/* ── 工具栏 ── */

.toolbar {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #16162a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.toolbar-tools { display: flex; gap: 4px; }

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.1s, color 0.1s;
}

.tool-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.tool-btn.active { background: rgba(91, 91, 240, 0.3); color: #a0a0ff; box-shadow: inset 0 -2px 0 #7070ff; }

/* ── 工具图标 (覆盖 LayerIcon 类型配色，继承按钮状态色) ── */
.tool-icon { width: 16px; height: 16px; }
.tool-btn :deep(.layer-icon) { color: inherit; }

.toolbar-center { flex: 1; text-align: center; }

.brand {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  opacity: 0.4;
}

.toolbar-actions { display: flex; gap: 4px; align-items: center; }

/* ── 工具栏按钮 ── */

.btn-action {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.btn-action:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

/* ── 三栏主体 ── */

.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.workspace { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.design-row { flex: 1; display: flex; overflow: hidden; }

.panel-left {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: #16162a;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.layers-section {
  flex: 2;
  min-height: 120px;
  overflow-y: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-right {
  width: 280px;
  min-width: 280px;
  background: #16162a;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
}

.patch-row {
  display: flex;
  height: 320px;
  min-height: 200px;
  max-height: 45vh;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
</style>
