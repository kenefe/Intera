// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Journey R6 — 全能力画像: Breathing Orb
//  states + curves + patch + folme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const FILE_URL = 'http://127.0.0.1:4200/'
const DIR = 'docs/journeys/20260215_1010-full-breathing-orb'
const SHOT_DIR = path.join(DIR, 'screenshots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

let step = 0
async function snap(page, desc) {
  step++
  const p = path.join(SHOT_DIR, `step-${String(step).padStart(2,'0')}.png`)
  await page.screenshot({ path: p })
  console.log(`[${step}] ${desc}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(FILE_URL)
  await page.waitForTimeout(2000)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(2000)

  await snap(page, '初始画面 — 空画布')

  // ── 1. 绘制椭圆 ──
  await page.keyboard.press('o')
  await page.waitForTimeout(300)

  // canvas-viewport 是画布容器
  const vp = page.locator('.canvas-viewport')
  const vpBox = await vp.boundingBox()
  const cx = vpBox.x + vpBox.width * 0.5
  const cy = vpBox.y + vpBox.height * 0.4
  await page.mouse.move(cx - 30, cy - 30)
  await page.mouse.down()
  await page.mouse.move(cx + 30, cy + 30, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  await snap(page, '绘制椭圆 — 默认状态 orb')

  // ── 2. 添加状态 2 ──
  await page.click('.add-btn')
  await page.waitForTimeout(500)
  await snap(page, '添加状态 2')

  // ── 3. 切换到状态 2 并选中椭圆 ──
  const tabs = page.locator('.state-tab')
  const tabCount = await tabs.count()
  if (tabCount >= 2) {
    await tabs.nth(1).click()
    await page.waitForTimeout(300)
  }

  // 选中椭圆图层
  const layerItem = page.locator('.layer-item').first()
  if (await layerItem.count() > 0) {
    await layerItem.click()
    await page.waitForTimeout(300)
  }
  await snap(page, '状态 2 — 选中椭圆')

  // ── 4. 修改状态 2 属性 (覆盖) ──
  const numInputs = page.locator('.prop-field input.input[type="number"]')
  const ic = await numInputs.count()
  console.log(`  number inputs: ${ic}`)

  // 输入顺序: X(0) Y(1) W(2) H(3) rotation(4) scaleX(5) scaleY(6) opacity(7)
  if (ic >= 2) {
    await numInputs.nth(1).click()
    await numInputs.nth(1).fill('100')
    await numInputs.nth(1).press('Enter')
    await page.waitForTimeout(200)
    console.log('  Y → 100')
  }
  if (ic >= 3) {
    await numInputs.nth(2).click()
    await numInputs.nth(2).fill('300')
    await numInputs.nth(2).press('Enter')
    await page.waitForTimeout(200)
    console.log('  W → 300')
  }
  if (ic >= 4) {
    await numInputs.nth(3).click()
    await numInputs.nth(3).fill('300')
    await numInputs.nth(3).press('Enter')
    await page.waitForTimeout(200)
    console.log('  H → 300')
  }
  if (ic >= 8) {
    await numInputs.nth(7).click()
    await numInputs.nth(7).fill('0.5')
    await numInputs.nth(7).press('Enter')
    await page.waitForTimeout(200)
    console.log('  opacity → 0.5')
  }
  await snap(page, '状态 2 覆盖: Y↑ 尺寸↑ 透明度↓')

  // ── 5. Patch: Touch 节点 ──
  const touchBtn = page.locator('.patch-toolbar button', { hasText: 'Touch' })
  if (await touchBtn.count() > 0) {
    await touchBtn.click()
    await page.waitForTimeout(500)
    console.log('  Touch 节点已添加')
  }
  await snap(page, 'Touch 节点')

  // ── 6. Patch: To 节点 ──
  const toBtn = page.locator('.patch-toolbar button', { hasText: /^To$/ })
  if (await toBtn.count() > 0) {
    await toBtn.click()
    await page.waitForTimeout(500)
    console.log('  To 节点已添加')
  }
  await snap(page, 'To 节点')

  // ── 7. 配置 To 节点 ──
  const toNode = page.locator('.patch-node').last()
  const cfgSels = toNode.locator('.cfg-select')
  const sc = await cfgSels.count()
  console.log(`  To 配置下拉: ${sc}`)
  if (sc >= 1) {
    await cfgSels.nth(0).selectOption({ index: 1 })
    await page.waitForTimeout(300)
    console.log('  图层 → 椭圆 1')
  }
  if (sc >= 2) {
    await cfgSels.nth(1).selectOption({ index: 1 })
    await page.waitForTimeout(300)
    console.log('  状态 → 状态 2')
  }
  await snap(page, 'To 配置: 椭圆1 → 状态2')

  // ── 8. 连线 Touch.Tap → To.trigger ──
  const touchNode = page.locator('.patch-node').first()
  const tapPort = touchNode.locator('.port-dot.port-out').last()
  const trigPort = toNode.locator('.port-dot.port-in').first()

  if (await tapPort.count() > 0 && await trigPort.count() > 0) {
    const tb = await tapPort.boundingBox()
    const rb = await trigPort.boundingBox()
    if (tb && rb) {
      const sx = tb.x + tb.width / 2
      const sy = tb.y + tb.height / 2
      const ex = rb.x + rb.width / 2
      const ey = rb.y + rb.height / 2
      console.log(`  拖线: (${sx|0},${sy|0}) → (${ex|0},${ey|0})`)
      await page.mouse.move(sx, sy)
      await page.waitForTimeout(100)
      await page.mouse.down()
      await page.waitForTimeout(80)
      await page.mouse.move(ex, ey, { steps: 15 })
      await page.waitForTimeout(80)
      await page.mouse.up()
      await page.waitForTimeout(500)
      console.log('  连线完成')
    }
  }
  await snap(page, 'Touch.Tap → To 连线')

  // ── 9. 曲线面板 (curves) ──
  const rp = page.locator('.panel-right')
  if (await rp.count() > 0) {
    await rp.evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(500)
  }
  await snap(page, '曲线面板 (弹簧参数)')

  // ── 10. Preview 验证 ──
  const preview = page.locator('.preview-panel')
  if (await preview.count() > 0) {
    const pb = await preview.boundingBox()
    if (pb) {
      for (let i = 0; i < 6; i++) {
        await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2)
        await page.waitForTimeout(1200)
      }
      await snap(page, 'Preview 动画验证')
    }
  }

  // ── 11. 保存 ──
  const data = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (data) {
    fs.writeFileSync(path.join(DIR, 'design.intera'), data)
    console.log('✅ design.intera 已保存')
  }

  await snap(page, '最终状态')
  await browser.close()
  console.log(`\n✅ 旅程完成 — ${step} 步`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
