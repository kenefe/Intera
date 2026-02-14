import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1620-states-curves-card-flip/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasXY(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: states+curves — 卡片翻转弹簧效果', async ({ page }) => {
  await load(page)
  const { cx, cy, box } = await canvasXY(page)

  // ── Step 01: 创建卡片矩形 ──
  await page.keyboard.press('r')
  await page.mouse.move(cx - 60, cy - 80)
  await page.mouse.down()
  await page.mouse.move(cx + 60, cy + 80, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 设置圆角 + 颜色
  const radiusField = page.locator('.prop-field:has(span.label:text("圆角"))').locator('input')
  if (await radiusField.count() > 0) {
    await radiusField.fill('16')
    await radiusField.press('Enter')
  }
  const colorInput = page.locator('.color-input').first()
  if (await colorInput.isVisible()) {
    await colorInput.fill('#6366f1')
    await colorInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-01.png` })

  // ── Step 02: 添加标题文本 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.keyboard.press('t')
  await page.mouse.move(cx - 50, cy - 20)
  await page.mouse.down()
  await page.mouse.move(cx + 50, cy + 10, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const textArea = page.locator('textarea').first()
  if (await textArea.isVisible()) await textArea.fill('FRONT')
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 添加第二状态 + 重命名 ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  // 切换到 "状态 2"
  const tab2 = page.locator('.state-tab', { hasText: '状态 2' })
  await tab2.click()
  await page.waitForTimeout(200)
  // 重命名
  await tab2.locator('.state-name').dblclick()
  await page.waitForTimeout(100)
  const rnInput = page.locator('.state-rename-input')
  if (await rnInput.count() > 0) {
    await rnInput.fill('背面')
    await rnInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03.png` })

  // ── Step 04: 在 "背面" 状态修改旋转 + 颜色 ──
  const rectItem = page.locator('.layer-item .layer-name', { hasText: '矩形' })
  await rectItem.click()
  await page.waitForTimeout(100)
  // 旋转 180°
  const rotField = page.locator('.prop-field:has(span.label:text("旋转"))').locator('input')
  if (await rotField.count() > 0) {
    await rotField.fill('180')
    await rotField.press('Enter')
  }
  // 填充改色
  const colorInput2 = page.locator('.color-input').first()
  if (await colorInput2.isVisible()) {
    await colorInput2.fill('#f472b6')
    await colorInput2.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: 调整弹簧曲线 (增大响应，降低阻尼以获得弹跳感) ──
  // 找到曲线面板的响应滑块
  await page.mouse.click(box.x + 10, box.y + 10) // blur
  await page.waitForTimeout(100)
  // 查找全局曲线区域 — 响应和阻尼 slider
  const responseSlider = page.locator('input[type="range"]').first()
  const dampingSlider = page.locator('input[type="range"]').nth(1)
  if (await responseSlider.count() > 0) {
    await responseSlider.fill('0.5') // 较慢的响应 = 更有弹跳
  }
  if (await dampingSlider.count() > 0) {
    await dampingSlider.fill('0.7') // 降低阻尼 = 更多回弹
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-05.png` })

  // ── Step 06: 切回默认状态观察对比 ──
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-06.png` })

  // ── Step 07: 点击预览动画 ──
  const previewPanel = page.locator('.preview-panel')
  await previewPanel.click()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SHOTS}/step-07-preview.png` })

  // ── 保存 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const data = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (data) fs.writeFileSync(`${SHOTS}/../design.intera`, data, 'utf-8')
})
