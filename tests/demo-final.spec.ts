/**
 * Intera 交互动效演示 — 按钮弹簧 + Toggle 卡片
 */
import { test, expect } from '@playwright/test'

test.use({ actionTimeout: 5000 })

const SHOT = '/tmp/intera-demos'

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

async function setProp(page: any, label: string, value: string) {
  const input = page.locator('.prop-field', { hasText: label }).locator('.input').first()
  if (await input.count() > 0) { await input.fill(value); await input.press('Enter'); await page.waitForTimeout(80) }
}

async function clickPreview(page: any, times = 1) {
  const pf = page.locator('.preview-frame')
  const box = await pf.boundingBox()
  if (!box) return
  for (let i = 0; i < times; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(1200)
  }
}

// ━━━ Demo 1: 按钮弹簧 + Toggle 双向 ━━━

test('Demo: 按钮弹簧 Toggle', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/')
  await page.waitForTimeout(600)

  // 画按钮
  await drawRect(page, -70, -25, 70, 25)
  // 填充蓝色
  const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  await colorInput.evaluate((el: HTMLInputElement) => { el.value = '#4a90d9'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await setProp(page, '圆角', '14')
  await page.screenshot({ path: `${SHOT}/01-button-drawn.png` })

  // 添加第二状态（按下态）
  await page.locator('.add-btn').first().click()
  await page.waitForTimeout(300)
  await page.locator('.state-tab').nth(1).click()
  await page.waitForTimeout(200)

  // 按下态属性
  await setProp(page, '缩放X', '0.88')
  await setProp(page, '缩放Y', '0.88')
  await setProp(page, '透明度', '0.65')
  await setProp(page, '圆角', '18')
  await page.screenshot({ path: `${SHOT}/02-pressed-state.png` })

  // 调曲线 — 弹性
  const paramInputs = page.locator('.param-input')
  if (await paramInputs.count() >= 2) {
    await paramInputs.nth(0).fill('0.55')
    await paramInputs.nth(0).press('Enter')
    await paramInputs.nth(1).fill('0.7')
    await paramInputs.nth(1).press('Enter')
  }
  await page.screenshot({ path: `${SHOT}/03-curves.png` })

  // Patch: Touch → ToggleVariable → Condition → To(s2) / To(s1)
  await page.locator('.patch-toolbar button[data-type="touch"]').click()
  await page.waitForTimeout(200)
  await page.locator('.patch-toolbar button[data-type="toggleVariable"]').click()
  await page.waitForTimeout(200)
  await page.locator('.patch-toolbar button[data-type="condition"]').click()
  await page.waitForTimeout(200)
  await page.locator('.patch-toolbar button[data-type="to"]').click()
  await page.waitForTimeout(200)
  await page.locator('.patch-toolbar button[data-type="to"]').click()
  await page.waitForTimeout(200)

  // 配置 Touch 图层
  const nodes = page.locator('.patch-node')
  const touchLayerSelect = nodes.nth(0).locator('.cfg-select')
  if (await touchLayerSelect.count() > 0) {
    const opts = await touchLayerSelect.locator('option').allTextContents()
    const layerOpt = opts.find((o: string) => o !== '选择…')
    if (layerOpt) await touchLayerSelect.selectOption({ label: layerOpt })
  }

  // Toggle 创建变量
  const toggleAddBtn = nodes.nth(1).locator('.cfg-add')
  if (await toggleAddBtn.count() > 0) {
    await toggleAddBtn.click()
    await page.waitForTimeout(200)
  }
  // Toggle 选择变量
  const toggleVarSelect = nodes.nth(1).locator('.cfg-select')
  if (await toggleVarSelect.count() > 0) {
    const opts = await toggleVarSelect.locator('option').allTextContents()
    const varOpt = opts.find((o: string) => o !== '选择…')
    if (varOpt) await toggleVarSelect.selectOption({ label: varOpt })
  }

  // Condition 选择变量
  const condVarSelect = nodes.nth(2).locator('.cfg-select').first()
  if (await condVarSelect.count() > 0) {
    const opts = await condVarSelect.locator('option').allTextContents()
    const varOpt = opts.find((o: string) => o !== '选择…')
    if (varOpt) await condVarSelect.selectOption({ label: varOpt })
  }

  // To(s2) 选择非默认状态
  const to1Select = nodes.nth(3).locator('.cfg-select')
  if (await to1Select.count() > 0) {
    const opts = await to1Select.locator('option').allTextContents()
    const s2 = opts.find((o: string) => o !== '选择…' && o !== '默认')
    if (s2) await to1Select.selectOption({ label: s2 })
  }

  // To(s1) 选择默认状态
  const to2Select = nodes.nth(4).locator('.cfg-select')
  if (await to2Select.count() > 0) {
    await to2Select.selectOption({ label: '默认' })
  }

  await page.screenshot({ path: `${SHOT}/04-patch-nodes.png` })

  // 连线
  async function connectPorts(fromN: number, fromP: number, toN: number, toP: number) {
    const outPort = nodes.nth(fromN).locator('.port-out').nth(fromP)
    const inPort = nodes.nth(toN).locator('.port-in').nth(toP)
    const ob = await outPort.boundingBox()
    const ib = await inPort.boundingBox()
    if (ob && ib) {
      await page.mouse.move(ob.x + ob.width/2, ob.y + ob.height/2)
      await page.mouse.down()
      await page.mouse.move(ib.x + ib.width/2, ib.y + ib.height/2, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
  }

  await connectPorts(0, 2, 1, 0) // Touch.Tap → Toggle.In
  await connectPorts(1, 0, 2, 0) // Toggle.Out → Condition.In
  await connectPorts(2, 0, 3, 0) // Condition.True → To(s2).In
  await connectPorts(2, 1, 4, 0) // Condition.False → To(s1).In

  await page.screenshot({ path: `${SHOT}/05-patch-wired.png` })

  // 切回默认状态
  await page.locator('.state-tab').first().click()
  await page.waitForTimeout(500)

  // 同步变量
  await page.evaluate(() => {
    const ps = (window as any).__patchStore
    if (ps?.variables?.sync) ps.variables.sync()
  })
  await page.waitForTimeout(300)

  await page.screenshot({ path: `${SHOT}/06-ready.png` })

  // 预览交互 — 点击 4 次看 toggle 效果
  for (let i = 0; i < 4; i++) {
    await clickPreview(page)
    await page.screenshot({ path: `${SHOT}/07-click-${i+1}.png` })
  }

  await page.screenshot({ path: `${SHOT}/08-final.png` })
  console.log('✅ Demo 完成，截图在 /tmp/intera-demos/')
})
