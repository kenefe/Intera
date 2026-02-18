<template lang="pug">
.intera-app
  //- ── 顶部工具栏 ──
  .toolbar
    .toolbar-tools
      .tool-btn(
        v-for="t in tools"
        :key="t.key"
        :data-tool="t.key"
        :class="{ active: editor.tool === t.key, flash: editor.toolFlash === t.key }"
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
      .resize-handle(@pointerdown="patchResize.onPointerDown")
        .resize-grip
      .patch-row(:style="{ height: patchResize.height.value + 'px' }")
        PatchCanvas
        PatchVarPanel
  Transition(name="fade")
    .toast-bar(v-if="editor.toast") {{ editor.toast }}
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
import { usePanelResize } from './composables/usePanelResize'
const ExportDialog = defineAsyncComponent(() => import('./components/ExportDialog.vue'))

const editor = useEditorStore()
const project = useProjectStore()
const showExport = ref(false)
const patchResize = usePanelResize('patchHeight', {
  defaultRatio: 1 / 3, min: 120, maxRatio: 0.6,
})

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
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  App Shell — 全局布局骨架             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

.intera-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-0);
  color: var(--text-primary);
  font-family: var(--font-sans);
  overflow: hidden;
}

/* ── 工具栏 ── */

.toolbar {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-4);
  background: rgba(38, 38, 40, 0.80);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-toolbar);
  z-index: 2;
  position: relative;
}

.toolbar-tools { display: flex; gap: 2px; }

.tool-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.tool-btn.active {
  background: var(--accent-bg-hover);
  color: var(--accent-text);
}

/* ── 工具图标 ── */
.tool-icon { width: 15px; height: 15px; }
.tool-btn :deep(.layer-icon) { color: inherit; }

.toolbar-center { flex: 1; text-align: center; }

.brand {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: var(--text-disabled);
}

.toolbar-actions { display: flex; gap: var(--sp-1); align-items: center; }

/* ── 工具栏按钮 ── */

.btn-action {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.10);
  color: var(--text-primary);
}

/* ── 三栏主体 ── */

.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.workspace { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.design-row { flex: 1; display: flex; overflow: hidden; }

.panel-left {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  box-shadow: var(--shadow-panel);
  z-index: 1;
  position: relative;
}

.layers-section {
  flex: 2;
  min-height: 120px;
  overflow-y: auto;
  border-top: 1px solid var(--border-subtle);
}

.panel-right {
  width: 280px;
  min-width: 280px;
  background: var(--surface-1);
  box-shadow: var(--shadow-panel);
  z-index: 1;
  position: relative;
  overflow-y: auto;
}

/* ── Patch 面板分割手柄 ── */

.resize-handle {
  height: 6px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-1);
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-out);
}

.resize-handle:hover {
  background: var(--accent-bg);
}

.resize-grip {
  width: 32px;
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.10);
  transition: background var(--duration-fast) var(--ease-out);
}

.resize-handle:hover .resize-grip {
  background: var(--accent-light);
}

.patch-row {
  display: flex;
  flex-shrink: 0;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.toast-bar {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 6px 16px; border-radius: 6px; font-size: 12px;
  background: var(--c-accent, #4a90d9); color: #fff; pointer-events: none; z-index: 9999;
}
.fade-enter-active, .fade-leave-active { transition: opacity .3s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
.tool-btn.flash { background: var(--c-accent, #4a90d9); transition: background .2s }
</style>
