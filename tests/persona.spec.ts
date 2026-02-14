// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Intera — 角色旅程验证 (数据驱动·自动构建)
//
//  核心理念:
//  角色 × 设计目标 = 旅程矩阵 (自动生成)
//  加角色 → 旅程自动扩展
//  加设计目标 → 旅程自动扩展
//
//  运行全部: npx playwright test tests/persona.spec.ts
//  按角色:   --grep "零基础" / "中级" / "专家" / "代码动效"
//  按目标:   --grep "卡片" / "Tab" / "拖拽" / ...
//
//  循环打磨: 运行 → 截图审查 → 发现摩擦 → 修复 → 再运行
//  截图目录: tests/screenshots/persona/
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
//  步骤原语 (原子操作)
//  每个工厂返回 StepFn，可组合成旅程配方
// ══════════════════════════════════════

type StepFn = (page: Page) => Promise<void>

/** 绘制 N 个矩形 (自动错开位置) */
const draw = (n: number): StepFn => async (page) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('r')
    const o = i * 50
    await drawOnCanvas(page, -80 + o, -60 + o, -10 + o, -10 + o)
    await page.waitForTimeout(150)
  }
}

/** 添加 N 个显示状态 */
const addStates = (n: number): StepFn => async (page) => {
  for (let i = 0; i < n; i++) {
    await page.locator('.add-btn').click()
    await page.waitForTimeout(100)
  }
}

/** 切换到第 N 个状态 (0-indexed) */
const toState = (n: number): StepFn => async (page) => {
  await page.locator('.state-tab').nth(n).click()
  await page.waitForTimeout(200)
}

/** 选中第 N 个图层并修改指定属性 */
const modify = (layerIdx: number, props: [number, string][]): StepFn => async (page) => {
  await page.locator('.layer-item').nth(layerIdx).click()
  await page.waitForTimeout(100)
  for (const [idx, val] of props) {
    const input = page.locator('.prop-field').nth(idx).locator('.input')
    if (await input.isVisible()) {
      await input.fill(val)
      await input.press('Enter')
    }
  }
}

/** 验证曲线面板 (Folme response + damping) */
const curves: StepFn = async (page) => {
  const rp = page.locator('.panel-right')
  await expect(rp).toContainText('过渡曲线')
  await expect(rp).toContainText('响应')
  await expect(rp).toContainText('阻尼')
}

/** 打开 → 验证 → 关闭 Patch 编辑器 */
const patch: StepFn = async (page) => {
  await page.click('.btn-patch')
  await page.waitForTimeout(500)
  await expect(page.locator('.btn-patch')).toHaveClass(/active/)
  await page.click('.btn-patch')
  await page.waitForTimeout(200)
}

/** 点击预览面板触发交互 */
const preview: StepFn = async (page) => {
  const p = page.locator('.preview-panel')
  const box = await p.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(600)
  }
}

/** 切回默认状态 (触发弹簧动画) */
const backToDefault: StepFn = async (page) => {
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(600)
}

/** 验证空状态引导 */
const checkEmpty: StepFn = async (page) => {
  await expect(page.locator('.panel-left .empty-state')).toBeVisible()
  await expect(page.locator('.properties-panel .empty-state')).toContainText('未选中')
}

/** 预览面板拖拽交互 */
const previewDrag: StepFn = async (page) => {
  const p = page.locator('.preview-panel')
  const box = await p.boundingBox()
  if (box) {
    const cx = box.x + box.width / 2
    await page.mouse.move(cx, box.y + box.height / 3)
    await page.mouse.down()
    await page.mouse.move(cx, box.y + box.height * 2 / 3, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(400)
  }
}

// ══════════════════════════════════════
//  角色定义 (加角色 → 旅程自动扩展)
// ══════════════════════════════════════

interface Persona {
  id: string
  name: string       // 用于 test.describe，grep 友好
  maxLevel: number   // 0=零基础, 1=中级, 2=专家/代码
  budget: number     // 步骤预算
}

const PERSONAS: Persona[] = [
  { id: 'novice',  name: '零基础设计师',   maxLevel: 0, budget: 8  },
  { id: 'mid',     name: '中级设计师',     maxLevel: 1, budget: 12 },
  { id: 'expert',  name: '专家设计师',     maxLevel: 2, budget: 18 },
  { id: 'code',    name: '代码动效专家',   maxLevel: 2, budget: 15 },
]

// ══════════════════════════════════════
//  设计目标定义 (加目标 → 旅程自动扩展)
//
//  每个目标 = 一个完整的交互动效设计
//  levels: 按复杂度分层的步骤配方
//    Level 0 = 自动动效 (画+状态+预览)
//    Level 1 = 曲线调参 (+ 弹簧参数)
//    Level 2 = 逻辑编排 (+ Patch 节点)
// ══════════════════════════════════════

interface Goal {
  id: string
  name: string       // 用于 test name，grep 友好
  min: number        // 最低所需角色等级
  levels: Partial<Record<number, StepFn[]>>
}

const GOALS: Goal[] = [
  // ── G1: 按钮点击反馈 (最简) ──
  {
    id: 'button', name: '按钮点击反馈', min: 0,
    levels: {
      0: [draw(1), addStates(1), toState(1),
          modify(0, [[2, '80'], [3, '40']]), preview, backToDefault],
      1: [curves],
      2: [patch],
    },
  },
  // ── G2: 卡片展开收起 (经典) ──
  {
    id: 'card', name: '卡片展开收起', min: 0,
    levels: {
      0: [draw(1), addStates(1), toState(1),
          modify(0, [[2, '300'], [3, '400']]), preview, backToDefault],
      1: [curves],
      2: [patch],
    },
  },
  // ── G3: Tab 导航切换 (多状态) ──
  {
    id: 'tab', name: 'Tab 导航切换', min: 0,
    levels: {
      0: [draw(3), addStates(2), toState(1),
          modify(1, [[4, '0.3']]), toState(2),
          modify(2, [[4, '0.3']]), preview],
      1: [backToDefault, curves],
      2: [patch],
    },
  },
  // ── G4: 列表进入动画 (交错) ──
  {
    id: 'entrance', name: '列表进入动画', min: 0,
    levels: {
      0: [draw(3), addStates(1), toState(1),
          modify(0, [[0, '300']]), modify(1, [[0, '350']]),
          modify(2, [[0, '400']]), preview],
      1: [backToDefault, curves],
      2: [patch],
    },
  },
  // ── G5: 拖拽交互 (触控) ──
  {
    id: 'drag', name: '拖拽跟手交互', min: 1,
    levels: {
      1: [draw(1), addStates(1), toState(1),
          modify(0, [[1, '500']]), curves, backToDefault],
      2: [patch, previewDrag],
    },
  },
  // ── G6: 复杂多组件原型 (全链路) ──
  {
    id: 'complex', name: '复杂多组件原型', min: 2,
    levels: {
      2: [draw(3), addStates(2), toState(1),
          modify(0, [[0, '300'], [2, '200']]),
          modify(1, [[4, '0.5']]), toState(2),
          modify(2, [[1, '400']]), patch, curves,
          backToDefault, preview],
    },
  },
]

// ══════════════════════════════════════
//  自动构建: 角色 × 目标 = 旅程矩阵
//
//  4 角色 × 6 目标 = 最多 24 条旅程
//  自动过滤: 目标最低等级 > 角色等级 → 跳过
// ══════════════════════════════════════

for (const persona of PERSONAS) {
  test.describe(`角色: ${persona.name}`, () => {

    for (const goal of GOALS) {
      // 目标超出角色能力范围 → 跳过
      if (goal.min > persona.maxLevel) continue

      test(`${goal.name} — 完整交互动效`, async ({ page }) => {
        const errors = collectErrors(page)
        await load(page)
        let step = 0

        // 按角色能力等级，逐层执行步骤配方
        for (let lv = 0; lv <= persona.maxLevel; lv++) {
          const fns = goal.levels[lv]
          if (!fns) continue
          for (const fn of fns) {
            await fn(page)
            step++
            await page.screenshot({
              path: `${SHOT}/${persona.id}-${goal.id}-${String(step).padStart(2, '0')}.png`,
            })
          }
        }

        // 断言: 步骤在角色预算内
        expect(step).toBeLessThanOrEqual(persona.budget)
        // 断言: 全程零报错
        expect(errors).toHaveLength(0)
      })
    }
  })
}
