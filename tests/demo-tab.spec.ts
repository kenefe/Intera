/**
 * Demo: Tab 切换 — 3 个 tab，点击切换高亮指示器 + 内容区
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

test('Tab 切换', async () => {
  test.setTimeout(120000)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  // ━━━ 搭建 Tab 栏 ━━━

  // 1. Tab 栏背景
  await drawRect(page, -100, -80, 100, -55)
  await setColor(page, '#f0f0f0')
  await setProp(page, '圆角', '4')

  // 2. Tab 指示器（滑动高亮条）
  await drawRect(page, -98, -78, -35, -57)
  await setColor(page, '#007aff')
  await setProp(page, '圆角', '3')
  await setProp(page, '透明度', '0.9')

  // 3. 内容区 — 红色块（Tab 1 内容）
  await drawRect(page, -90, -45, 90, 70)
  await setColor(page, '#ff6b6b')
  await setProp(page, '圆角', '8')

  await page.screenshot({ path: '/tmp/intera-demos/tab-01-built.png' })

  // ━━━ 状态 2: Tab 2 选中 ━━━
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  const layers = page.locator('.layer-item')

  // 选中指示器（第二个图层），移到中间
  await layers.nth(1).click()
  await page.waitForTimeout(200)
  const xInp = page.locator('.prop-field', { hasText: 'X' }).locator('.input').first()
  if (await xInp.count() > 0) {
    const curX = await xInp.inputValue()
    const newX = parseFloat(curX) + 65
    await xInp.fill(String(newX))
    await xInp.press('Enter')
    await page.waitForTimeout(80)
  }

  // 选中内容区（第一个图层），换颜色为蓝色
  await layers.nth(0).click()
  await page.waitForTimeout(200)
  await setColor(page, '#4ecdc4')

  await page.screenshot({ path: '/tmp/intera-demos/tab-02-state2.png' })

  // ━━━ 状态 3: Tab 3 选中 ━━━
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(2).click()
  await page.waitForTimeout(200)

  // 指示器移到右侧
  await layers.nth(1).click()
  await page.waitForTimeout(200)
  const xInp2 = page.locator('.prop-field', { hasText: 'X' }).locator('.input').first()
  if (await xInp2.count() > 0) {
    const curX = await xInp2.inputValue()
    const newX = parseFloat(curX) + 65
    await xInp2.fill(String(newX))
    await xInp2.press('Enter')
    await page.waitForTimeout(80)
  }

  // 内容区换颜色为紫色
  await layers.nth(0).click()
  await page.waitForTimeout(200)
  await setColor(page, '#a55eea')

  await page.screenshot({ path: '/tmp/intera-demos/tab-03-state3.png' })

  // ━━━ 曲线 — iOS 风格 ━━━
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.55')
    await params.nth(0).press('Enter')
    await params.nth(1).fill('0.82')
    await params.nth(1).press('Enter')
  }

  // ━━━ Patch: 3 个 Touch 区域 → 3 个 To ━━━
  // 简化方案：用 Tab 栏背景作为 Touch 目标，每次点击切换到下一个状态
  // 实际上用 Toggle 循环 3 个状态

  // 方案：Touch → SetVariable(0/1/2) → To(对应状态)
  // 更简单：直接用 3 个 Touch+To 对，但 Intera 目前只有一个 Touch 节点能绑一个图层
  // 最简方案：Touch(Tab栏) → Toggle → Condition → To(s2) / To(s1)，再加一组切到 s3

  // 用最简单的 toggle 两态先演示
  for (const type of ['touch', 'toggleVariable', 'condition', 'to', 'to']) {
    await page.locator(`.patch-toolbar button[data-type="${type}"]`).click()
    await page.waitForTimeout(200)
  }

  const nodes = page.locator('.patch-node')

  // Touch 图层 — Tab 栏背景
  const touchSel = nodes.nth(0).locator('.cfg-select')
  const touchOpts = await touchSel.locator('option').allTextContents()
  const bgOpt = touchOpts.filter((o: string) => o !== '选择…')
  if (bgOpt.length > 0) await touchSel.selectOption({ label: bgOpt[bgOpt.length - 1] }) // 最后一个是最先画的（Tab栏背景）

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

  // To(s2)
  const to1Sel = nodes.nth(3).locator('.cfg-select')
  const to1Opts = await to1Sel.locator('option').allTextContents()
  const s2 = to1Opts.find((o: string) => o !== '选择…' && o !== '默认')
  if (s2) await to1Sel.selectOption({ label: s2 })

  // To(默认)
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
  await wire(0, 2, 1, 0)
  await wire(1, 0, 2, 0)
  await wire(2, 0, 3, 0)
  await wire(2, 1, 4, 0)

  await page.screenshot({ path: '/tmp/intera-demos/tab-04-patch.png' })

  // 切回默认状态
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)
  await page.evaluate(() => { const ps = (window as any).__patchStore; if (ps?.variables?.sync) ps.variables.sync() })
  await page.waitForTimeout(300)

  // ━━━ 录制交互 ━━━
  const pf = page.locator('.preview-frame')
  const pfBox = await pf.boundingBox()
  if (pfBox) {
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(pfBox.x + pfBox.width / 2, pfBox.y + pfBox.height / 4)
      await page.waitForTimeout(1500)
    }
  }

  await page.screenshot({ path: '/tmp/intera-demos/tab-05-final.png' })

  const videoPath = await page.video()?.path()
  await ctx.close()
  await browser.close()
  if (videoPath) {
    const fs = await import('fs')
    fs.copyFileSync(videoPath, '/tmp/intera-demos/tab-switch-demo.webm')
    console.log('📹 Tab 切换: /tmp/intera-demos/tab-switch-demo.webm')
  }
})
