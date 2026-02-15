/**
 * Demo 3: 拖拽交互 — 用 behaviorDrag 实现可拖拽卡片
 */
import { chromium } from '@playwright/test'
import { test } from '@playwright/test'

test('录制拖拽交互演示', async () => {
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

  // 画一个卡片
  await page.keyboard.press('r')
  await page.waitForTimeout(100)
  await page.mouse.move(cx - 50, cy - 35)
  await page.mouse.down()
  await page.mouse.move(cx + 50, cy + 35, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  // 填充紫色 + 圆角
  const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  await colorInput.evaluate((el: HTMLInputElement) => {
    el.value = '#7c3aed'; el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const r = page.locator('.prop-field', { hasText: '圆角' }).locator('.input').first()
  await r.fill('12'); await r.press('Enter')
  await page.waitForTimeout(200)

  await page.screenshot({ path: '/tmp/intera-demos/drag-01-card.png' })

  // Patch: 添加 Drag 行为节点
  await page.locator('.patch-toolbar button[data-type="behaviorDrag"]').click()
  await page.waitForTimeout(200)

  // 配置 Drag 图层
  const dragNode = page.locator('.patch-node').nth(0)
  const dragSel = dragNode.locator('.cfg-select').first()
  if (await dragSel.count() > 0) {
    const opts = await dragSel.locator('option').allTextContents()
    const layerOpt = opts.find((o: string) => o !== '选择…')
    if (layerOpt) await dragSel.selectOption({ label: layerOpt })
  }
  await page.waitForTimeout(200)

  await page.screenshot({ path: '/tmp/intera-demos/drag-02-patch.png' })

  // ━━━ 录制：在预览面板拖拽卡片 ━━━
  const pf = page.locator('.preview-frame')
  const pfBox = await pf.boundingBox()
  if (pfBox) {
    const pcx = pfBox.x + pfBox.width / 2
    const pcy = pfBox.y + pfBox.height / 2

    // 拖拽路径 1: 向右上
    await page.mouse.move(pcx, pcy)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(pcx + i * 4, pcy - i * 2, { steps: 1 })
      await page.waitForTimeout(30)
    }
    await page.mouse.up()
    await page.waitForTimeout(800)

    // 拖拽路径 2: 向左下
    const newX = pcx + 80, newY = pcy - 40
    await page.mouse.move(newX, newY)
    await page.mouse.down()
    for (let i = 0; i < 25; i++) {
      await page.mouse.move(newX - i * 5, newY + i * 3, { steps: 1 })
      await page.waitForTimeout(30)
    }
    await page.mouse.up()
    await page.waitForTimeout(800)

    // 拖拽路径 3: 画圆
    const startX = newX - 125, startY = newY + 75
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180
      await page.mouse.move(startX + Math.cos(rad) * 50, startY + Math.sin(rad) * 50, { steps: 1 })
      await page.waitForTimeout(20)
    }
    await page.mouse.up()
    await page.waitForTimeout(1000)
  }

  await page.screenshot({ path: '/tmp/intera-demos/drag-03-final.png' })

  // 保存视频
  const videoPath = await page.video()?.path()
  await ctx.close()
  await browser.close()

  if (videoPath) {
    const fs = await import('fs')
    fs.copyFileSync(videoPath, '/tmp/intera-demos/drag-demo.webm')
    console.log('📹 视频: /tmp/intera-demos/drag-demo.webm')
  }
})
