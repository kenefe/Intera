/**
 * Intera 交互动效演示 — 3 个完整案例
 * 每个案例：搭建 → 配置 → 预览交互 → 录制视频
 */
import { test } from '@playwright/test'
import { chromium } from '@playwright/test'

const URL = 'http://localhost:5177'

// 工具函数
async function freshPage() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/intera-demos/', size: { width: 1280, height: 800 } }
  })
  const page = await ctx.newPage()
  await page.goto(URL)
  await page.waitForTimeout(800)
  return { browser, ctx, page }
}

async function drawRect(page: any, x1: number, y1: number, x2: number, y2: number) {
  await page.keyboard.press('r')
  await page.waitForTimeout(100)
  const canvas = page.locator('.canvas-viewport')
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width/2 + x1, box.y + box.height/2 + y1)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width/2 + x2, box.y + box.height/2 + y2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

async function addState(page: any) {
  await page.locator('.state-bar .add-btn, button:has-text("+")').first().click()
  await page.waitForTimeout(300)
}

async function switchState(page: any, idx: number) {
  await page.locator('.state-tab').nth(idx).click()
  await page.waitForTimeout(200)
}

async function setProp(page: any, label: string, value: string) {
  const input = page.locator('.prop-field', { hasText: label }).locator('.input').first()
  if (await input.count() > 0) {
    await input.fill(value)
    await input.press('Enter')
    await page.waitForTimeout(100)
  }
}

async function setColor(page: any, label: string, color: string) {
  const input = page.locator('.prop-row', { hasText: label }).locator('input[type="color"]')
  if (await input.count() > 0) {
    await input.evaluate((el: HTMLInputElement, c: string) => {
      el.value = c; el.dispatchEvent(new Event('input', { bubbles: true }))
    }, color)
    await page.waitForTimeout(100)
  }
}

async function addPatchNode(page: any, type: string) {
  await page.locator(`.patch-toolbar button[data-type="${type}"]`).click()
  await page.waitForTimeout(200)
}

async function connectPorts(page: any, fromNode: number, fromPort: number, toNode: number, toPort: number) {
  const nodes = page.locator('.patch-node')
  const outPort = nodes.nth(fromNode).locator('.port-out').nth(fromPort)
  const inPort = nodes.nth(toNode).locator('.port-in').nth(toPort)
  const outBox = await outPort.boundingBox()
  const inBox = await inPort.boundingBox()
  if (outBox && inBox) {
    await page.mouse.move(outBox.x + outBox.width/2, outBox.y + outBox.height/2)
    await page.mouse.down()
    await page.mouse.move(inBox.x + inBox.width/2, inBox.y + inBox.height/2, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
  }
}

async function configPatchSelect(page: any, nodeIdx: number, selectLabel: string, optionText: string) {
  const node = page.locator('.patch-node').nth(nodeIdx)
  const row = node.locator('.cfg-row', { hasText: selectLabel })
  const select = row.locator('.cfg-select')
  if (await select.count() > 0) {
    await select.selectOption({ label: optionText })
    await page.waitForTimeout(100)
  }
}

async function setCurveParams(page: any, response: string, damping: string) {
  const inputs = page.locator('.param-input')
  if (await inputs.count() >= 2) {
    await inputs.nth(0).fill(response)
    await inputs.nth(0).press('Enter')
    await page.waitForTimeout(50)
    await inputs.nth(1).fill(damping)
    await inputs.nth(1).press('Enter')
    await page.waitForTimeout(50)
  }
}

async function clickPreview(page: any) {
  const preview = page.locator('.preview-frame')
  if (await preview.count() > 0) {
    const box = await preview.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2)
      await page.waitForTimeout(1500)
    }
  }
}

async function saveVideo(ctx: any, page: any, name: string) {
  const path = await page.video()?.path()
  await ctx.close()
  if (path) {
    const fs = await import('fs')
    const dest = `/tmp/intera-demos/${name}.webm`
    fs.renameSync(path, dest)
    console.log(`📹 ${name}: ${dest}`)
    return dest
  }
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Demo 1: 按钮按下弹簧效果
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Demo 1: 按钮按下弹簧', async () => {
  const { browser, ctx, page } = await freshPage()

  // 画按钮背景
  await drawRect(page, -60, -20, 60, 20)
  await setColor(page, '填充', '#4a90d9')
  await setProp(page, '圆角', '12')

  // 添加第二状态（按下态）
  await addState(page)
  await switchState(page, 1)
  await setProp(page, '缩放X', '0.92')
  await setProp(page, '缩放Y', '0.92')
  await setProp(page, '透明度', '0.7')

  // 调整曲线 — 快速弹性
  await setCurveParams(page, '0.6', '0.75')

  // 配置 Patch: Touch → To(按下态)
  await addPatchNode(page, 'touch')
  await addPatchNode(page, 'to')

  // 配置 Touch 图层
  await configPatchSelect(page, 0, '图层', '矩形 1')
  // 配置 To 状态
  const stateSelect = page.locator('.patch-node').nth(1).locator('.cfg-select')
  if (await stateSelect.count() > 0) {
    // 选择第二个选项（非默认状态）
    const options = await stateSelect.locator('option').allTextContents()
    const nonDefault = options.find(o => o !== '选择…' && o !== '默认')
    if (nonDefault) await stateSelect.selectOption({ label: nonDefault })
  }

  // 连线: Touch.Tap → To.In
  await connectPorts(page, 0, 2, 1, 0) // Tap → In

  // 切回默认状态
  await switchState(page, 0)
  await page.waitForTimeout(500)

  // 录制预览交互
  await clickPreview(page)
  await page.waitForTimeout(500)
  await clickPreview(page)
  await page.waitForTimeout(500)
  await clickPreview(page)
  await page.waitForTimeout(1000)

  await saveVideo(ctx, page, 'demo1-button-spring')
  await browser.close()
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Demo 2: 卡片展开/收起（Toggle）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Demo 2: 卡片展开收起', async () => {
  const { browser, ctx, page } = await freshPage()

  // 画卡片
  await drawRect(page, -80, -30, 80, 30)
  await setColor(page, '填充', '#2d2d5e')
  await setProp(page, '圆角', '8')

  // 添加展开状态
  await addState(page)
  await switchState(page, 1)
  await setProp(page, 'H', '200')
  await setProp(page, '圆角', '16')

  // 柔和弹簧曲线
  await setCurveParams(page, '0.35', '0.9')

  // Patch: Touch → ToggleVariable → Condition → To(展开) / To(收起)
  await addPatchNode(page, 'touch')
  await addPatchNode(page, 'toggleVariable')
  await addPatchNode(page, 'condition')
  await addPatchNode(page, 'to')
  await addPatchNode(page, 'to')

  // 配置 Touch 图层
  await configPatchSelect(page, 0, '图层', '矩形 1')

  // 创建变量 (Toggle 节点自动创建)
  const toggleNode = page.locator('.patch-node').nth(1)
  const addVarBtn = toggleNode.locator('.cfg-add')
  if (await addVarBtn.count() > 0) {
    await addVarBtn.click()
    await page.waitForTimeout(200)
  }

  // 配置 Condition 变量
  const condNode = page.locator('.patch-node').nth(2)
  const condVarSelect = condNode.locator('.cfg-select').first()
  if (await condVarSelect.count() > 0) {
    const opts = await condVarSelect.locator('option').allTextContents()
    const varOpt = opts.find(o => o !== '选择…')
    if (varOpt) await condVarSelect.selectOption({ label: varOpt })
  }

  // 配置两个 To 节点的状态
  for (let i = 3; i <= 4; i++) {
    const toNode = page.locator('.patch-node').nth(i)
    const toSelect = toNode.locator('.cfg-select')
    if (await toSelect.count() > 0) {
      const opts = await toSelect.locator('option').allTextContents()
      const target = i === 3 ? opts.find(o => o !== '选择…' && o !== '默认') : '默认'
      if (target) await toSelect.selectOption({ label: target })
    }
  }

  // 连线
  await connectPorts(page, 0, 2, 1, 0) // Touch.Tap → Toggle.In
  await connectPorts(page, 1, 0, 2, 0) // Toggle.Out → Condition.In
  await connectPorts(page, 2, 0, 3, 0) // Condition.True → To(展开).In
  await connectPorts(page, 2, 1, 4, 0) // Condition.False → To(收起).In

  // 切回默认状态
  await switchState(page, 0)
  await page.waitForTimeout(500)

  // 录制 toggle 交互
  for (let i = 0; i < 4; i++) {
    await clickPreview(page)
    await page.waitForTimeout(800)
  }

  await saveVideo(ctx, page, 'demo2-card-toggle')
  await browser.close()
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Demo 3: 多元素编排动画
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Demo 3: 多元素编排', async () => {
  const { browser, ctx, page } = await freshPage()

  // 画 3 个矩形（模拟列表项）
  await drawRect(page, -80, -60, 80, -30)
  await setColor(page, '填充', '#e74c3c')
  await setProp(page, '圆角', '6')

  await drawRect(page, -80, -20, 80, 10)
  await setColor(page, '填充', '#3498db')
  await setProp(page, '圆角', '6')

  await drawRect(page, -80, 20, 80, 50)
  await setColor(page, '填充', '#2ecc71')
  await setProp(page, '圆角', '6')

  // 添加第二状态
  await addState(page)
  await switchState(page, 1)

  // 选中第一个图层，修改属性
  await page.locator('.layer-item').nth(2).click() // 最先画的在最下面
  await page.waitForTimeout(200)
  await setProp(page, 'X', '50')
  await setProp(page, '透明度', '0.6')

  // 选中第二个图层
  await page.locator('.layer-item').nth(1).click()
  await page.waitForTimeout(200)
  await setProp(page, 'X', '80')
  await setProp(page, '缩放X', '1.1')

  // 选中第三个图层
  await page.locator('.layer-item').nth(0).click()
  await page.waitForTimeout(200)
  await setProp(page, 'X', '110')
  await setProp(page, '旋转', '5')

  // 弹性曲线
  await setCurveParams(page, '0.4', '0.8')

  // 切回默认状态
  await switchState(page, 0)
  await page.waitForTimeout(500)

  // 录制 Level 0 自动循环动画
  await page.waitForTimeout(3000)

  // 手动切换状态看动画
  await switchState(page, 1)
  await page.waitForTimeout(1500)
  await switchState(page, 0)
  await page.waitForTimeout(1500)
  await switchState(page, 1)
  await page.waitForTimeout(1500)

  await saveVideo(ctx, page, 'demo3-multi-element')
  await browser.close()
})
