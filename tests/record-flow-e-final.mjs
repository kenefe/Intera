/**
 * Flow E 最终录屏 — iOS Toggle Switch
 * 所有 API 已验证通过
 */
import { chromium } from 'playwright'

const URL = 'http://localhost:5173/Intera/'
const VIDEO_DIR = 'docs/journeys/20260216_0930-states-curves-toggle'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } }
  })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  console.log('✅ loaded')

  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  // ═══ 1. 绘制 Toggle 背景 (Frame) ═══
  await page.keyboard.press('f')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 40, cy - 20)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 20, { steps: 30 })
  await page.mouse.up()
  await page.waitForTimeout(600)
  console.log('1. Frame drawn')

  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const ids = s.project.rootLayerIds
    s.updateLayerProps(ids[ids.length - 1], { fill: '#3a3a3c', cornerRadius: 20 })
  })
  await page.waitForTimeout(1000)
  console.log('   → dark gray + radius 20')

  // ═══ 2. 绘制滑块 (椭圆) ═══
  await page.keyboard.press('o')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 36, cy - 16)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(cx - 4, cy + 16, { steps: 25 })
  await page.mouse.up()
  await page.waitForTimeout(600)
  console.log('2. Ellipse drawn')

  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.updateLayerProps(s.project.rootLayerIds[0], { fill: '#ffffff' })
  })
  await page.waitForTimeout(800)
  console.log('   → white')

  // 取消选中，展示当前设计
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)

  // ═══ 3. 添加状态 2 ═══
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    s.addDisplayState(g.id, '开启')
  })
  await page.waitForTimeout(800)
  console.log('3. State 2 added')

  // 点击状态 2 tab
  const stateTabs = page.locator('.state-tab')
  await stateTabs.nth(1).click()
  await page.waitForTimeout(800)
  console.log('   → switched to state 2')

  // ═══ 4. 修改状态 2 属性 ═══
  // 选中滑块图层
  const layerItems = page.locator('.layer-item')
  await layerItems.first().click()
  await page.waitForTimeout(400)

  // 通过属性面板修改 X（可视化操作）
  const xInput = page.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xInput.isVisible()) {
    const curX = await xInput.inputValue()
    const newX = Math.round(parseFloat(curX) + 48)
    await xInput.click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(String(newX), { delay: 80 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)
    console.log(`4. Knob X: ${curX} → ${newX}`)
  }

  // 选中背景，改颜色
  await layerItems.last().click()
  await page.waitForTimeout(400)

  const fillSwatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await fillSwatch.isVisible()) {
    await fillSwatch.click()
    await page.waitForTimeout(400)
    const hexInput = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hexInput.isVisible()) {
      await hexInput.click()
      await hexInput.fill('')
      await hexInput.type('#34c759', { delay: 50 })
      await hexInput.press('Enter')
      await page.waitForTimeout(400)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
  console.log('   → green background')

  // 也通过 store 确保 override 正确
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    const st2 = g.displayStates[g.displayStates.length - 1]
    const ids = s.project.rootLayerIds
    const knob = s.project.layers[ids[0]]
    s.setOverride(st2.id, ids[0], { x: (knob?.x ?? 0) + 48 })
    s.setOverride(st2.id, ids[ids.length - 1], { fill: '#34c759' })
  })
  await page.waitForTimeout(800)

  // 取消选中展示
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)

  // ═══ 5. 切回状态 1 ═══
  await stateTabs.first().click()
  await page.waitForTimeout(1500)
  console.log('5. Back to state 1')

  // ═══ 6. Preview 演示 ═══
  console.log('6. Preview demo')
  const pd = page.locator('.preview-device')
  const pBox = await pd.boundingBox()

  if (pBox) {
    const px = pBox.x + pBox.width / 2
    const py = pBox.y + pBox.height / 2

    for (let i = 0; i < 10; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(1500)
      const st = await page.evaluate(() => {
        const s = window.__pinia._s.get('project')
        return s.project.stateGroups[0]?.activeDisplayStateId
      })
      console.log(`   click ${i + 1}/10 → ${st}`)
    }
  }

  await page.waitForTimeout(2000)
  console.log('🏁 done')

  const vp = page.video()?.path()
  await page.close()
  await ctx.close()
  await browser.close()
  console.log('📹', vp)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
