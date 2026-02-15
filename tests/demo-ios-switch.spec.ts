/**
 * Demo: iOS 开关 + Tab 切换
 */
import { chromium } from '@playwright/test'
import { test } from '@playwright/test'

async function drawRect(page: any, x1: number, y1: number, x2: number, y2: number) {
  await page.keyboard.press('r')
  await page.waitForTimeout(100)
  const box = await page.locator('.canvas-viewport').boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx + x1, cy + y1)
  await page.mouse.down()
  await page.mouse.move(cx + x2, cy + y2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

async function setColor(page: any, color: string) {
  const inp = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  await inp.evaluate((el: HTMLInputElement, c: string) => {
    el.value = c; el.dispatchEvent(new Event('input', { bubbles: true }))
  }, color)
  await page.waitForTimeout(80)
}

async function setProp(page: any, label: string, value: string) {
  const inp = page.locator('.prop-field', { hasText: label }).locator('.input').first()
  if (await inp.count() > 0) { await inp.fill(value); await inp.press('Enter'); await page.waitForTimeout(80) }
}

async function clickPreview(page: any) {
  const pf = page.locator('.preview-frame')
  const box = await pf.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(1500)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Demo A: iOS Toggle Switch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('iOS 开关', async () => {
  test.setTimeout(90000)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  // 1. 画开关轨道（圆角矩形）
  await drawRect(page, -26, -16, 26, 16)
  await setColor(page, '#e0e0e0')
  await setProp(page, '圆角', '16')

  // 2. 画开关圆球
  await drawRect(page, -24, -13, -2, 13)
  await setColor(page, '#ffffff')
  await setProp(page, '圆角', '13')

  await page.screenshot({ path: '/tmp/intera-demos/switch-01-off.png' })

  // 3. 添加第二状态（ON 态）
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  // 4. 选中轨道（图层列表第二个，先画的在下面），改颜色为绿色
  const layers = page.locator('.layer-item')
  await layers.nth(1).click()
  await page.waitForTimeout(200)
  await setColor(page, '#34c759')

  // 5. 选中圆球（图层列表第一个），右移
  await layers.nth(0).click()
  await page.waitForTimeout(200)
  // 圆球需要从左侧移到右侧，X 增加约 22px
  const xInput = page.locator('.prop-field', { hasText: 'X' }).locator('.input').first()
  if (await xInput.count() > 0) {
    const currentX = await xInput.inputValue()
    const newX = parseFloat(currentX) + 22
    await xInput.fill(String(newX))
    await xInput.press('Enter')
    await page.waitForTimeout(80)
  }

  await page.screenshot({ path: '/tmp/intera-demos/switch-02-on.png' })

  // 6. 曲线 — iOS 风格弹簧（快速响应，适度阻尼）
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.6')
    await params.nth(0).press('Enter')
    await params.nth(1).fill('0.8')
    await params.nth(1).press('Enter')
  }

  // 7. Patch: Touch → Toggle → Condition → To(ON) / To(OFF)
  for (const type of ['touch', 'toggleVariable', 'condition', 'to', 'to']) {
    await page.locator(`.patch-toolbar button[data-type="${type}"]`).click()
    await page.waitForTimeout(200)
  }

  const nodes = page.locator('.patch-node')

  // Touch 图层 — 选轨道（更大的点击区域）
  const touchSel = nodes.nth(0).locator('.cfg-select')
  const touchOpts = await touchSel.locator('option').allTextContents()
  // 选第二个图层（轨道）
  const trackOpt = touchOpts.filter((o: string) => o !== '选择…')
  if (trackOpt.length >= 2) await touchSel.selectOption({ label: trackOpt[1] })
  else if (trackOpt.length >= 1) await touchSel.selectOption({ label: trackOpt[0] })

  // Toggle 创建+选择变量
  const toggleAdd = nodes.nth(1).locator('.cfg-add')
  if (await toggleAdd.count() > 0) { await toggleAdd.click(); await page.waitForTimeout(200) }
  const toggleSel = nodes.nth(1).locator('.cfg-select')
  const toggleOpts = await toggleSel.locator('option').allTextContents()
  const varOpt = toggleOpts.find((o: string) => o !== '选择…')
  if (varOpt) await toggleSel.selectOption({ label: varOpt })

  // Condition 变量
  const condSel = nodes.nth(2).locator('.cfg-select').first()
  const condOpts = await condSel.locator('option').allTextContents()
  const condVar = condOpts.find((o: string) => o !== '选择…')
  if (condVar) await condSel.selectOption({ label: condVar })

  // To(ON) — 非默认状态
  const to1Sel = nodes.nth(3).locator('.cfg-select')
  const to1Opts = await to1Sel.locator('option').allTextContents()
  const s2 = to1Opts.find((o: string) => o !== '选择…' && o !== '默认')
  if (s2) await to1Sel.selectOption({ label: s2 })

  // To(OFF) — 默认状态
  const to2Sel = nodes.nth(4).locator('.cfg-select')
  await to2Sel.selectOption({ label: '默认' })

  // 连线
  async function wire(fn: number, fp: number, tn: number, tp: number) {
    const ob = await nodes.nth(fn).locator('.port-out').nth(fp).boundingBox()
    const ib = await nodes.nth(tn).locator('.port-in').nth(tp).boundingBox()
    if (ob && ib) {
      await page.mouse.move(ob.x + ob.width/2, ob.y + ob.height/2)
      await page.mouse.down()
      await page.mouse.move(ib.x + ib.width/2, ib.y + ib.height/2, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
  }
  await wire(0, 2, 1, 0) // Touch.Tap → Toggle
  await wire(1, 0, 2, 0) // Toggle → Condition
  await wire(2, 0, 3, 0) // True → To(ON)
  await wire(2, 1, 4, 0) // False → To(OFF)

  await page.screenshot({ path: '/tmp/intera-demos/switch-03-patch.png' })

  // 切回默认状态
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)

  // 同步变量
  await page.evaluate(() => { const ps = (window as any).__patchStore; if (ps?.variables?.sync) ps.variables.sync() })
  await page.waitForTimeout(300)

  // ━━━ 录制交互 ━━━
  for (let i = 0; i < 6; i++) {
    await clickPreview(page)
  }
  await page.waitForTimeout(500)

  await page.screenshot({ path: '/tmp/intera-demos/switch-04-final.png' })

  const videoPath = await page.video()?.path()
  await ctx.close()
  await browser.close()
  if (videoPath) {
    const fs = await import('fs')
    fs.copyFileSync(videoPath, '/tmp/intera-demos/ios-switch-demo.webm')
    console.log('📹 iOS 开关: /tmp/intera-demos/ios-switch-demo.webm')
  }
})
