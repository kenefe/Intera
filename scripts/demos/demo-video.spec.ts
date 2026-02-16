/**
 * Intera 视频演示 — 录制完整交互过程
 */
import { chromium } from '@playwright/test'
import { test } from '@playwright/test'

test('录制 Toggle 弹簧动画视频', async () => {
  test.setTimeout(90000)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  // 画按钮
  await page.keyboard.press('r')
  await page.waitForTimeout(100)
  const box = await page.locator('.canvas-viewport').boundingBox()
  const cx = box!.x + box!.width / 2, cy = box!.y + box!.height / 2
  await page.mouse.move(cx - 70, cy - 25)
  await page.mouse.down()
  await page.mouse.move(cx + 70, cy + 25, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  // 填充蓝色 + 圆角
  const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  await colorInput.evaluate((el: HTMLInputElement) => { el.value = '#4a90d9'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  const radiusInput = page.locator('.prop-field', { hasText: '圆角' }).locator('.input').first()
  await radiusInput.fill('14')
  await radiusInput.press('Enter')
  await page.waitForTimeout(200)

  // 添加第二状态
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  // 按下态
  const fields = [['缩放X', '0.85'], ['缩放Y', '0.85'], ['透明度', '0.6'], ['圆角', '20']]
  for (const [label, val] of fields) {
    const inp = page.locator('.prop-field', { hasText: label }).locator('.input').first()
    if (await inp.count() > 0) { await inp.fill(val); await inp.press('Enter'); await page.waitForTimeout(80) }
  }

  // 曲线
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.5'); await params.nth(0).press('Enter')
    await params.nth(1).fill('0.65'); await params.nth(1).press('Enter')
  }
  await page.waitForTimeout(200)

  // Patch 节点
  for (const type of ['touch', 'toggleVariable', 'condition', 'to', 'to']) {
    await page.locator(`.patch-toolbar button[data-type="${type}"]`).click()
    await page.waitForTimeout(200)
  }

  const nodes = page.locator('.patch-node')

  // 配置 Touch 图层
  const touchSel = nodes.nth(0).locator('.cfg-select')
  const touchOpts = await touchSel.locator('option').allTextContents()
  const layerOpt = touchOpts.find((o: string) => o !== '选择…')
  if (layerOpt) await touchSel.selectOption({ label: layerOpt })

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

  // To(s2) 非默认状态
  const to1Sel = nodes.nth(3).locator('.cfg-select')
  const to1Opts = await to1Sel.locator('option').allTextContents()
  const s2 = to1Opts.find((o: string) => o !== '选择…' && o !== '默认')
  if (s2) await to1Sel.selectOption({ label: s2 })

  // To(s1) 默认状态
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
  await wire(2, 0, 3, 0) // True → To(s2)
  await wire(2, 1, 4, 0) // False → To(s1)

  // 切回默认状态
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)

  // 同步变量
  await page.evaluate(() => { const ps = (window as any).__patchStore; if (ps?.variables?.sync) ps.variables.sync() })
  await page.waitForTimeout(500)

  // ━━━ 录制交互 ━━━
  const pf = page.locator('.preview-frame')
  const pfBox = await pf.boundingBox()
  if (pfBox) {
    // 点击 6 次，展示 toggle 弹簧效果
    for (let i = 0; i < 6; i++) {
      await page.mouse.click(pfBox.x + pfBox.width / 2, pfBox.y + pfBox.height / 2)
      await page.waitForTimeout(1500) // 等弹簧动画完成
    }
  }

  await page.waitForTimeout(1000)

  // 保存视频
  const videoPath = await page.video()?.path()
  await ctx.close()
  await browser.close()

  if (videoPath) {
    const fs = await import('fs')
    const dest = '/tmp/intera-demos/toggle-spring-demo.webm'
    fs.copyFileSync(videoPath, dest)
    console.log(`📹 视频: ${dest}`)
  }
})
