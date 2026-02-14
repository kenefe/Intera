import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1640-states-patch-toggle/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasXY(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: states+patch — Toggle 开关交互', async ({ page }) => {
  await load(page)
  const { cx, cy, box } = await canvasXY(page)

  // ── Step 01: 创建开关背景 (圆角矩形) ──
  await page.keyboard.press('r')
  await page.mouse.move(cx - 40, cy - 15)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 15, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 圆角 + 灰色
  const radiusField = page.locator('.prop-field:has(span.label:text("圆角"))').locator('input')
  if (await radiusField.count() > 0) {
    await radiusField.fill('20')
    await radiusField.press('Enter')
  }
  const colorInput = page.locator('.color-input').first()
  if (await colorInput.isVisible()) {
    await colorInput.fill('#94a3b8')
    await colorInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-01.png` })

  // ── Step 02: 创建圆形滑块 (椭圆) ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('o')
  await page.mouse.move(cx - 30, cy - 12)
  await page.mouse.down()
  await page.mouse.move(cx - 6, cy + 12, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 添加第二状态 "开" ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  // 切到状态 2
  const tab2 = page.locator('.state-tab', { hasText: '状态 2' })
  await tab2.click()
  await page.waitForTimeout(200)
  // 重命名 "开"
  await tab2.locator('.state-name').dblclick()
  await page.waitForTimeout(100)
  const rnInput = page.locator('.state-rename-input')
  if (await rnInput.count() > 0) {
    await rnInput.fill('开')
    await rnInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03.png` })

  // ── Step 04: 在 "开" 状态修改属性 ──
  // 选中背景矩形 → 改颜色为绿色
  const rectItem = page.locator('.layer-item .layer-name', { hasText: '矩形' })
  await rectItem.click()
  await page.waitForTimeout(100)
  const c1 = page.locator('.color-input').first()
  if (await c1.isVisible()) {
    await c1.fill('#22c55e')
    await c1.press('Enter')
  }
  await page.waitForTimeout(100)
  // 选中椭圆 → 移到右侧
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  const ellipseItem = page.locator('.layer-item .layer-name', { hasText: '椭圆' })
  await ellipseItem.click()
  await page.waitForTimeout(100)
  const xField = page.locator('.prop-field:has(span.label:text("X"))').locator('input').first()
  if (await xField.count() > 0) {
    const curX = await xField.inputValue()
    const newX = parseInt(curX) + 30
    await xField.fill(String(newX))
    await xField.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: 打开 Patch 编辑器 ──
  const touchBtn = page.locator('button, .patch-btn', { hasText: 'Touch' })
  await touchBtn.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-05.png` })

  // ── Step 06: 最终对比 — 切回默认状态 ──
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-06-final.png` })

  // ── 保存 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const data = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (data) fs.writeFileSync(`${SHOTS}/../design.intera`, data, 'utf-8')
})
