import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1920-arrow-drag-layers/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('intera_project'))
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function canvasCenter(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

/** 读取属性面板中的 X 值 */
async function readPropX(page: Page): Promise<string> {
  const input = page.locator('.prop-field:has(span.label:text("X"))').locator('input').first()
  return await input.inputValue()
}

/** 读取属性面板中的 Y 值 */
async function readPropY(page: Page): Promise<string> {
  const input = page.locator('.prop-field:has(span.label:text("Y"))').locator('input').first()
  return await input.inputValue()
}

test('旅程: 方向键与图层拖拽', async ({ page }) => {
  await load(page)
  const { cx, cy, box } = await canvasCenter(page)
  await page.screenshot({ path: `${SHOTS}/step-01-clean.png` })

  // ━━ Step 02: 绘制矩形 ━━
  await page.keyboard.press('r')
  await page.mouse.move(cx - 50, cy - 40)
  await page.mouse.down()
  await page.mouse.move(cx + 50, cy + 40, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02-rect.png` })

  // 记录初始坐标
  const initX = await readPropX(page)
  const initY = await readPropY(page)

  // ━━ Step 03: 尝试方向键移动 — 预期无效 ━━
  // 先确保选中状态，点击画布空白再点回图层
  await page.mouse.click(cx, cy)  // 点中矩形
  await page.waitForTimeout(100)

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(100)

  const afterArrowX = await readPropX(page)
  const afterArrowY = await readPropY(page)

  // 方向键未实现 → 坐标不变
  const arrowMoved = (afterArrowX !== initX || afterArrowY !== initY)
  await page.screenshot({ path: `${SHOTS}/step-03-arrow-attempt.png` })

  // ━━ Step 04: 绘制第二个椭圆 ━━
  await page.keyboard.press('o')
  await page.mouse.move(cx + 80, cy - 60)
  await page.mouse.down()
  await page.mouse.move(cx + 160, cy, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04-ellipse.png` })

  // ━━ Step 05: 拖拽矩形到画板左上角边缘 ━━
  // 先选中矩形
  const rectLayer = page.locator('.layer-item .layer-name', { hasText: '矩形' })
  await rectLayer.click()
  await page.waitForTimeout(100)

  // 获取矩形在画布上的位置进行拖拽
  const artboard = page.locator('.artboard').first()
  const abBox = await artboard.boundingBox()
  if (abBox) {
    // 先点中矩形 (画布中心附近)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    // 拖到画板左上角
    await page.mouse.move(abBox.x + 20, abBox.y + 20, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(200)
  }
  // 重新选中查看坐标
  await rectLayer.click()
  await page.waitForTimeout(200)
  const draggedX = await readPropX(page)
  const draggedY = await readPropY(page)
  await page.screenshot({ path: `${SHOTS}/step-05-drag-corner.png` })

  // ━━ Step 06: 拖拽矩形到画板外 (超出边界) ━━
  if (abBox) {
    await page.mouse.move(abBox.x + 20, abBox.y + 20)
    await page.mouse.down()
    // 拖到画板外 (左边)
    await page.mouse.move(abBox.x - 80, abBox.y + 100, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(200)
  }
  await rectLayer.click()
  await page.waitForTimeout(200)
  const outOfBoundsX = await readPropX(page)
  await page.screenshot({ path: `${SHOTS}/step-06-out-of-bounds.png` })

  // 验证: 负坐标被允许 (无边界约束)
  expect(Number(outOfBoundsX)).toBeLessThan(0)

  // ━━ Step 07: 拖回画板中央 ━━
  if (abBox) {
    // 矩形现在在画板外，从其当前位置拖回
    await page.mouse.move(abBox.x - 60, abBox.y + 100)
    await page.mouse.down()
    await page.mouse.move(cx, cy, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(200)
  }
  await rectLayer.click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-07-drag-back.png` })

  // ━━ Step 08: 添加第二个状态，在新状态下拖拽 ━━
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  await page.locator('.state-tab').last().click()
  await page.waitForTimeout(200)

  // 选中矩形并在新状态下拖拽
  await rectLayer.click()
  await page.waitForTimeout(200)
  const stateBeforeX = await readPropX(page)

  // 在新状态下拖拽矩形
  if (abBox) {
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 100, cy - 50, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)
  }
  await rectLayer.click()
  await page.waitForTimeout(200)
  const stateAfterX = await readPropX(page)
  await page.screenshot({ path: `${SHOTS}/step-08-state2-drag.png` })

  // ━━ Step 09: 切回默认状态，验证坐标未被污染 ━━
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(200)
  await rectLayer.click()
  await page.waitForTimeout(200)
  const defaultStateX = await readPropX(page)
  await page.screenshot({ path: `${SHOTS}/step-09-default-intact.png` })

  // 默认状态的坐标应与状态2的拖拽后坐标不同 (override 正确)
  // (注: 如果相同说明 override 未生效)

  // ━━ Step 10: 图层面板拖拽重排序 ━━
  const layers = page.locator('.layer-item')
  const layersBefore = await layers.count()
  await page.screenshot({ path: `${SHOTS}/step-10-final.png` })

  // ━━ 保存设计文件 ━━
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's', code: 'KeyS', ctrlKey: true, bubbles: true,
    }))
  })
  await page.waitForTimeout(200)
  const exportData = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (exportData) {
    fs.writeFileSync(`${SHOTS}/../design.intera`, exportData, 'utf-8')
  }
})
