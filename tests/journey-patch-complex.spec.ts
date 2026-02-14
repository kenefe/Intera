import { test, expect, type Page, type Locator } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1940-patch-complex-modal/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('intera_project'))
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function canvasCenter(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

/** 从端口圆点中心拖线到目标端口圆点中心 */
async function wire(page: Page, fromDot: Locator, toDot: Locator) {
  const from = await fromDot.boundingBox()
  const to = await toDot.boundingBox()
  if (!from || !to) throw new Error('port dot not found')
  const fx = from.x + from.width / 2
  const fy = from.y + from.height / 2
  const tx = to.x + to.width / 2
  const ty = to.y + to.height / 2
  await page.mouse.move(fx, fy)
  await page.mouse.down()
  await page.mouse.move(tx, ty, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
}

async function triggerSave(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's', code: 'KeyS', ctrlKey: true, bubbles: true,
    }))
  })
  await page.waitForTimeout(200)
}

test('旅程: Patch复杂交互 — 模态弹窗', async ({ page }) => {
  await load(page)
  const { cx, cy } = await canvasCenter(page)
  await page.screenshot({ path: `${SHOTS}/step-01-clean.png` })

  // ━━ Step 02: 创建 "按钮" 矩形 ━━
  await page.keyboard.press('r')
  await page.mouse.move(cx - 40, cy + 60)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 100, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)

  // 重命名为 "按钮"
  const btn = page.locator('.layer-item .layer-name').first()
  await btn.dblclick()
  await page.waitForTimeout(100)
  const input = page.locator('.layer-name-input')
  if (await input.count() > 0) {
    await input.fill('按钮')
    await input.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02-button.png` })

  // ━━ Step 03: 创建 "弹窗" 矩形 ━━
  await page.keyboard.press('r')
  await page.mouse.move(cx - 80, cy - 80)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 40, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)

  // 重命名
  const modal = page.locator('.layer-item .layer-name').first()
  await modal.dblclick()
  await page.waitForTimeout(100)
  const input2 = page.locator('.layer-name-input')
  if (await input2.count() > 0) {
    await input2.fill('弹窗')
    await input2.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03-modal.png` })

  // ━━ Step 04: 添加 "展开" 状态 ━━
  await page.locator('.add-btn').click()
  await page.waitForTimeout(300)

  // 切换到展开状态，修改弹窗属性 (放大/移动)
  await page.locator('.state-tab').last().click()
  await page.waitForTimeout(200)

  // 选中弹窗，修改缩放
  const modalLayer = page.locator('.layer-item .layer-name', { hasText: '弹窗' })
  await modalLayer.click()
  await page.waitForTimeout(200)

  // 修改透明度为 1 (展开状态可见)
  const opacityInput = page.locator('.prop-field:has(span.label:text("透明度"))').locator('input')
  if (await opacityInput.count() > 0) {
    await opacityInput.fill('1')
    await opacityInput.press('Enter')
  }

  // 修改缩放
  const scaleInput = page.locator('.prop-field:has(span.label:text("缩放X"))').locator('input')
  if (await scaleInput.count() > 0) {
    await scaleInput.fill('1.2')
    await scaleInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04-states.png` })

  // 切回默认
  await page.locator('.state-tab', { hasText: '默认' }).click()
  await page.waitForTimeout(200)

  // ━━ Step 05: Patch 区域 — 添加 Touch 节点 (按钮) ━━
  const touchBtn = page.locator('.node-btn', { hasText: 'Touch' })
  await touchBtn.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-05-touch1.png` })

  // 配置 Touch 节点绑定到"按钮"图层
  const touchSelect = page.locator('.patch-node').first().locator('.cfg-select')
  if (await touchSelect.count() > 0) {
    // 选择"按钮"
    const options = await touchSelect.locator('option').allTextContents()
    const btnOption = options.find(o => o.includes('按钮'))
    if (btnOption) {
      await touchSelect.selectOption({ label: btnOption })
    }
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-05b-touch-config.png` })

  // ━━ Step 06: 添加 To 节点 (切换到展开) ━━
  const toBtn = page.locator('.node-btn[data-type="to"]')
  await toBtn.click()
  await page.waitForTimeout(300)

  // 配置 To 节点 → 选择 "状态 2"
  const toNode = page.locator('.patch-node').nth(1)
  const toSelect = toNode.locator('.cfg-select')
  if (await toSelect.count() > 0) {
    const opts = await toSelect.locator('option').allTextContents()
    const state2 = opts.find(o => o.includes('状态'))
    if (state2) {
      await toSelect.selectOption({ label: state2 })
    }
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-06-to-node.png` })

  // ━━ Step 07: 连线 Touch.tap → To.in ━━
  const touchNode = page.locator('.patch-node').first()
  const tapPort = touchNode.locator('.port-dot[data-port-id="tap"]')
  const toInPort = toNode.locator('.port-dot[data-port-id="in"]')

  if (await tapPort.count() > 0 && await toInPort.count() > 0) {
    await wire(page, tapPort, toInPort)
  }
  await page.screenshot({ path: `${SHOTS}/step-07-wired.png` })

  // ━━ Step 08: 添加第二个 Touch 节点 (弹窗 → 关闭) ━━
  await touchBtn.click()
  await page.waitForTimeout(300)

  // 配置绑定到"弹窗"图层
  const touch2 = page.locator('.patch-node').nth(2)
  const touch2Select = touch2.locator('.cfg-select')
  if (await touch2Select.count() > 0) {
    const opts = await touch2Select.locator('option').allTextContents()
    const modalOpt = opts.find(o => o.includes('弹窗'))
    if (modalOpt) {
      await touch2Select.selectOption({ label: modalOpt })
    }
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-08-touch2.png` })

  // ━━ Step 09: 添加 Delay 节点 ━━
  const delayBtn = page.locator('.node-btn', { hasText: 'Delay' })
  await delayBtn.click()
  await page.waitForTimeout(300)

  // 设置延迟 300ms
  const delayNode = page.locator('.patch-node').nth(3)
  const delayInput = delayNode.locator('.cfg-input')
  if (await delayInput.count() > 0) {
    await delayInput.fill('300')
    await delayInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-09-delay.png` })

  // ━━ Step 10: 添加第二个 To 节点 (切回默认) ━━
  await toBtn.click()
  await page.waitForTimeout(300)

  // 配置 → 选择 "默认" 状态
  const to2Node = page.locator('.patch-node').nth(4)
  const to2Select = to2Node.locator('.cfg-select')
  if (await to2Select.count() > 0) {
    const opts = await to2Select.locator('option').allTextContents()
    const defaultOpt = opts.find(o => o.includes('默认'))
    if (defaultOpt) {
      await to2Select.selectOption({ label: defaultOpt })
    }
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-10-to2.png` })

  // ━━ Step 11: 连线 Touch2.tap → Delay.in ━━
  const tap2Port = touch2.locator('.port-dot[data-port-id="tap"]')
  const delayInPort = delayNode.locator('.port-dot[data-port-id="in"]')
  if (await tap2Port.count() > 0 && await delayInPort.count() > 0) {
    await wire(page, tap2Port, delayInPort)
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-11-wire2.png` })

  // ━━ Step 12: 连线 Delay.out → To2.in ━━
  const delayOutPort = delayNode.locator('.port-dot[data-port-id="out"]')
  const to2InPort = to2Node.locator('.port-dot[data-port-id="in"]')
  if (await delayOutPort.count() > 0 && await to2InPort.count() > 0) {
    await wire(page, delayOutPort, to2InPort)
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-12-wire3.png` })

  // ━━ Step 13: 验证连线数量 ━━
  const connections = await page.locator('.connection-layer path.connection').count()
  expect(connections).toBeGreaterThanOrEqual(2) // 至少 2 条连线

  // ━━ Step 14: 最终全景截图 ━━
  await page.screenshot({ path: `${SHOTS}/step-14-final.png` })

  // ━━ 保存设计文件 ━━
  await triggerSave(page)
  const exportData = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (exportData) {
    fs.writeFileSync(`${SHOTS}/../design.intera`, exportData, 'utf-8')
  }
})
