/**
 * Flow E 录制脚本 — iOS Toggle Switch (states + curves)
 * 
 * 设计任务：
 * 1. 绘制 Toggle 背景（圆角矩形）
 * 2. 绘制滑块（椭圆）
 * 3. 添加第二个状态（开启态）
 * 4. 修改开启态属性（滑块位置 + 背景色）
 * 5. 调整弹簧曲线
 * 6. 创建 Patch 连线（Touch → Toggle → To）
 * 7. Preview 演示弹簧动效
 */

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const URL = 'http://localhost:5173/Intera/'
const DIR = 'docs/journeys/20260216_0930-states-curves-toggle'
const FRAMES_DIR = `${DIR}/frames`
mkdirSync(FRAMES_DIR, { recursive: true })

let frameNum = 0
async function snap(page, label) {
  frameNum++
  const name = `frame-${String(frameNum).padStart(4, '0')}.png`
  await page.screenshot({ path: `${FRAMES_DIR}/${name}` })
  console.log(`[${frameNum}] ${label}`)
}

// 多帧截图（用于动画段落）
async function snapN(page, n, delayMs, label) {
  for (let i = 0; i < n; i++) {
    await snap(page, `${label} (${i + 1}/${n})`)
    await page.waitForTimeout(delayMs)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  // ═══ 开场：空白画布 ═══
  await snapN(page, 15, 60, '开场 — 空白画布')

  // ═══ Step 1: 绘制 Toggle 背景 (Frame) ═══
  const canvas = await page.locator('.canvas-area').boundingBox()
  const cx = canvas.x + canvas.width / 2
  const cy = canvas.y + canvas.height / 2

  await page.keyboard.press('f')
  await page.waitForTimeout(200)
  await snap(page, '按 F 激活 Frame 工具')

  // 绘制 Frame 60x30 (Toggle 背景)
  const bgX = cx - 30, bgY = cy - 15
  await page.mouse.move(bgX, bgY)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(bgX + 6 * i, bgY + 3 * i, { steps: 1 })
    await snap(page, `绘制 Toggle 背景 ${i}/10`)
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
  await snapN(page, 10, 60, 'Toggle 背景完成')

  // 修改背景色为深灰 #3a3a3c
  const fillSwatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch')
  if (await fillSwatch.isVisible()) {
    await fillSwatch.click()
    await page.waitForTimeout(200)
    const hexInput = page.locator('.color-picker-popup input[type="text"]')
    if (await hexInput.isVisible()) {
      await hexInput.click()
      await hexInput.fill('#3a3a3c')
      await hexInput.press('Enter')
      await page.waitForTimeout(200)
    }
  }
  // 关闭弹窗 — 点击画布空白区域
  await page.mouse.click(cx, cy - 150)
  await page.waitForTimeout(300)
  await page.mouse.click(cx, cy - 150)
  await page.waitForTimeout(300)
  await snapN(page, 10, 60, '背景色改为深灰')

  // 重新选中 Frame 图层
  const layersAfterFill = page.locator('.layer-item')
  if (await layersAfterFill.count() > 0) {
    await layersAfterFill.last().click()
    await page.waitForTimeout(300)
  }

  // 修改圆角为 15 (全圆角)
  const cornerInput = page.locator('.prop-row', { hasText: '圆角' }).locator('input')
  if (await cornerInput.isVisible()) {
    await cornerInput.click({ force: true })
    await page.keyboard.press('Control+a')
    await page.keyboard.type('15')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
  }
  await snapN(page, 10, 60, '圆角设为 15')

  // ═══ Step 2: 绘制滑块 (椭圆) ═══
  await page.keyboard.press('o')
  await page.waitForTimeout(200)
  await snap(page, '按 O 激活椭圆工具')

  // 在 Toggle 左侧绘制圆形滑块 26x26
  const knobX = cx - 27, knobY = cy - 13
  await page.mouse.move(knobX, knobY)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(knobX + 2.6 * i, knobY + 2.6 * i, { steps: 1 })
    await snap(page, `绘制滑块 ${i}/10`)
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
  await snapN(page, 10, 60, '滑块绘制完成')

  // 修改滑块颜色为白色
  const fillSwatch2 = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch')
  if (await fillSwatch2.isVisible()) {
    await fillSwatch2.click()
    await page.waitForTimeout(200)
    const hexInput2 = page.locator('.color-picker-popup input[type="text"]')
    if (await hexInput2.isVisible()) {
      await hexInput2.click()
      await hexInput2.fill('#ffffff')
      await hexInput2.press('Enter')
      await page.waitForTimeout(200)
      await page.mouse.click(cx, cy - 100)
      await page.waitForTimeout(200)
    }
  }
  await snapN(page, 10, 60, '滑块改为白色')

  // ═══ Step 3: 添加第二个状态 ═══
  const addStateBtn = page.locator('.state-bar .add-state-btn, .state-bar button', { hasText: '+' }).first()
  if (await addStateBtn.isVisible()) {
    await addStateBtn.click()
    await page.waitForTimeout(300)
  }
  await snapN(page, 15, 60, '添加第二个状态')

  // 切换到第二个状态
  const state2 = page.locator('.state-tab').nth(1)
  if (await state2.isVisible()) {
    await state2.click()
    await page.waitForTimeout(300)
  }
  await snapN(page, 10, 60, '切换到状态 2')

  // ═══ Step 4: 修改状态 2 的属性 ═══
  // 选中滑块（点击图层面板第二个图层）
  const layers = page.locator('.layer-item')
  const layerCount = await layers.count()
  if (layerCount >= 2) {
    await layers.nth(0).click() // 椭圆通常在最上面
    await page.waitForTimeout(200)
  }
  await snap(page, '选中滑块图层')

  // 修改 X 坐标（滑块右移）
  const xInput = page.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xInput.isVisible()) {
    await xInput.click()
    await page.keyboard.press('Control+a')
    // 读取当前 X 值，加 30
    const currentX = await xInput.inputValue()
    const newX = Math.round(parseFloat(currentX) + 30)
    await page.keyboard.type(String(newX))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
  }
  await snapN(page, 10, 60, '滑块 X 右移 30px')

  // 选中背景 Frame，改颜色为绿色
  if (layerCount >= 2) {
    await layers.nth(layerCount - 1).click() // Frame 通常在最下面
    await page.waitForTimeout(200)
  }
  const fillSwatch3 = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch')
  if (await fillSwatch3.isVisible()) {
    await fillSwatch3.click()
    await page.waitForTimeout(200)
    const hexInput3 = page.locator('.color-picker-popup input[type="text"]')
    if (await hexInput3.isVisible()) {
      await hexInput3.click()
      await hexInput3.fill('#34c759')
      await hexInput3.press('Enter')
      await page.waitForTimeout(200)
      await page.mouse.click(cx, cy - 100)
      await page.waitForTimeout(200)
    }
  }
  await snapN(page, 15, 60, '背景改为 iOS 绿色')

  // ═══ Step 5: 创建 Patch 连线 ═══
  // 通过 evaluate 注入 Touch → Toggle → To 连线
  await page.evaluate(() => {
    const store = window.__pinia?.state?.value?.patch
    const projStore = window.__pinia?.state?.value?.project
    if (!store || !projStore) return

    // 获取 project store 实例
    const pinia = window.__pinia
    const patchStore = pinia._s.get('patch')
    const projectStore = pinia._s.get('project')
    if (!patchStore || !projectStore) return

    const layers = projectStore.project.layers
    const layerIds = projectStore.project.rootLayerIds
    const bgLayerId = layerIds[layerIds.length - 1] // Frame 背景

    // 添加变量
    patchStore.addVariable()
    const varId = patchStore.variables.defs[0]?.id

    // 添加 Touch 节点
    patchStore.addNode('touch', 100, 100)
    const touchNode = patchStore.nodes[patchStore.nodes.length - 1]
    if (touchNode) touchNode.config = { ...touchNode.config, layerId: bgLayerId }

    // 添加 Toggle 节点
    patchStore.addNode('toggle', 300, 100)
    const toggleNode = patchStore.nodes[patchStore.nodes.length - 1]
    if (toggleNode && varId) toggleNode.config = { ...toggleNode.config, variableId: varId }

    // 获取状态组和状态
    const groups = projectStore.project.stateGroups
    const group = groups[0]
    if (!group) return
    const states = group.displayStateIds
    const state1 = states[0]
    const state2 = states[1]

    // 添加 To 节点 (状态 2 - 开启)
    patchStore.addNode('to', 500, 60)
    const toNode1 = patchStore.nodes[patchStore.nodes.length - 1]
    if (toNode1) toNode1.config = { ...toNode1.config, groupId: group.id, stateId: state2 }

    // 添加 To 节点 (状态 1 - 关闭)
    patchStore.addNode('to', 500, 180)
    const toNode2 = patchStore.nodes[patchStore.nodes.length - 1]
    if (toNode2) toNode2.config = { ...toNode2.config, groupId: group.id, stateId: state1 }

    // 连线: Touch.up → Toggle.pulse
    if (touchNode && toggleNode) {
      patchStore.addConnection({
        fromNodeId: touchNode.id, fromPort: 'up',
        toNodeId: toggleNode.id, toPort: 'pulse'
      })
    }

    // 连线: Toggle.true → To(state2)
    if (toggleNode && toNode1) {
      patchStore.addConnection({
        fromNodeId: toggleNode.id, fromPort: 'true',
        toNodeId: toNode1.id, toPort: 'pulse'
      })
    }

    // 连线: Toggle.false → To(state1)
    if (toggleNode && toNode2) {
      patchStore.addConnection({
        fromNodeId: toggleNode.id, fromPort: 'false',
        toNodeId: toNode2.id, toPort: 'pulse'
      })
    }

    // 同步变量
    patchStore.variables.sync?.()
  })
  await page.waitForTimeout(500)
  await snapN(page, 15, 60, 'Patch 连线完成')

  // ═══ Step 6: Preview 演示 ═══
  // 切回状态 1
  const state1Tab = page.locator('.state-tab').first()
  if (await state1Tab.isVisible()) {
    await state1Tab.click()
    await page.waitForTimeout(300)
  }
  await snapN(page, 10, 60, '切回状态 1 准备预览')

  // 点击 Preview 面板触发状态切换（Level 0 自动循环）
  const preview = page.locator('.preview-panel, .panel-left .preview-container').first()
  if (await preview.isVisible()) {
    const previewBox = await preview.boundingBox()
    if (previewBox) {
      // 多次点击 Preview 触发 Toggle 切换，每次录制弹簧动画帧
      for (let click = 0; click < 6; click++) {
        await page.mouse.click(previewBox.x + previewBox.width / 2, previewBox.y + previewBox.height / 2)
        // 录制弹簧动画过程 (~800ms)
        await snapN(page, 20, 40, `Preview 点击 ${click + 1} — 弹簧动画`)
        await page.waitForTimeout(200)
      }
    }
  }

  // ═══ 结尾：停留展示 ═══
  await snapN(page, 20, 60, '结尾展示')

  console.log(`\n✅ 总帧数: ${frameNum}`)
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
