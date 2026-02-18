/**
 * Flow E 录屏 v3 — iOS Toggle Switch
 * 确保 pinia 暴露 + Preview autoCycle 生效
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

  // 验证 pinia 暴露
  const hasPinia = await page.evaluate(() => !!window.__pinia)
  console.log('pinia exposed:', hasPinia)
  if (!hasPinia) { console.error('❌ pinia not exposed'); await browser.close(); return }

  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  // ═══ Step 1: 绘制 Toggle 背景 (Frame 80x40) ═══
  console.log('📦 绘制 Toggle 背景...')
  await page.keyboard.press('f')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 40, cy - 20)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 20, { steps: 30 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  // 改背景色 → 深灰
  console.log('🎨 背景色 → 深灰...')
  await page.evaluate(() => {
    const store = window.__pinia._s.get('project')
    const ids = store.project.rootLayerIds
    const bgId = ids[ids.length - 1]
    store.updateLayerProp(bgId, 'fill', '#3a3a3c')
    store.updateLayerProp(bgId, 'cornerRadius', 20)
  })
  await page.waitForTimeout(800)

  // ═══ Step 2: 绘制滑块 (椭圆 32x32) ═══
  console.log('⚪ 绘制滑块...')
  await page.keyboard.press('o')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 36, cy - 16)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(cx - 4, cy + 16, { steps: 25 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  // 改滑块色 → 白色
  console.log('⚪ 滑块 → 白色...')
  await page.evaluate(() => {
    const store = window.__pinia._s.get('project')
    const ids = store.project.rootLayerIds
    const knobId = ids[0] // 最新绘制的在最前
    store.updateLayerProp(knobId, 'fill', '#ffffff')
  })
  await page.waitForTimeout(800)

  // 点击空白取消选中，展示一下当前设计
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)

  // ═══ Step 3: 添加状态 2 ═══
  console.log('➕ 添加状态 2...')
  // 通过 store 添加状态
  await page.evaluate(() => {
    const store = window.__pinia._s.get('project')
    store.addState()
  })
  await page.waitForTimeout(800)

  // 切换到状态 2
  const stateTabs = page.locator('.state-tab')
  const tabCount = await stateTabs.count()
  console.log('状态 tab 数量:', tabCount)
  if (tabCount >= 2) {
    await stateTabs.nth(1).click()
    await page.waitForTimeout(600)
    console.log('🔄 切换到状态 2')
  }

  // ═══ Step 4: 修改状态 2 属性 ═══
  // 选中滑块，修改 X 位置（右移）
  console.log('➡️ 修改状态 2 属性...')
  const layerItems = page.locator('.layer-item')
  const lc = await layerItems.count()
  if (lc >= 1) {
    await layerItems.first().click() // 椭圆在最上面
    await page.waitForTimeout(400)
  }

  // 通过属性面板修改 X
  const xInput = page.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xInput.isVisible()) {
    const curX = await xInput.inputValue()
    const newX = Math.round(parseFloat(curX) + 48)
    await xInput.click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(String(newX), { delay: 60 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    console.log(`  滑块 X: ${curX} → ${newX}`)
  }

  // 选中背景 Frame，改颜色为 iOS 绿色
  if (lc >= 2) {
    await layerItems.last().click()
    await page.waitForTimeout(400)
  }

  // 通过 color swatch 改色
  const fillSwatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await fillSwatch.isVisible()) {
    await fillSwatch.click()
    await page.waitForTimeout(400)
    const hexInput = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hexInput.isVisible()) {
      await hexInput.click()
      await hexInput.fill('')
      await hexInput.type('#34c759', { delay: 40 })
      await hexInput.press('Enter')
      await page.waitForTimeout(400)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
  console.log('🟢 背景 → iOS 绿色')

  // 展示状态 2 的设计
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)

  // ═══ Step 5: 切回状态 1，展示 Preview ═══
  console.log('🔄 切回状态 1...')
  await stateTabs.first().click()
  await page.waitForTimeout(1000)

  // ═══ Step 6: Preview 演示 — 点击触发 autoCycle ═══
  console.log('🎬 Preview 演示...')
  const previewDevice = page.locator('.preview-device')
  const previewBox = await previewDevice.boundingBox()
  
  if (previewBox) {
    const px = previewBox.x + previewBox.width / 2
    const py = previewBox.y + previewBox.height / 2
    console.log('  Preview 位置:', px, py)

    // 验证 autoCycle 条件
    const canCycle = await page.evaluate(() => {
      const store = window.__pinia._s.get('project')
      const group = store.project.stateGroups[0]
      const patches = store.project.patches || []
      const hasTouchPatches = patches.some(p => p.type === 'touch')
      return {
        stateCount: group?.displayStates?.length ?? 0,
        hasTouchPatches,
        canAutoCycle: !hasTouchPatches && (group?.displayStates?.length ?? 0) >= 2
      }
    })
    console.log('  autoCycle 条件:', JSON.stringify(canCycle))

    // 多次点击 Preview 触发状态切换
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(px, py)
      // 等弹簧动画完成
      await page.waitForTimeout(1200)
      
      const activeState = await page.evaluate(() => {
        const store = window.__pinia._s.get('project')
        const group = store.project.stateGroups[0]
        return group?.activeDisplayStateId
      })
      console.log(`  点击 ${i + 1}/10 → state: ${activeState}`)
    }
  } else {
    console.log('⚠️ Preview 面板不可见')
  }

  // 结尾停留
  await page.waitForTimeout(2000)
  console.log('🏁 录制结束')

  // 关闭并保存视频
  const videoPath = page.video()?.path()
  await page.close()
  await ctx.close()
  await browser.close()
  console.log('📹 视频:', videoPath)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
