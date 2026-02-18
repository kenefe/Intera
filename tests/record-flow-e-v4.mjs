/**
 * Flow E 录屏 v4 — iOS Toggle Switch
 * 正确的 store API + Preview autoCycle 验证
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

  const hasPinia = await page.evaluate(() => !!window.__pinia)
  if (!hasPinia) { console.error('❌ no pinia'); await browser.close(); return }
  console.log('✅ pinia ready')

  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  // ═══ Step 1: Frame (Toggle 背景 80x40) ═══
  console.log('1️⃣ 绘制 Toggle 背景')
  await page.keyboard.press('f')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 40, cy - 20)
  await page.waitForTimeout(150)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 20, { steps: 30 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  // 通过 store 改属性
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const ids = s.project.rootLayerIds
    const bgId = ids[ids.length - 1]
    s.updateLayerProps(bgId, { fill: '#3a3a3c', cornerRadius: 20 })
  })
  await page.waitForTimeout(800)
  console.log('  → 深灰 + 圆角 20')

  // ═══ Step 2: 椭圆 (滑块 32x32) ═══
  console.log('2️⃣ 绘制滑块')
  await page.keyboard.press('o')
  await page.waitForTimeout(400)
  await page.mouse.move(cx - 36, cy - 16)
  await page.waitForTimeout(150)
  await page.mouse.down()
  await page.mouse.move(cx - 4, cy + 16, { steps: 25 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const ids = s.project.rootLayerIds
    s.updateLayerProps(ids[0], { fill: '#ffffff' })
  })
  await page.waitForTimeout(800)
  console.log('  → 白色')

  // 取消选中，展示设计
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1200)

  // ═══ Step 3: 添加状态 2 ═══
  console.log('3️⃣ 添加状态 2')
  const stateInfo = await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const group = s.project.stateGroups[0]
    if (!group) return null
    const newState = s.addDisplayState(group.id, '开启')
    return { groupId: group.id, newStateId: newState?.id, count: group.displayStates.length }
  })
  console.log('  状态信息:', JSON.stringify(stateInfo))
  await page.waitForTimeout(800)

  // 切换到状态 2（通过 UI 点击 tab）
  const stateTabs = page.locator('.state-tab')
  const tabCount = await stateTabs.count()
  console.log('  tab 数量:', tabCount)
  if (tabCount >= 2) {
    await stateTabs.nth(1).click()
    await page.waitForTimeout(600)
    console.log('  → 切换到状态 2')
  }

  // ═══ Step 4: 修改状态 2 属性 ═══
  console.log('4️⃣ 修改状态 2 属性')
  
  // 通过 store 设置 override
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const group = s.project.stateGroups[0]
    const states = group.displayStates
    const state2 = states[states.length - 1]
    const ids = s.project.rootLayerIds
    const knobId = ids[0]  // 椭圆
    const bgId = ids[ids.length - 1]  // Frame

    // 获取滑块当前 X
    const knob = s.project.layers[knobId]
    const knobX = knob?.x ?? 0

    // 滑块右移 48px
    s.setOverride(state2.id, knobId, { x: knobX + 48 })
    // 背景变绿
    s.setOverride(state2.id, bgId, { fill: '#34c759' })
  })
  await page.waitForTimeout(1000)
  console.log('  → 滑块右移 + 背景变绿')

  // 展示状态 2
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)

  // ═══ Step 5: 切回状态 1 ═══
  console.log('5️⃣ 切回状态 1')
  await stateTabs.first().click()
  await page.waitForTimeout(1200)

  // ═══ Step 6: Preview 演示 ═══
  console.log('6️⃣ Preview 演示')
  
  // 验证 autoCycle 条件
  const cycleInfo = await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const group = s.project.stateGroups[0]
    const patches = s.project.patches || []
    return {
      states: group?.displayStates?.length ?? 0,
      hasTouchPatches: patches.some(p => p.type === 'touch'),
      activeState: group?.activeDisplayStateId
    }
  })
  console.log('  autoCycle:', JSON.stringify(cycleInfo))

  const previewDevice = page.locator('.preview-device')
  const pBox = await previewDevice.boundingBox()
  
  if (pBox) {
    const px = pBox.x + pBox.width / 2
    const py = pBox.y + pBox.height / 2

    for (let i = 0; i < 10; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(1500) // 等弹簧动画

      const state = await page.evaluate(() => {
        const s = window.__pinia._s.get('project')
        return s.project.stateGroups[0]?.activeDisplayStateId
      })
      console.log(`  点击 ${i + 1}/10 → ${state}`)
    }
  }

  // 结尾
  await page.waitForTimeout(2000)
  console.log('🏁 完成')

  const vp = page.video()?.path()
  await page.close()
  await ctx.close()
  await browser.close()
  console.log('📹', vp)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
