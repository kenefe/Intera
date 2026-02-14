import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1600-states-button-hover/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasCenter(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: states 画像 — 按钮悬停状态动效', async ({ page }) => {
  // ── Step 01: 打开页面 ──
  await load(page)
  await page.screenshot({ path: `${SHOTS}/step-01.png` })

  // ── Step 02: 创建按钮矩形 ──
  const { cx, cy, box } = await canvasCenter(page)
  await page.keyboard.press('r')
  await page.mouse.move(cx - 80, cy - 20)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 20, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 改颜色为深蓝 ──
  const colorInput = page.locator('.color-input').first()
  if (await colorInput.isVisible()) {
    await colorInput.fill('#1e3a5f')
    await colorInput.press('Enter')
  }
  await page.waitForTimeout(100)
  // 设置圆角
  const radiusField = page.locator('.prop-field:has(span.label:text("圆角"))').locator('input')
  if (await radiusField.count() > 0) {
    await radiusField.fill('12')
    await radiusField.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03.png` })

  // ── Step 04: 在按钮上添加文本标签 ──
  await page.mouse.click(box.x + 10, box.y + 10) // blur focus
  await page.waitForTimeout(100)
  await page.keyboard.press('t')
  await page.mouse.move(cx - 60, cy - 10)
  await page.mouse.down()
  await page.mouse.move(cx + 60, cy + 10, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  // 修改文本
  const textArea = page.locator('textarea').first()
  if (await textArea.isVisible()) {
    await textArea.fill('Hover Me')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: 添加第二个状态 "悬停" ──
  await page.mouse.click(box.x + 10, box.y + 10)
  await page.waitForTimeout(100)
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-05.png` })

  // ── Step 06: 切换到 "状态 2"，重命名为 "悬停" ──
  const state2Tab = page.locator('.state-tab', { hasText: '状态 2' })
  await state2Tab.click()
  await page.waitForTimeout(200)
  // 双击重命名
  const state2Name = state2Tab.locator('.state-name')
  await state2Name.dblclick()
  await page.waitForTimeout(100)
  const stateRenameInput = page.locator('.state-rename-input')
  if (await stateRenameInput.count() > 0) {
    await stateRenameInput.fill('悬停')
    await stateRenameInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-06.png` })

  // ── Step 07: 在 "悬停" 状态选中按钮矩形，修改颜色为亮蓝 ──
  const btnItem = page.locator('.layer-item .layer-name', { hasText: '矩形' })
  await btnItem.click()
  await page.waitForTimeout(100)
  // 修改颜色
  const colorInput2 = page.locator('.color-input').first()
  if (await colorInput2.isVisible()) {
    await colorInput2.fill('#4a90d9')
    await colorInput2.press('Enter')
  }
  await page.waitForTimeout(100)
  // 修改缩放
  const scaleXField = page.locator('.prop-field:has(span.label:text("缩放X"))').locator('input')
  if (await scaleXField.count() > 0) {
    await scaleXField.fill('1.1')
    await scaleXField.press('Enter')
  }
  const scaleYField = page.locator('.prop-field:has(span.label:text("缩放Y"))').locator('input')
  if (await scaleYField.count() > 0) {
    await scaleYField.fill('1.1')
    await scaleYField.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-07.png` })

  // ── Step 08: 切回默认状态对比差异 ──
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-08.png` })

  // ── Step 09: 预览面板验证动画 ──
  // 点击预览面板触发动画
  const previewPanel = page.locator('.preview-panel')
  await previewPanel.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SHOTS}/step-09-preview.png` })

  // ── 保存设计文件 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const designData = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (designData) {
    fs.writeFileSync(`${SHOTS}/../design.intera`, designData, 'utf-8')
  }
})
