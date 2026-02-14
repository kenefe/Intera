import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1530-zero-card-layout/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasCenter(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

test('旅程: 零基础用户设计名片卡片', async ({ page }) => {
  // ── Step 01: 打开页面，观察初始状态 ──
  await load(page)
  await page.screenshot({ path: `${SHOTS}/step-01.png` })

  // ── Step 02: 按 F 创建容器，作为名片卡片外框 ──
  const { cx, cy, box } = await canvasCenter(page)
  await page.keyboard.press('f')
  await page.mouse.move(cx - 120, cy - 80)
  await page.mouse.down()
  await page.mouse.move(cx + 120, cy + 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02.png` })

  // ── Step 03: 在容器内绘制标题矩形 ──
  await page.keyboard.press('r')
  await page.mouse.move(cx - 110, cy - 70)
  await page.mouse.down()
  await page.mouse.move(cx + 110, cy - 30, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03.png` })

  // ── Step 04: 修改矩形填充为蓝色 ──
  const colorInput = page.locator('.color-input').first()
  if (await colorInput.isVisible()) {
    await colorInput.fill('#3b82f6')
    await colorInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04.png` })

  // ── Step 05: 点击画布空白处关闭颜色选择器，取消选中 ──
  await page.mouse.click(cx + 180, cy + 140)
  await page.waitForTimeout(200)

  // ── Step 06: 创建文本图层 — 公司名 ──
  await page.keyboard.press('t')
  await page.mouse.move(cx - 100, cy - 10)
  await page.mouse.down()
  await page.mouse.move(cx + 100, cy + 20, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-06.png` })

  // ── Step 07: 修改文本内容 + 字号 ──
  const textArea = page.locator('textarea').first()
  await textArea.fill('ACME Corp')
  await page.waitForTimeout(100)
  // 字号输入 — 使用包含"字号"标签的 prop-field 内的 input
  const fsField = page.locator('.prop-field:has(span.label:text("字号"))').locator('input')
  await fsField.fill('24')
  await fsField.press('Enter')
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-07.png` })

  // ── Step 08: 点击画布取消焦点，按 O 创建椭圆 ──
  await page.mouse.click(box.x + 10, box.y + 10) // 点击画布空白
  await page.waitForTimeout(100)
  await page.keyboard.press('o')
  await page.mouse.move(cx + 60, cy + 30)
  await page.mouse.down()
  await page.mouse.move(cx + 110, cy + 70, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-08.png` })

  // ── Step 09: 双击重命名 "容器 1" → "名片" ──
  const containerName = page.locator('.layer-item .layer-name', { hasText: '容器 1' })
  await containerName.dblclick()
  await page.waitForTimeout(100)
  const renameInput = page.locator('.layer-name-input')
  if (await renameInput.count() > 0) {
    await renameInput.fill('名片')
    await renameInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-09.png` })

  // ── Step 10: 右键椭圆 — 打开上下文菜单 ──
  const ellipseItem = page.locator('.layer-item', { hasText: '椭圆' })
  await ellipseItem.click({ button: 'right' })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-10.png` })

  // ── Step 11: 点击 "删除" 删除椭圆 ──
  const deleteBtn = page.locator('.ctx-item', { hasText: '删除' })
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click()
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-11.png` })

  // ── Step 12: 选中名片容器，在内部绘制椭圆装饰 ──
  const cardItem = page.locator('.layer-item .layer-name', { hasText: '名片' })
  await cardItem.click()
  await page.waitForTimeout(100)
  await page.keyboard.press('o')
  // 画在容器区域内 (蓝色矩形右下方)
  await page.mouse.move(cx + 50, cy + 20)
  await page.mouse.down()
  await page.mouse.move(cx + 100, cy + 60, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-12.png` })

  // ── Step 13: 添加第二个显示状态 ──
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-13.png` })

  // ── Step 14: 最终截图 — 完整设计 ──
  // 切回默认状态查看最终结果
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-14-final.png` })

  // ── 保存设计文件 ──
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(200)
  const designData = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (designData) {
    fs.writeFileSync(`${SHOTS}/../design.intera`, designData, 'utf-8')
  }
})
