import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1700-scp-accordion/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasXY(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: states+curves+patch — 手风琴折叠面板', async ({ page }) => {
  await load(page)
  const { cx, cy, box } = await canvasXY(page)

  // ── Step 01: 创建面板容器 (Frame) ──
  await page.keyboard.press('f')
  await page.mouse.move(cx - 100, cy - 120)
  await page.mouse.down()
  await page.mouse.move(cx + 100, cy + 120, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-01.png` })

  // ── Step 02: 在容器内创建标题栏 ──
  await page.keyboard.press('r')
  await page.mouse.move(cx - 90, cy - 110)
  await page.mouse.down()
  await page.mouse.move(cx + 90, cy - 75, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 改颜色为深紫
  const c1 = page.locator('.color-input').first()
  if (await c1.isVisible()) { await c1.fill('#4c1d95'); await c1.press('Enter') }
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 创建内容区域矩形 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('r')
  await page.mouse.move(cx - 90, cy - 70)
  await page.mouse.down()
  await page.mouse.move(cx + 90, cy + 110, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 浅紫背景
  const c2 = page.locator('.color-input').first()
  if (await c2.isVisible()) { await c2.fill('#ddd6fe'); await c2.press('Enter') }
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-03.png` })

  // ── Step 04: 重命名图层 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  // 重命名容器
  const containerName = page.locator('.layer-item .layer-name', { hasText: '容器 1' })
  await containerName.dblclick()
  await page.waitForTimeout(100)
  const rn1 = page.locator('.layer-name-input')
  if (await rn1.count() > 0) { await rn1.fill('手风琴'); await rn1.press('Enter') }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: 添加 "展开" 状态 + 修改属性 ──
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  const tab2 = page.locator('.state-tab', { hasText: '状态 2' })
  await tab2.click()
  await page.waitForTimeout(200)
  // 重命名为 "展开"
  await tab2.locator('.state-name').dblclick()
  await page.waitForTimeout(100)
  const rn2 = page.locator('.state-rename-input')
  if (await rn2.count() > 0) { await rn2.fill('展开'); await rn2.press('Enter') }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-05.png` })

  // ── Step 06: 在 "展开" 状态调大内容区高度 ──
  // 选中内容矩形 (第二个矩形)
  const rects = page.locator('.layer-item .layer-name', { hasText: '矩形' })
  await rects.last().click()
  await page.waitForTimeout(100)
  const hField = page.locator('.prop-field:has(span.label:text("H"))').locator('input')
  if (await hField.count() > 0) {
    await hField.fill('300')
    await hField.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-06.png` })

  // ── Step 07: 调整弹簧曲线 — 低阻尼弹跳 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  const dampSlider = page.locator('input[type="range"]').nth(1)
  if (await dampSlider.count() > 0) await dampSlider.fill('0.6')
  await page.waitForTimeout(200)

  // ── Step 08: 创建 Touch Patch ──
  const touchBtn = page.locator('button, .patch-btn', { hasText: 'Touch' })
  await touchBtn.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-08.png` })

  // ── Step 09: 切回默认状态最终截图 ──
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/step-09-final.png` })

  // ── 保存 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const data = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (data) fs.writeFileSync(`${SHOTS}/../design.intera`, data, 'utf-8')
})
