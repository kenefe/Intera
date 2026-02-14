// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Intera — 能力回归测试
//
//  职责: 验证每种能力组合下功能没坏 (确定性回归)
//  不是: 旅程探索 (那是 Flow E，AI 用浏览器逐步操作)
//
//  画像从能力图谱自动枚举，无需手写测试用例
//  运行: npx playwright test tests/persona.spec.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.TEST_URL ?? 'http://localhost:5174'
const SHOT = 'tests/screenshots/persona'

// ══════════════════════════════════════
//  基础辅助
// ══════════════════════════════════════

async function load(page: Page) {
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
}

async function canvasBox(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('画布不存在')
  return box
}

async function drawOnCanvas(
  page: Page, dx1: number, dy1: number, dx2: number, dy2: number,
) {
  const b = await canvasBox(page)
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2
  await page.mouse.move(cx + dx1, cy + dy1)
  await page.mouse.down()
  await page.mouse.move(cx + dx2, cy + dy2, { steps: 8 })
  await page.mouse.up()
}

function collectErrors(page: Page): string[] {
  const err: string[] = []
  page.on('console', m => { if (m.type() === 'error') err.push(m.text()) })
  return err
}

// ══════════════════════════════════════
//  UI 感知 — 读取当前画面状态
// ══════════════════════════════════════

interface UIState {
  layers: number
  states: number
}

async function perceive(page: Page): Promise<UIState> {
  return {
    layers: await page.locator('.layer-item').count(),
    states: await page.locator('.state-tab').count(),
  }
}

// ══════════════════════════════════════
//  画像 — 纯能力集
// ══════════════════════════════════════

interface Profile {
  id: string
  name: string
  caps: Set<string>
  budget: number
}

// ══════════════════════════════════════
//  能力图谱 → 画像生成
// ══════════════════════════════════════

const CAP_DEPS: Record<string, string[]> = {
  states: [],
  curves: ['states'],
  patch:  ['states'],
  folme:  ['curves', 'patch'],
}
const CAP_NAMES: Record<string, string> = {
  states: '状态系统', curves: '弹簧曲线',
  patch: '节点编辑',  folme: 'Folme映射',
}
const CAP_IDS = Object.keys(CAP_DEPS)

function generateProfiles(): Profile[] {
  const profiles: Profile[] = []
  for (let mask = 0; mask < (1 << CAP_IDS.length); mask++) {
    const caps = new Set<string>()
    for (let i = 0; i < CAP_IDS.length; i++) {
      if (mask & (1 << i)) caps.add(CAP_IDS[i])
    }
    const valid = [...caps].every(id => CAP_DEPS[id].every(d => caps.has(d)))
    if (!valid) continue

    const ordered = CAP_IDS.filter(id => caps.has(id))
    profiles.push({
      id: caps.size === 0 ? 'base' : ordered.join('-'),
      name: caps.size === 0 ? '基础绘制' : ordered.map(id => CAP_NAMES[id]).join(' · '),
      caps,
      budget: 5 + caps.size * 3,
    })
  }
  return profiles.sort((a, b) => a.caps.size - b.caps.size)
}

// ══════════════════════════════════════
//  回归操作序列
//
//  needs: 前置已完成的操作
//  cap:   所属能力 (无 = 所有画像都执行)
//  exec:  执行操作
//  check: 验证执行结果
// ══════════════════════════════════════

interface Action {
  id: string
  name: string
  needs: string[]
  cap?: string
  exec: (page: Page, p: Profile) => Promise<void>
  check?: (before: UIState, after: UIState) => void
}

const ACTIONS: Action[] = [
  {
    id: 'draw', name: '绘制图形', needs: [],
    exec: async (page, p) => {
      const n = p.caps.size >= 3 ? 3 : p.caps.size >= 1 ? 2 : 1
      for (let i = 0; i < n; i++) {
        await page.keyboard.press('r')
        const o = i * 50
        await drawOnCanvas(page, -60 + o, -40 + o, 60 + o, 40 + o)
        await page.waitForTimeout(150)
      }
    },
    check: (_b, a) => { expect(a.layers).toBeGreaterThan(0) },
  },

  {
    id: 'add-state', name: '添加状态', needs: ['draw'], cap: 'states',
    exec: async (page) => {
      await page.locator('.add-btn').click()
      await page.waitForTimeout(100)
    },
    check: (b, a) => { expect(a.states).toBeGreaterThan(b.states) },
  },

  {
    id: 'to-state', name: '切换状态', needs: ['add-state'], cap: 'states',
    exec: async (page) => {
      await page.locator('.state-tab').nth(1).click()
      await page.waitForTimeout(200)
    },
  },

  {
    id: 'modify', name: '修改属性', needs: ['to-state'], cap: 'states',
    exec: async (page) => {
      await page.locator('.layer-item').first().click()
      await page.waitForTimeout(150)
      const inputs = page.locator('.prop-field .input')
      for (const idx of [2, 3]) {
        const inp = inputs.nth(idx)
        if (await inp.isVisible()) { await inp.fill('250'); await inp.press('Enter') }
      }
    },
  },

  {
    id: 'curves', name: '查看弹簧曲线', needs: ['modify'], cap: 'curves',
    exec: async (page) => {
      const rp = page.locator('.panel-right')
      await expect(rp).toContainText('过渡曲线')
      await expect(rp).toContainText('响应')
      await expect(rp).toContainText('阻尼')
      // 滚动到曲线面板，确保截图完整呈现弹簧参数
      await page.locator('.curve-panel').scrollIntoViewIfNeeded()
    },
  },

  {
    id: 'patch', name: '添加交互节点', needs: ['add-state'], cap: 'patch',
    exec: async (page) => {
      await expect(page.locator('.patch-canvas')).toBeVisible()
      // 添加 Touch 节点 — Patch 画像的核心交互
      await page.click('.node-btn[data-type="touch"]')
      await page.waitForTimeout(200)
    },
  },

  {
    id: 'folme', name: '验证Folme映射', needs: ['curves', 'patch'], cap: 'folme',
    exec: async (page) => {
      const rp = page.locator('.panel-right')
      // 弹簧类型选择器可见
      await expect(rp.locator('.type-select')).toBeVisible()
      // response / damping 滑块存在且可交互
      const sliders = rp.locator('.param-slider')
      await expect(sliders).not.toHaveCount(0)
      // 数值显示可读
      const vals = rp.locator('.param-val')
      await expect(vals.first()).toBeVisible()
      // 滚动到曲线面板，确保截图完整
      await page.locator('.curve-panel').scrollIntoViewIfNeeded()
    },
  },

  {
    id: 'preview', name: '预览动画', needs: ['draw'],
    exec: async (page) => {
      const box = await page.locator('.preview-panel').boundingBox()
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(600)
      }
    },
  },

  {
    id: 'back', name: '弹回默认', needs: ['preview'], cap: 'states',
    exec: async (page) => {
      await page.locator('.state-tab').first().click()
      await page.waitForTimeout(600)
    },
  },
]

// ══════════════════════════════════════
//  回归测试运行器
//
//  按依赖序执行操作，验证前后状态
//  用于修完代码后确认能力没坏
// ══════════════════════════════════════

const profiles = generateProfiles()

for (const profile of profiles) {
  test(`能力回归: ${profile.name}`, async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    const done = new Set<string>()
    let step = 0

    while (step < profile.budget) {
      const ui = await perceive(page)

      const next = ACTIONS.find(a =>
        !done.has(a.id)
        && a.needs.every(n => done.has(n))
        && (!a.cap || profile.caps.has(a.cap)),
      )
      if (!next) break

      await test.step(next.name, async () => {
        await next.exec(page, profile)
      })

      if (next.check) {
        const after = await perceive(page)
        next.check(ui, after)
      }

      done.add(next.id)
      step++
      await page.screenshot({
        path: `${SHOT}/${profile.id}-${String(step).padStart(2, '0')}-${next.id}.png`,
      })
    }

    expect(errors).toHaveLength(0)
  })
}
