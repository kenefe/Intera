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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.export-dialog {
  width: 580px;
  max-height: 80vh;
  background: #1e1e3a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dialog-title { font-size: 13px; font-weight: 600; }

.close-btn {
  width: 24px; height: 24px;
  border: none; border-radius: 4px;
  background: transparent; color: rgba(255, 255, 255, 0.4);
  font-size: 16px; cursor: pointer; transition: color 0.1s;
}
.close-btn:hover { color: #fff; }

.tab-bar {
  display: flex;
  gap: 2px;
  padding: 8px 16px 0;
}

.tab {
  padding: 6px 14px;
  border: none;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.tab:hover { color: #fff; }
.tab.active { background: rgba(91, 91, 240, 0.15); color: #8888ff; }

.tab-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.code-preview {
  max-height: 300px;
  overflow: auto;
  background: #12122a;
  border-radius: 6px;
  margin-bottom: 12px;
}

.code-block {
  padding: 12px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
  white-space: pre-wrap;
  word-break: break-all;
}

.info-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 12px;
}

.action-row { display: flex; gap: 8px; }

.action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 5px;
  background: #5b5bf0;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: opacity 0.1s;
}
.action-btn:hover { opacity: 0.85; }
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
