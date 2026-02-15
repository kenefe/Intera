/**
 * 截图：修复后的属性面板
 */
import { test } from '@playwright/test'

test('属性面板截图', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(600)

  // 画矩形
  await page.keyboard.press('r')
  const box = await page.locator('.canvas-viewport').boundingBox()
  const cx = box!.x + box!.width / 2, cy = box!.y + box!.height / 2
  await page.mouse.move(cx - 60, cy - 40)
  await page.mouse.down()
  await page.mouse.move(cx + 60, cy + 40, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  // 设置一些属性让面板更丰富
  const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  await colorInput.evaluate((el: HTMLInputElement) => {
    el.value = '#4a90d9'; el.dispatchEvent(new Event('input', { bubbles: true }))
  })

  const r = page.locator('.prop-field', { hasText: '圆角' }).locator('.input').first()
  if (await r.count() > 0) { await r.fill('12'); await r.press('Enter') }
  await page.waitForTimeout(200)

  // 添加第二状态并修改属性（显示覆盖标记）
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  const opacity = page.locator('.prop-field', { hasText: '透明度' }).locator('.input')
  if (await opacity.count() > 0) { await opacity.fill('0.7'); await opacity.press('Enter') }

  const scaleX = page.locator('.prop-field', { hasText: '缩放X' }).locator('.input')
  if (await scaleX.count() > 0) { await scaleX.fill('0.9'); await scaleX.press('Enter') }

  await page.waitForTimeout(200)

  await page.screenshot({ path: '/tmp/intera-demos/panel-fixed.png' })
  console.log('📸 /tmp/intera-demos/panel-fixed.png')
})
