/**
 * Flow E 录屏 — iOS Toggle Switch (states + curves)
 * non-headless + Playwright recordVideo
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
  await page.waitForTimeout(1500)
  console.log('✅ 页面加载完成')

  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  // ═══ Step 1: 绘制 Toggle 背景 (Frame) ═══
  await page.keyboard.press('f')
  await page.waitForTimeout(300)
  console.log('🔧 Frame 工具激活')

  // 绘制 60x30 Frame
  await page.mouse.move(cx - 30, cy - 15)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(cx + 30, cy + 15, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  console.log('📦 Toggle 背景绘制完成')

  // 修改背景色为深灰
  const fillSwatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await fillSwatch.isVisible()) {
    await fillSwatch.click()
    await page.waitForTimeout(300)
    const hexInput = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hexInput.isVisible()) {
      await hexInput.click()
      await hexInput.fill('')
      await hexInput.type('#3a3a3c', { delay: 50 })
      await hexInput.press('Enter')
      await page.waitForTimeout(300)
    }
  }
  // 关闭 ColorPicker
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  console.log('🎨 背景色 → 深灰')

  // 重新选中 Frame
  const layers = page.locator('.layer-item')
  if (await layers.count() > 0) {
    await layers.last().click()
    await page.waitForTimeout(300)
  }

  // 修改圆角
  const cornerInput = page.locator('.prop-row', { hasText: '圆角' }).locator('input').first()
  if (await cornerInput.isVisible()) {
    await cornerInput.click({ force: true })
    await page.waitForTimeout(100)
    await page.keyboard.press('Meta+a')
    await page.keyboard.type('15', { delay: 80 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
  }
  console.log('🔵 圆角 → 15')

  // ═══ Step 2: 绘制滑块 (椭圆) ═══
  await page.keyboard.press('o')
  await page.waitForTimeout(300)
  console.log('🔧 椭圆工具激活')

  // 在 Toggle 左侧绘制 26x26 圆
  const knobX = cx - 27, knobY = cy - 13
  await page.mouse.move(knobX, knobY)
  await page.waitForTimeout(200)
  await page.mouse.down()
  await page.mouse.move(knobX + 26, knobY + 26, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  console.log('⚪ 滑块绘制完成')

  // 修改滑块颜色为白色
  const fillSwatch2 = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await fillSwatch2.isVisible()) {
    await fillSwatch2.click()
    await page.waitForTimeout(300)
    const hexInput2 = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hexInput2.isVisible()) {
      await hexInput2.click()
      await hexInput2.fill('')
      await hexInput2.type('#ffffff', { delay: 50 })
      await hexInput2.press('Enter')
      await page.waitForTimeout(300)
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  console.log('⚪ 滑块 → 白色')

  // ═══ Step 3: 添加第二个状态 ═══
  // 找状态栏的 + 按钮
  const addBtn = page.locator('button', { hasText: '+' }).first()
  if (await addBtn.isVisible()) {
    await addBtn.click()
    await page.waitForTimeout(500)
    console.log('➕ 添加状态 2')
  } else {
    // 尝试其他选择器
    const stateAdd = page.locator('.state-bar button').last()
    if (await stateAdd.isVisible()) {
      await stateAdd.click()
      await page.waitForTimeout(500)
      console.log('➕ 添加状态 2 (alt)')
    }
  }

  // 切换到状态 2
  const stateTabs = page.locator('.state-tab')
  const tabCount = await stateTabs.count()
  if (tabCount >= 2) {
    await stateTabs.nth(1).click()
    await page.waitForTimeout(500)
    console.log('🔄 切换到状态 2')
  }

  // ═══ Step 4: 修改状态 2 属性 ═══
  // 选中滑块
  const layersNow = page.locator('.layer-item')
  const layerCount = await layersNow.count()
  if (layerCount >= 1) {
    await layersNow.first().click() // 椭圆在最上面
    await page.waitForTimeout(300)
  }

  // 修改 X 坐标（右移 30px）
  const xInput = page.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xInput.isVisible()) {
    const currentX = await xInput.inputValue()
    const newX = Math.round(parseFloat(currentX) + 30)
    await xInput.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(String(newX), { delay: 80 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    console.log(`➡️ 滑块 X: ${currentX} → ${newX}`)
  }

  // 选中背景 Frame，改颜色为绿色
  if (layerCount >= 2) {
    await layersNow.last().click()
    await page.waitForTimeout(300)
  }
  const fillSwatch3 = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await fillSwatch3.isVisible()) {
    await fillSwatch3.click()
    await page.waitForTimeout(300)
    const hexInput3 = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hexInput3.isVisible()) {
      await hexInput3.click()
      await hexInput3.fill('')
      await hexInput3.type('#34c759', { delay: 50 })
      await hexInput3.press('Enter')
      await page.waitForTimeout(300)
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  console.log('🟢 背景 → iOS 绿色')

  // ═══ Step 5: 设置弹簧曲线 ═══
  // 点击曲线面板（如果有的话）
  const curvePanel = page.locator('.curve-panel, .transition-panel').first()
  if (await curvePanel.isVisible()) {
    // 找弹簧预设
    const springPreset = page.locator('button, .preset', { hasText: /spring|弹簧/ }).first()
    if (await springPreset.isVisible()) {
      await springPreset.click()
      await page.waitForTimeout(300)
      console.log('🌀 弹簧曲线设置')
    }
  }

  // ═══ Step 6: Patch 连线 ═══
  await page.evaluate(() => {
    try {
      const pinia = window.__pinia
      if (!pinia) { console.log('no pinia'); return }
      
      const patchStore = pinia._s.get('patch')
      const projectStore = pinia._s.get('project')
      if (!patchStore || !projectStore) { console.log('no stores'); return }

      const project = projectStore.project
      const layerIds = project.rootLayerIds
      const bgLayerId = layerIds[layerIds.length - 1]

      // 获取状态组
      const groups = project.stateGroups
      const group = groups[0]
      if (!group) { console.log('no state group'); return }
      const states = group.displayStateIds || group.stateIds
      const state1 = states[0]
      const state2 = states[1]

      // 添加节点
      if (patchStore.addNode) {
        patchStore.addNode('touch', 80, 100)
        patchStore.addNode('toggle', 280, 100)
        patchStore.addNode('to', 480, 60)
        patchStore.addNode('to', 480, 180)
      }

      console.log('patch nodes added')
    } catch (e) {
      console.log('patch error:', e.message)
    }
  })
  await page.waitForTimeout(800)
  console.log('🔗 Patch 节点添加')

  // ═══ Step 7: 切回状态 1，准备 Preview ═══
  const state1Tab = page.locator('.state-tab').first()
  if (await state1Tab.isVisible()) {
    await state1Tab.click()
    await page.waitForTimeout(500)
  }
  console.log('🔄 切回状态 1')

  // ═══ Step 8: Preview 演示 ═══
  // 找到 Preview 面板并点击触发交互
  const preview = page.locator('.preview-panel, .preview-container, .panel-left .preview').first()
  if (await preview.isVisible()) {
    const box = await preview.boundingBox()
    if (box) {
      console.log('🎬 开始 Preview 演示')
      for (let i = 0; i < 8; i++) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(1000) // 等弹簧动画完成
        console.log(`  点击 ${i + 1}/8`)
      }
    }
  } else {
    console.log('⚠️ Preview 面板不可见，尝试直接点击画布')
    // 点击画布上的 Toggle
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(cx, cy)
      await page.waitForTimeout(1000)
      console.log(`  画布点击 ${i + 1}/8`)
    }
  }

  // 结尾停留
  await page.waitForTimeout(2000)
  console.log('🏁 录制结束')

  await page.close()
  const videoPath = await page.video()?.path()
  console.log('📹 视频路径:', videoPath)
  
  await ctx.close()
  await browser.close()
  console.log('✅ 完成')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
