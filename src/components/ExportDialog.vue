<template lang="pug">
.export-overlay(@click.self="$emit('close')")
  .export-dialog
    .dialog-header
      span.dialog-title 导出
      button.close-btn(@click="$emit('close')") &times;

    //- ── 标签切换 ──
    .tab-bar
      button.tab(v-for="t in TABS" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id") {{ t.label }}

    //- ── 内容区 ──
    .tab-body

      //- CSS/JS
      template(v-if="tab === 'css'")
        .code-preview
          pre.code-block {{ cssCode }}
        .action-row
          button.action-btn(@click="copyCSS") {{ copied ? '已复制' : '复制 HTML' }}
          button.action-btn(@click="downloadCSS") 下载 .html

      //- Lottie
      template(v-if="tab === 'lottie'")
        .info-text Lottie JSON (默认 → 第二状态过渡)
        .action-row
          button.action-btn(@click="downloadLottie") 下载 .json

      //- Video
      template(v-if="tab === 'video'")
        .info-text WebM 视频 (Canvas2D 离线渲染)
        .action-row
          button.action-btn(:disabled="recording" @click="recordVideo") {{ recording ? '录制中...' : '开始录制' }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@store/project'
import { exportCSS } from '@engine/export/CSSExporter'
import { exportLottie } from '@engine/export/LottieExporter'
import { exportVideo } from '@engine/export/VideoExporter'

defineEmits<{ close: [] }>()

const project = useProjectStore()
const tab = ref<'css' | 'lottie' | 'video'>('css')
const copied = ref(false)
const recording = ref(false)

const TABS = [
  { id: 'css' as const,    label: 'CSS / JS' },
  { id: 'lottie' as const, label: 'Lottie' },
  { id: 'video' as const,  label: 'Video' },
]

// ── CSS ──

const cssCode = computed(() => exportCSS(project.project))

function copyCSS(): void {
  navigator.clipboard.writeText(cssCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadCSS(): void { download(cssCode.value, `${project.project.name}.html`, 'text/html') }

// ── Lottie ──

function downloadLottie(): void {
  const json = exportLottie(project.project)
  download(JSON.stringify(json, null, 2), `${project.project.name}.json`, 'application/json')
}

// ── Video ──

async function recordVideo(): Promise<void> {
  recording.value = true
  try {
    const blob = await exportVideo(project.project)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${project.project.name}.webm`; a.click()
    URL.revokeObjectURL(url)
  } finally { recording.value = false }
}

// ── 通用下载 ──

function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.60);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.export-dialog {
  width: 580px;
  max-height: 80vh;
  background: var(--surface-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--border-subtle);
}

.dialog-title { font-size: var(--text-lg); font-weight: 600; }

.close-btn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 16px;
  cursor: pointer;
  transition: color var(--duration-fast), background var(--duration-fast);
}

.close-btn:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.06); }

.tab-bar {
  display: flex;
  gap: 2px;
  padding: var(--sp-3) var(--sp-5) 0;
}

.tab {
  padding: var(--sp-2) 14px;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: transparent;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.tab:hover { color: var(--text-primary); }
.tab.active { background: var(--accent-bg); color: var(--accent-text); }

.tab-body {
  flex: 1;
  padding: var(--sp-5);
  overflow-y: auto;
}

.code-preview {
  max-height: 300px;
  overflow: auto;
  background: var(--surface-0);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  margin-bottom: var(--sp-4);
}

.code-block {
  padding: var(--sp-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.info-text {
  font-size: var(--text-base);
  color: var(--text-tertiary);
  margin-bottom: var(--sp-4);
}

.action-row { display: flex; gap: var(--sp-3); }

.action-btn {
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--duration-fast);
}

.action-btn:hover { opacity: 0.88; }
.action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
