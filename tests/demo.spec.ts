import { test, expect } from '@playwright/test'

const URL = process.env.TEST_URL ?? 'http://localhost:5173'

test('完整交互动效设计演示', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(URL)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'tests/screenshots/demo-01-empty.png' })

  // ── Step 1: 绘制卡片背景矩形 ──
  await page.keyboard.press('r')
  await page.waitForTimeout(200)
  // 在画板内拖拽绘制 (画板大约在 x:225~477, y:100~600)
  await page.mouse.move(270, 180)
  await page.mouse.down()
  await page.mouse.move(460, 320, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'tests/screenshots/demo-02-card-rect.png' })

  // ── Step 2: 绘制标题文本 ──
  await page.keyboard.press('t')
  await page.waitForTimeout(200)
  const canvas = page.locator('.canvas-area')
  const box = await canvas.boundingBox()
  await page.mouse.click(box!.x + 200, box!.y + 200)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'tests/screenshots/demo-03-text.png' })

  // ── Step 3: 选中卡片矩形，查看属性 ──
  await page.locator('.layer-item').first().click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'tests/screenshots/demo-04-select-card.png' })

  // ── Step 4: 修改属性 (给卡片加圆角和颜色) ──
  // 修改圆角
  const radiusInput = page.locator('.prop-field', { hasText: '圆角' }).locator('.input')
  if (await radiusInput.isVisible()) {
    await radiusInput.fill('16')
    await radiusInput.press('Enter')
  }
  // 修改填充颜色
  const colorInput = page.locator('.color-input')
  if (await colorInput.isVisible()) {
    await colorInput.fill('#3b3b6d')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'tests/screenshots/demo-05-styled-card.png' })

  // ── Step 5: 添加第二个显示状态 ──
  await page.locator('.add-btn').click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'tests/screenshots/demo-06-two-states.png' })

  // ── Step 6: 切换到第二个状态 ──
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'tests/screenshots/demo-07-state2-active.png' })

  // ── Step 7: 在新状态中修改属性 (展开效果) ──
  // 先选中卡片
  await page.locator('.layer-item').first().click()
  await page.waitForTimeout(200)
  // 修改位置和尺寸
  const inputs = page.locator('.prop-field .input')
  // X
  await inputs.nth(0).fill('230')
  await inputs.nth(0).press('Enter')
  // Y
  await inputs.nth(1).fill('120')
  await inputs.nth(1).press('Enter')
  // W (宽度变大)
  await inputs.nth(2).fill('300')
  await inputs.nth(2).press('Enter')
  // H (高度变大)
  await inputs.nth(3).fill('400')
  await inputs.nth(3).press('Enter')
  // 透明度
  const opacity = page.locator('.prop-field', { hasText: '透明度' }).locator('.input')
  if (await opacity.isVisible()) {
    await opacity.fill('1')
    await opacity.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'tests/screenshots/demo-08-state2-props.png' })

  // ── Step 8: 切回默认状态 (观察状态切换) ──
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'tests/screenshots/demo-09-back-to-default.png' })

  // ── Step 9: 再次切到状态2 (观察动画方向) ──
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'tests/screenshots/demo-10-animate-to-state2.png' })

  // ── Step 10: 查看右面板曲线配置 ──
  await page.screenshot({ path: 'tests/screenshots/demo-11-curve-panel.png' })

  // ── Step 11: 打开 Patch 编辑器 ──
  await page.click('button:has-text("Patch")')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tests/screenshots/demo-12-patch-editor.png' })

  // ── Step 12: 关闭 Patch ──
  await page.click('button:has-text("Patch")')
  await page.waitForTimeout(200)

  // ── Step 13: 左侧预览面板交互 (PreviewPanel 常驻) ──
  const previewFrame = page.locator('.preview-frame')
  await expect(previewFrame).toBeVisible()
  await previewFrame.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'tests/screenshots/demo-13-preview-interact.png' })

  // ── Step 14: 最终截图 ──
  await page.screenshot({ path: 'tests/screenshots/demo-14-final.png' })
})
