// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  structure.spec —— 结构自愈测试
//  验证文档与代码的同步性，防止腐化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SRC = path.join(ROOT, 'src')

// ── 工具函数 ──

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel))
}

function allFiles(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...allFiles(full, exts))
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

function countLines(filePath: string): number {
  return fs.readFileSync(filePath, 'utf-8').split('\n').length
}

// ── 测试 ──

test.describe('结构自愈', () => {

  test('必要文档都存在', () => {
    const required = [
      'RELAY.md',
      'docs/RULES.md',
      'docs/VISION.md',
      'docs/ARCHITECTURE.md',
      'docs/UI-DESIGN.md',
      'docs/KNOWN-ISSUES.md',
      'docs/FLOWS.md',
      'docs/JOURNEY.md',
      'docs/CODE-MAP.md',
      'docs/TESTING.md',
    ]
    for (const f of required) {
      expect(fileExists(f), `缺失: ${f}`).toBe(true)
    }
  })

  test('CODE-MAP.md 中的 src/ 文件都存在', () => {
    const codeMap = readFile('docs/CODE-MAP.md')
    // 提取所有 src/ 相关路径 (从表格 | 列中)
    const pathPattern = /`([a-zA-Z/]+\.(ts|vue|css))`/g
    const missing: string[] = []
    let match
    while ((match = pathPattern.exec(codeMap)) !== null) {
      const rel = match[1]
      // 代码地图中的路径是相对于 src/engine/ 或 src/components/ 等
      // 尝试几种常见前缀
      const candidates = [
        `src/engine/${rel}`,
        `src/components/${rel}`,
        `src/${rel}`,
        `src/engine/scene/${rel}`,
      ]
      const found = candidates.some(c => fileExists(c))
      if (!found && !rel.includes('/')) continue // 单文件名不检查
      if (!found) missing.push(rel)
    }
    expect(missing, `CODE-MAP.md 中有文件不存在: ${missing.join(', ')}`).toHaveLength(0)
  })

  test('tests/ 目录不含临时文件', () => {
    const testsDir = path.join(ROOT, 'tests')
    if (!fs.existsSync(testsDir)) return
    const entries = fs.readdirSync(testsDir)
    const forbidden = entries.filter(name =>
      /^(repro-|debug-|temp-)/.test(name),
    )
    expect(forbidden, `tests/ 中有临时文件: ${forbidden.join(', ')}`).toHaveLength(0)
  })

  test('tests/ 目录只含允许的文件类型', () => {
    const testsDir = path.join(ROOT, 'tests')
    if (!fs.existsSync(testsDir)) return
    const entries = fs.readdirSync(testsDir, { withFileTypes: true })
    const violations: string[] = []
    for (const entry of entries) {
      if (entry.isDirectory()) continue // screenshots/ 等目录允许
      const name = entry.name
      if (name.startsWith('.')) continue // 忽略隐藏文件 (.DS_Store 等)
      const allowed =
        name.endsWith('.spec.ts') ||
        name.endsWith('.spec.js') ||
        name === 'journey-server.mjs' ||
        name === 'persona.spec.ts'
      if (!allowed) violations.push(name)
    }
    expect(violations, `tests/ 中有非测试文件: ${violations.join(', ')}`).toHaveLength(0)
  })

  test('TS 文件行数分级限制 (逻辑≤200 / 声明≤300 / utils≤100)', () => {
    const files = allFiles(SRC, ['.ts']).filter(f => !f.endsWith('.d.ts'))
    const oversize: string[] = []
    for (const f of files) {
      const name = path.basename(f)
      const rel = path.relative(ROOT, f)
      const limit = rel.startsWith(path.join('src', 'utils') + path.sep) ? 100
        : /Types\.ts$|Defs\.ts$|Presets\.ts$/.test(name) || name === 'types.ts' ? 300
        : 200
      const lines = countLines(f)
      if (lines > limit) oversize.push(`${rel} (${lines}行 > ${limit}限)`)
    }
    expect(oversize, `TS 文件超标:\n${oversize.join('\n')}`).toHaveLength(0)
  })

  test('Vue SFC ≤ 400 行', () => {
    const files = allFiles(SRC, ['.vue'])
    const oversize: string[] = []
    for (const f of files) {
      const lines = countLines(f)
      if (lines > 400) {
        const rel = path.relative(ROOT, f)
        oversize.push(`${rel} (${lines} 行)`)
      }
    }
    expect(oversize, `Vue 文件超标:\n${oversize.join('\n')}`).toHaveLength(0)
  })

  test('Engine 层零 UI 依赖', () => {
    const engineDir = path.join(SRC, 'engine')
    const files = allFiles(engineDir, ['.ts'])
    const violations: string[] = []
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8')
      const rel = path.relative(ROOT, f)
      if (/import .* from ['"]vue['"]/.test(content)) violations.push(`${rel}: import vue`)
      if (/import .* from ['"]pinia['"]/.test(content)) violations.push(`${rel}: import pinia`)
      if (/import .* from ['"]@\/components/.test(content)) violations.push(`${rel}: import components`)
      if (/import .* from ['"]@\/store/.test(content)) violations.push(`${rel}: import store`)
    }
    expect(violations, `Engine 层 UI 依赖:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
