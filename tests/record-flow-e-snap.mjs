/**
 * Flow E 最终版 — 不用 recordVideo，用高频截帧
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'http://localhost:5173/Intera/'
const FRAMES = 'docs/journeys/20260216_0930-states-curves-toggle/final-frames'
mkdirSync(FRAMES, { recursive: true })

let n = 0
async function snap(page, label) {
  n++
  await page.screenshot({ path: `${FRAMES}/f-${String(n).padStart(4,'0')}.png` })
  if (label) console.log(`[${n}] ${label}`)
}
async function hold(page, ms, label) {
  const count = Math.max(1, Math.round(ms / 50))
  for (let i = 0; i < count; i++) {
    await snap(page, i === 0 ? label : null)
    await page.waitForTimeout(50)
  }
}
// 动画捕捉 — 高频截帧
async function capture(page, ms, label) {
  const count = Math.max(1, Math.round(ms / 33)) // ~30fps
  for (let i = 0; i < count; i++) {
    await snap(page, i === 0 ? label : null)
    await page.waitForTimeout(33)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  console.log('✅ loaded')

  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  // 开场
  await hold(page, 1000, '开场')

  // ═══ 1. Frame ═══
  await page.keyboard.press('f')
  await page.waitForTimeout(300)
  await snap(page, 'F 工具')

  await page.mouse.move(cx - 40, cy - 20)
  await page.mouse.down()
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(cx - 40 + 4 * i, cy - 20 + 2 * i, { steps: 1 })
    await snap(page)
  }
  await page.mouse.up()
  await hold(page, 500, 'Frame 完成')

  // 改属性
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const ids = s.project.rootLayerIds
    s.updateLayerProps(ids[ids.length - 1], { fill: '#3a3a3c', cornerRadius: 20 })
  })
  await hold(page, 800, '深灰 + 圆角')

  // ═══ 2. 椭圆 ═══
  await page.keyboard.press('o')
  await page.waitForTimeout(300)
  await snap(page, 'O 工具')

  await page.mouse.move(cx - 36, cy - 16)
  await page.mouse.down()
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(cx - 36 + 2.13 * i, cy - 16 + 2.13 * i, { steps: 1 })
    await snap(page)
  }
  await page.mouse.up()
  await hold(page, 500, '椭圆完成')

  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.updateLayerProps(s.project.rootLayerIds[0], { fill: '#ffffff' })
  })
  await hold(page, 800, '白色滑块')

  await page.keyboard.press('Escape')
  await hold(page, 1000, '展示 Toggle 关闭态')

  // ═══ 3. 添加状态 2 ═══
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    s.addDisplayState(g.id, '开启')
  })
  await hold(page, 600, '添加状态 2')

  const tabs = page.locator('.state-tab')
  await tabs.nth(1).click()
  await hold(page, 800, '切到状态 2')

  // ═══ 4. 修改状态 2 ═══
  await page.locator('.layer-item').first().click()
  await page.waitForTimeout(300)

  const xInput = page.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xInput.isVisible()) {
    const curX = await xInput.inputValue()
    const newX = Math.round(parseFloat(curX) + 48)
    await xInput.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(String(newX), { delay: 60 })
    await snap(page, `X: ${curX} → ${newX}`)
    await page.keyboard.press('Enter')
    await hold(page, 600, '滑块右移')
  }

  // 背景变绿
  await page.locator('.layer-item').last().click()
  await page.waitForTimeout(300)
  const swatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch').first()
  if (await swatch.isVisible()) {
    await swatch.click()
    await page.waitForTimeout(300)
    const hex = page.locator('.color-picker-popup input[type="text"]').first()
    if (await hex.isVisible()) {
      await hex.click()
      await hex.fill('')
      await hex.type('#34c759', { delay: 40 })
      await snap(page, '输入绿色')
      await hex.press('Enter')
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  // 确保 override
  await page.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    const st2 = g.displayStates[g.displayStates.length - 1]
    const ids = s.project.rootLayerIds
    const knob = s.project.layers[ids[0]]
    s.setOverride(st2.id, ids[0], { x: (knob?.x ?? 0) + 48 })
    s.setOverride(st2.id, ids[ids.length - 1], { fill: '#34c759' })
  })
  await hold(page, 1000, '状态 2 完成 — 绿色开启态')

  // ═══ 5. 切回状态 1 ═══
  await tabs.first().click()
  await hold(page, 1200, '切回状态 1')

  // ═══ 6. Preview 演示 ═══
  const pd = page.locator('.preview-device')
  const pBox = await pd.boundingBox()
  if (pBox) {
    const px = pBox.x + pBox.width / 2
    const py = pBox.y + pBox.height / 2

    for (let i = 0; i < 8; i++) {
      await page.mouse.click(px, py)
      // 捕捉弹簧动画
      await capture(page, 1200, `Preview 点击 ${i + 1}/8`)
    }
  }

  await hold(page, 1500, '结尾')
  console.log(`🏁 总帧数: ${n}`)
  await browser.close()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
