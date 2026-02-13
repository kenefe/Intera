// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ProjectStorage —— 项目持久化
//  职责: localStorage 自动保存 + 文件存取
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project } from './scene/types'

const STORAGE_KEY = 'intera_project'

// ═══════════════════════════════════
//  localStorage — 自动保存 / 恢复
// ═══════════════════════════════════

export function saveToLocal(project: Project): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)) }
  catch { /* 配额超限时静默失败 */ }
}

export function loadFromLocal(): Project | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    return json ? JSON.parse(json) : null
  } catch { return null }
}

export function clearLocal(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ═══════════════════════════════════
//  文件存取 — File System Access API + fallback
// ═══════════════════════════════════

export async function saveToFile(project: Project): Promise<void> {
  const json = JSON.stringify(project, null, 2)

  // 优先使用 File System Access API
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${project.name}.intera`,
        types: [{
          description: 'Intera Project',
          accept: { 'application/json': ['.intera'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return
    } catch { return } // 用户取消
  }

  // 降级: 触发下载
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name}.intera`
  a.click()
  URL.revokeObjectURL(url)
}

export async function loadFromFile(): Promise<Project | null> {
  // 优先使用 File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Intera Project',
          accept: { 'application/json': ['.intera', '.json'] },
        }],
      })
      const file = await handle.getFile()
      return JSON.parse(await file.text())
    } catch { return null }
  }

  // 降级: file input
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.intera,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try { resolve(JSON.parse(await file.text())) }
      catch { resolve(null) }
    }
    input.click()
  })
}
