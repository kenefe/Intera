import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1720-full-interactive-card/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasXY(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: 全能力 — 交互式产品卡片', async ({ page }) => {
  await load(page)
  const { cx, cy, box } = await canvasXY(page)

  // ── Step 01: 创建产品卡片 Frame 容器 ──
  await page.keyboard.press('f')
  await page.mouse.move(cx - 90, cy - 120)
  await page.mouse.down()
  await page.mouse.move(cx + 90, cy + 120, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 圆角 + 白色背景
  const rad = page.locator('.prop-field:has(span.label:text("圆角"))').locator('input')
  if (await rad.count() > 0) { await rad.fill('16'); await rad.press('Enter') }
  await page.waitForTimeout(100)

  // ── Step 02: 产品图片区域 (深色矩形) ──
  await page.keyboard.press('r')
  await page.mouse.move(cx - 80, cy - 110)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy - 30, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const c1 = page.locator('.color-input').first()
  if (await c1.isVisible()) { await c1.fill('#1e1b4b'); await c1.press('Enter') }
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 产品名文本 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('t')
  await page.mouse.move(cx - 70, cy - 20)
  await page.mouse.down()
  await page.mouse.move(cx + 70, cy + 5, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const ta = page.locator('textarea').first()
  if (await ta.isVisible()) await ta.fill('AirPods Max')
  // 增大字号
  const fsf = page.locator('.prop-field:has(span.label:text("字号"))').locator('input')
  if (await fsf.count() > 0) { await fsf.fill('20'); await fsf.press('Enter') }
  await page.waitForTimeout(100)

  // ── Step 04: 价格文本 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('t')
  await page.mouse.move(cx - 70, cy + 15)
  await page.mouse.down()
  await page.mouse.move(cx + 70, cy + 40, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const ta2 = page.locator('textarea').first()
  if (await ta2.isVisible()) await ta2.fill('¥4,399')
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: CTA 按钮 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('r')
  await page.mouse.move(cx - 50, cy + 55)
  await page.mouse.down()
  await page.mouse.move(cx + 50, cy + 85, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const c2 = page.locator('.color-input').first()
  if (await c2.isVisible()) { await c2.fill('#6366f1'); await c2.press('Enter') }
  const rad2 = page.locator('.prop-field:has(span.label:text("圆角"))').locator('input')
  if (await rad2.count() > 0) { await rad2.fill('8'); await rad2.press('Enter') }
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-05.png` })

  // ── Step 06: 重命名关键图层 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  const names = [
    { old: '容器', new: '产品卡片' },
  ]
  for (const n of names) {
    const el = page.locator('.layer-item .layer-name', { hasText: n.old }).first()
    await el.dblclick()
    await page.waitForTimeout(100)
    const inp = page.locator('.layer-name-input')
    if (await inp.count() > 0) { await inp.fill(n.new); await inp.press('Enter') }
    await page.waitForTimeout(100)
  }
  await page.screenshot({ path: `${SHOTS}/step-06.png` })

  // ── Step 07: 创建 "悬停" 状态 ──
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  const hTab = page.locator('.state-tab', { hasText: '状态 2' })
  await hTab.click()
  await page.waitForTimeout(200)
  await hTab.locator('.state-name').dblclick()
  await page.waitForTimeout(100)
  const rn = page.locator('.state-rename-input')
  if (await rn.count() > 0) { await rn.fill('悬停'); await rn.press('Enter') }
  await page.waitForTimeout(200)

  // ── Step 08: 修改悬停状态 — 缩放容器 + 按钮变色 ──
  // 选中产品卡片容器
  const cardItem = page.locator('.layer-item .layer-name', { hasText: '产品卡片' })
  await cardItem.click()
  await page.waitForTimeout(100)
  const sx = page.locator('.prop-field:has(span.label:text("缩放X"))').locator('input')
  if (await sx.count() > 0) { await sx.fill('1.05'); await sx.press('Enter') }
  const sy = page.locator('.prop-field:has(span.label:text("缩放Y"))').locator('input')
  if (await sy.count() > 0) { await sy.fill('1.05'); await sy.press('Enter') }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-08.png` })

  // ── Step 09: Touch Patch ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.locator('button, .patch-btn', { hasText: 'Touch' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-09.png` })

  // ── Step 10: 最终对比 ──
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/step-10-final.png` })

  // ── 保存 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const data = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (data) fs.writeFileSync(`${SHOTS}/../design.intera`, data, 'utf-8')
})
