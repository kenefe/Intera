/**
 * Demo 2: 多元素编排 — 3 个色块交错弹簧动画
 */
import { chromium } from '@playwright/test'
import { test } from '@playwright/test'

test('录制多元素编排动画', async () => {
  test.setTimeout(90000)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  const box = await page.locator('.canvas-viewport').boundingBox()
  const cx = box!.x + box!.width / 2, cy = box!.y + box!.height / 2

  // 画 3 个色块
  const colors = ['#e74c3c', '#3498db', '#2ecc71']
  const offsets = [[-60, -20], [0, 10], [60, 40]]

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await page.mouse.move(cx - 50 + offsets[i][0], cy + offsets[i][1] - 15)
    await page.mouse.down()
    await page.mouse.move(cx + 50 + offsets[i][0], cy + offsets[i][1] + 15, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // 填充颜色
    const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
    await colorInput.evaluate((el: HTMLInputElement, c: string) => {
      el.value = c; el.dispatchEvent(new Event('input', { bubbles: true }))
    }, colors[i])

    // 圆角
    const r = page.locator('.prop-field', { hasText: '圆角' }).locator('.input').first()
    if (await r.count() > 0) { await r.fill('8'); await r.press('Enter') }
    await page.waitForTimeout(100)
  }

  await page.screenshot({ path: '/tmp/intera-demos/multi-01-drawn.png' })

  // 添加第二状态
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  // 选中每个图层，修改第二状态属性
  const layers = page.locator('.layer-item')
  const layerCount = await layers.count()

  // 图层顺序是倒的（最后画的在最上面）
  // 第三个色块（绿色）→ 右移 + 旋转
  await layers.nth(0).click()
  await page.waitForTimeout(200)
  const props3 = [['X', '180'], ['旋转', '8'], ['透明度', '0.7']]
  for (const [l, v] of props3) {
    const inp = page.locator('.prop-field', { hasText: l }).locator('.input').first()
    if (await inp.count() > 0) { await inp.fill(v); await inp.press('Enter'); await page.waitForTimeout(60) }
  }

  // 第二个色块（蓝色）→ 放大 + 上移
  await layers.nth(1).click()
  await page.waitForTimeout(200)
  const props2 = [['Y', '250'], ['缩放X', '1.15'], ['缩放Y', '1.15']]
  for (const [l, v] of props2) {
    const inp = page.locator('.prop-field', { hasText: l }).locator('.input').first()
    if (await inp.count() > 0) { await inp.fill(v); await inp.press('Enter'); await page.waitForTimeout(60) }
  }

  // 第一个色块（红色）→ 左移 + 缩小
  await layers.nth(2).click()
  await page.waitForTimeout(200)
  const props1 = [['X', '100'], ['缩放X', '0.8'], ['缩放Y', '0.8'], ['透明度', '0.5']]
  for (const [l, v] of props1) {
    const inp = page.locator('.prop-field', { hasText: l }).locator('.input').first()
    if (await inp.count() > 0) { await inp.fill(v); await inp.press('Enter'); await page.waitForTimeout(60) }
  }

  // 曲线 — 柔和弹簧
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.4'); await params.nth(0).press('Enter')
    await params.nth(1).fill('0.85'); await params.nth(1).press('Enter')
  }

  await page.screenshot({ path: '/tmp/intera-demos/multi-02-state2.png' })

  // 切回默认状态
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(800)

  await page.screenshot({ path: '/tmp/intera-demos/multi-03-ready.png' })

  // ━━━ 录制：手动切换状态看弹簧动画 ━━━
  for (let i = 0; i < 3; i++) {
    await page.locator('.state-tab').nth(1).click()
    await page.waitForTimeout(2000) // 等弹簧完成
    await page.locator('.state-tab').first().click()
    await page.waitForTimeout(2000)
  }

  // 保存视频
  const videoPath = await page.video()?.path()
  await ctx.close()
  await browser.close()

  if (videoPath) {
    const fs = await import('fs')
    fs.copyFileSync(videoPath, '/tmp/intera-demos/multi-element-demo.webm')
    console.log('📹 视频: /tmp/intera-demos/multi-element-demo.webm')
  }
})
