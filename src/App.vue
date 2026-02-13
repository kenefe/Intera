<template lang="pug">
.intera-app
  //- ── 顶部工具栏 ──
  .toolbar
    .toolbar-tools
      .tool-btn(
        v-for="t in tools"
        :key="t.key"
        :class="{ active: editor.tool === t.key }"
        :title="t.tip"
        @click="editor.setTool(t.key)"
      ) {{ t.label }}
    .toolbar-center
      span.brand Intera
    .toolbar-actions
      button.btn-action(@click="onOpen") Open
      button.btn-action(@click="onSaveFile") Save
      button.btn-patch(@click="editor.togglePatchEditor" :class="{ active: editor.showPatchEditor }") Patch
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
          KeyPropertyPanel
          CurvePanel
      PatchCanvas(v-if="editor.showPatchEditor")
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@store/editor'
import { useProjectStore } from '@store/project'
import type { ToolType } from '@store/editor'
import { defineAsyncComponent } from 'vue'
import CanvasViewport from './components/canvas/CanvasViewport.vue'
import StateBar from './components/canvas/StateBar.vue'
import PreviewPanel from './components/panels/PreviewPanel.vue'
import LayerPanel from './components/panels/LayerPanel.vue'
import PropertiesPanel from './components/panels/PropertiesPanel.vue'
import KeyPropertyPanel from './components/panels/KeyPropertyPanel.vue'
import CurvePanel from './components/panels/CurvePanel.vue'
const PatchCanvas = defineAsyncComponent(() => import('./components/patch/PatchCanvas.vue'))
const ExportDialog = defineAsyncComponent(() => import('./components/ExportDialog.vue'))

const editor = useEditorStore()
const project = useProjectStore()
const showExport = ref(false)

const tools: Array<{ key: ToolType; label: string; tip: string }> = [
  { key: 'select', label: 'V', tip: '选择 (V)' },
  { key: 'frame', label: 'F', tip: '容器 (F)' },
  { key: 'rectangle', label: 'R', tip: '矩形 (R)' },
  { key: 'ellipse', label: 'O', tip: '椭圆 (O)' },
  { key: 'text', label: 'T', tip: '文本 (T)' },
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

.toolbar-tools { display: flex; gap: 2px; }

.tool-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.1s, color 0.1s;
}

.tool-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.tool-btn.active { background: rgba(91, 91, 240, 0.2); color: #8888ff; }

.toolbar-center { flex: 1; text-align: center; }

.brand {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  opacity: 0.4;
}

.toolbar-actions { display: flex; gap: 4px; align-items: center; }

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

.btn-patch {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.btn-patch:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.btn-patch.active { background: rgba(91, 91, 240, 0.2); color: #8888ff; }

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

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
</style>
