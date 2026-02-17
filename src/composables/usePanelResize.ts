// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  usePanelResize —— 面板拖拽调高度
//  职责: 拖拽手柄改变面板高度 + localStorage 持久化
//  用于 Patch Editor 等可变高度面板
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref } from 'vue'

const PREFS_KEY = 'intera_ui_prefs'

// ── 持久化读写 ──

function loadPref(key: string): number | null {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return typeof prefs[key] === 'number' ? prefs[key] : null
  } catch { return null }
}

function savePref(key: string, value: number): void {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    prefs[key] = value
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch { /* 配额超限静默失败 */ }
}

// ── composable ──

export function usePanelResize(key: string, opts: {
  defaultRatio: number   // 默认高度占视口比例 (如 1/3)
  min: number            // 最小像素
  maxRatio: number       // 最大高度占视口比例
}) {
  const saved = loadPref(key)
  const height = ref(saved ?? Math.round(window.innerHeight * opts.defaultRatio))

  let startY = 0
  let startH = 0

  // 拖拽手柄在面板上方 — 向上拖 = 高度增加
  function onPointerDown(e: PointerEvent): void {
    e.preventDefault()
    startY = e.clientY
    startH = height.value
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onMove(e: PointerEvent): void {
    const maxPx = window.innerHeight * opts.maxRatio
    height.value = Math.round(
      Math.max(opts.min, Math.min(maxPx, startH + startY - e.clientY)),
    )
  }

  function onUp(): void {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    savePref(key, height.value)
  }

  return { height, onPointerDown }
}
