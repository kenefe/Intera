/**
 * iOS 开关 + Tab 切换 — 重点演示预览交互效果
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

async function addPatchNodes(page: any, types: string[]) {
  for (const t of types) {
    await page.locator(`.patch-toolbar button[data-type="${t}"]`).click()
    await page.waitForTimeout(200)
  }
}

async function wire(page: any, nodes: any, fn: number, fp: number, tn: number, tp: number) {
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

async function setupTogglePatch(page: any, layerLabel?: string) {
  await addPatchNodes(page, ['touch', 'toggleVariable', 'condition', 'to', 'to'])
  const nodes = page.locator('.patch-node')

  // Touch 图层
  const touchSel = nodes.nth(0).locator('.cfg-select')
  const touchOpts = await touchSel.locator('option').allTextContents()
  if (layerLabel) {
    const match = touchOpts.find((o: string) => o.includes(layerLabel))
    if (match) await touchSel.selectOption({ label: match })
  } else {
    const opt = touchOpts.find((o: string) => o !== '选择…')
    if (opt) await touchSel.selectOption({ label: opt })
  }

  // Toggle 创建+选择变量
  const toggleAdd = nodes.nth(1).locator('.cfg-add')
  if (await toggleAdd.count() > 0) { await toggleAdd.click(); await page.waitForTimeout(200) }
  const toggleSel = nodes.nth(1).locator('.cfg-select')
  const tOpts = await toggleSel.locator('option').allTextContents()
  const varOpt = tOpts.find((o: string) => o !== '选择…')
  if (varOpt) await toggleSel.selectOption({ label: varOpt })

  // Condition
  const condSel = nodes.nth(2).locator('.cfg-select').first()
  const cOpts = await condSel.locator('option').allTextContents()
  const cVar = cOpts.find((o: string) => o !== '选择…')
  if (cVar) await condSel.selectOption({ label: cVar })

  // To(s2)
  const to1 = nodes.nth(3).locator('.cfg-select')
  const t1Opts = await to1.locator('option').allTextContents()
  const s2 = t1Opts.find((o: string) => o !== '选择…' && o !== '默认')
  if (s2) await to1.selectOption({ label: s2 })

  // To(默认)
  await nodes.nth(4).locator('.cfg-select').selectOption({ label: '默认' })

  // 连线
  await wire(page, nodes, 0, 2, 1, 0)
  await wire(page, nodes, 1, 0, 2, 0)
  await wire(page, nodes, 2, 0, 3, 0)
  await wire(page, nodes, 2, 1, 4, 0)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  iOS 开关 — 重点演示预览
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('iOS 开关 — 预览演示', async () => {
  test.setTimeout(120000)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  // 搭建：轨道 + 圆球
  await drawRect(page, -26, -16, 26, 16)
  await setColor(page, '#e0e0e0')
  await setProp(page, '圆角', '16')

  await drawRect(page, -24, -13, -2, 13)
  await setColor(page, '#ffffff')
  await setProp(page, '圆角', '13')

  // 第二状态
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  // 轨道变绿
  await page.locator('.layer-item').nth(1).click()
  await page.waitForTimeout(200)
  await setColor(page, '#34c759')

  // 圆球右移
  await page.locator('.layer-item').nth(0).click()
  await page.waitForTimeout(200)
  const xInp = page.locator('.prop-field', { hasText: 'X' }).locator('.input').first()
  const curX = await xInp.inputValue()
  await xInp.fill(String(parseFloat(curX) + 22))
  await xInp.press('Enter')
  await page.waitForTimeout(80)

  // 曲线
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.6'); await params.nth(0).press('Enter')
    await params.nth(1).fill('0.78'); await params.nth(1).press('Enter')
  }

  // Patch
  await setupTogglePatch(page)

  // 切回默认
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)
  await page.evaluate(() => { const ps = (window as any).__patchStore; if (ps?.variables?.sync) ps.variables.sync() })
  await page.waitForTimeout(500)

  // ━━━ 重点：预览交互演示 ━━━
  const pf = page.locator('.preview-frame')
  const pfBox = await pf.boundingBox()
  if (pfBox) {
    const px = pfBox.x + pfBox.width / 2, py = pfBox.y + pfBox.height / 2

    // 慢节奏点击，让弹簧动画充分展示
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(2000) // 2 秒间隔，看完整弹簧回弹
    }

    // 快速连点，看快速切换效果
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(600)
    }
  }

  await page.waitForTimeout(1000)

  const vp = await page.video()?.path()
  await ctx.close(); await browser.close()
  if (vp) { const fs = await import('fs'); fs.copyFileSync(vp, '/tmp/intera-demos/switch-preview.webm'); console.log('📹 /tmp/intera-demos/switch-preview.webm') }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Tab 切换 — 重点演示预览
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Tab 切换 — 预览演示', async () => {
  test.setTimeout(120000)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 600 },
    recordVideo: { dir: '/tmp/intera-demos/video/', size: { width: 900, height: 600 } }
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5177')
  await page.waitForTimeout(1000)

  // 搭建：Tab 栏背景 + 指示器 + 内容区
  await drawRect(page, -100, -80, 100, -55)
  await setColor(page, '#f0f0f0')
  await setProp(page, '圆角', '4')

  await drawRect(page, -98, -78, -35, -57)
  await setColor(page, '#007aff')
  await setProp(page, '圆角', '3')
  await setProp(page, '透明度', '0.9')

  await drawRect(page, -90, -45, 90, 70)
  await setColor(page, '#ff6b6b')
  await setProp(page, '圆角', '8')

  // 第二状态：指示器右移 + 内容变色
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  const layers = page.locator('.layer-item')

  // 指示器右移
  await layers.nth(1).click()
  await page.waitForTimeout(200)
  const xInp = page.locator('.prop-field', { hasText: 'X' }).locator('.input').first()
  const curX = await xInp.inputValue()
  await xInp.fill(String(parseFloat(curX) + 65))
  await xInp.press('Enter')
  await page.waitForTimeout(80)

  // 内容区变色
  await layers.nth(0).click()
  await page.waitForTimeout(200)
  await setColor(page, '#4ecdc4')

  // 曲线
  const params = page.locator('.param-input')
  if (await params.count() >= 2) {
    await params.nth(0).fill('0.5'); await params.nth(0).press('Enter')
    await params.nth(1).fill('0.85'); await params.nth(1).press('Enter')
  }

  // Patch — Touch 绑定 Tab 栏背景（最后一个图层选项）
  await addPatchNodes(page, ['touch', 'toggleVariable', 'condition', 'to', 'to'])
  const nodes = page.locator('.patch-node')

  const touchSel = nodes.nth(0).locator('.cfg-select')
  const touchOpts = await touchSel.locator('option').allTextContents()
  const bgOpt = touchOpts.filter((o: string) => o !== '选择…')
  if (bgOpt.length > 0) await touchSel.selectOption({ label: bgOpt[bgOpt.length - 1] })

  const toggleAdd = nodes.nth(1).locator('.cfg-add')
  if (await toggleAdd.count() > 0) { await toggleAdd.click(); await page.waitForTimeout(200) }
  const toggleSel = nodes.nth(1).locator('.cfg-select')
  const tOpts = await toggleSel.locator('option').allTextContents()
  const varOpt = tOpts.find((o: string) => o !== '选择…')
  if (varOpt) await toggleSel.selectOption({ label: varOpt })

  const condSel = nodes.nth(2).locator('.cfg-select').first()
  const cOpts = await condSel.locator('option').allTextContents()
  const cVar = cOpts.find((o: string) => o !== '选择…')
  if (cVar) await condSel.selectOption({ label: cVar })

  const to1 = nodes.nth(3).locator('.cfg-select')
  const t1Opts = await to1.locator('option').allTextContents()
  const s2 = t1Opts.find((o: string) => o !== '选择…' && o !== '默认')
  if (s2) await to1.selectOption({ label: s2 })
  await nodes.nth(4).locator('.cfg-select').selectOption({ label: '默认' })

  await wire(page, nodes, 0, 2, 1, 0)
  await wire(page, nodes, 1, 0, 2, 0)
  await wire(page, nodes, 2, 0, 3, 0)
  await wire(page, nodes, 2, 1, 4, 0)

  // 切回默认
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)
  await page.evaluate(() => { const ps = (window as any).__patchStore; if (ps?.variables?.sync) ps.variables.sync() })
  await page.waitForTimeout(500)

  // ━━━ 重点：预览交互演示 ━━━
  const pf = page.locator('.preview-frame')
  const pfBox = await pf.boundingBox()
  if (pfBox) {
    const px = pfBox.x + pfBox.width / 2, py = pfBox.y + pfBox.height / 4

    // 慢节奏，看弹簧滑动
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(2000)
    }

    // 快速连点
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(px, py)
      await page.waitForTimeout(600)
    }
  }

  await page.waitForTimeout(1000)

  const vp = await page.video()?.path()
  await ctx.close(); await browser.close()
  if (vp) { const fs = await import('fs'); fs.copyFileSync(vp, '/tmp/intera-demos/tab-preview.webm'); console.log('📹 /tmp/intera-demos/tab-preview.webm') }
})
