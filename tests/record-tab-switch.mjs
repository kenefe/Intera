/**
 * Tab 切换交互动效 — 全屏录制完整制作过程
 * 一镜到底：画图层 → 加状态 → 搭 Patch 连线 → Preview 点击演示
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JOURNEY_DIR = path.resolve(__dirname, '../docs/journeys/20260215_2149-tab-switch')
const FRAMES_DIR = path.join(JOURNEY_DIR, 'frames')
const OUT = path.join(JOURNEY_DIR, 'tab-switch-demo.mp4')

fs.mkdirSync(FRAMES_DIR, { recursive: true })
for (const f of fs.readdirSync(FRAMES_DIR)) fs.unlinkSync(path.join(FRAMES_DIR, f))

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  let frame = 0
  const snap = async (count = 1, delayMs = 33) => {
    for (let i = 0; i < count; i++) {
      await page.screenshot({ path: path.join(FRAMES_DIR, `frame-${String(frame++).padStart(4, '0')}.png`) })
      if (i < count - 1) await page.waitForTimeout(delayMs)
    }
  }

  // 慢拖动 helper（截帧记录拖拽过程）
  const slowDrag = async (x1, y1, x2, y2, steps = 15) => {
    await page.mouse.move(x1, y1)
    await page.waitForTimeout(50)
    await page.mouse.down()
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      await page.mouse.move(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
      await snap()
    }
    await page.mouse.up()
    await page.waitForTimeout(200)
  }

  // ═══════════════════════════════════
  //  第一幕：空白画布 (0.5s)
  // ═══════════════════════════════════
  console.log('第一幕：空白画布')
  await snap(15)

  // ═══════════════════════════════════
  //  第二幕：画背景条
  // ═══════════════════════════════════
  console.log('第二幕：画背景条')
  await page.keyboard.press('r')
  await page.waitForTimeout(300)
  await snap(5)
  await slowDrag(410, 240, 710, 284, 20)
  await snap(10)

  // 改圆角和颜色
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const ids = Object.keys(store.project.layers)
    if (ids[0]) store.updateLayerProps(ids[0], { borderRadius: 12, fill: '#2a2a3e' })
  })
  await page.waitForTimeout(300)
  await snap(10)

  // ═══════════════════════════════════
  //  第三幕：画指示条滑块
  // ═══════════════════════════════════
  console.log('第三幕：画指示条')
  await page.keyboard.press('r')
  await page.waitForTimeout(300)
  await slowDrag(414, 244, 510, 280, 12)

  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const ids = Object.keys(store.project.layers)
    if (ids[1]) store.updateLayerProps(ids[1], { borderRadius: 8, fill: '#5b5bf0' })
  })
  await page.waitForTimeout(300)
  await snap(10)

  // ═══════════════════════════════════
  //  第四幕：画三个 Tab 文本
  // ═══════════════════════════════════
  console.log('第四幕：画 Tab 文本')
  const tabs = [
    { text: 'Home', x: 462 },
    { text: 'Search', x: 562 },
    { text: 'Profile', x: 662 },
  ]
  for (const tab of tabs) {
    await page.keyboard.press('t')
    await page.waitForTimeout(300)
    await page.mouse.click(tab.x, 262)
    await page.waitForTimeout(400)
    await page.keyboard.type(tab.text, { delay: 80 })
    await snap(5)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await snap(3)
  }

  // 设置文本样式
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const ids = Object.keys(store.project.layers)
    for (let i = 2; i < Math.min(5, ids.length); i++) {
      store.updateLayerProps(ids[i], { fill: '#ffffff', opacity: i === 2 ? 1 : 0.5 })
    }
  })
  await page.waitForTimeout(300)
  await snap(15) // 展示完成的 Tab 设计

  // ═══════════════════════════════════
  //  第五幕：添加状态（点击状态栏 + 按钮）
  // ═══════════════════════════════════
  console.log('第五幕：添加状态')

  // 点击状态栏的 + 按钮
  const addBtn = page.locator('.state-bar .add-state-btn, .states-bar button, [class*="state"] button[title*="添加"], [class*="state"] button[title*="add"]').first()
  try {
    await addBtn.click({ timeout: 2000 })
    await page.waitForTimeout(500)
    await snap(8)
    // 再加一个状态
    await addBtn.click({ timeout: 2000 })
    await page.waitForTimeout(500)
    await snap(8)
  } catch {
    console.log('  状态栏按钮未找到，用 eval')
  }

  // 用 eval 确保 3 个状态 + overrides
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const sg = store.project.stateGroups[0]
    if (!sg) return
    const ids = Object.keys(store.project.layers)
    const indicatorId = ids[1]

    // 确保有 3 个状态
    while (sg.displayStates.length < 3) {
      const names = ['默认', 'Search', 'Profile']
      const stateIds = ['default', 'search', 'profile']
      const idx = sg.displayStates.length
      sg.displayStates.push({
        id: stateIds[idx], name: names[idx],
        overrides: {},
        transition: { curve: { type: 'spring', response: 0.4, damping: 0.8 } },
      })
    }

    // 设置 Search 状态 overrides
    const searchState = sg.displayStates[1]
    if (searchState && indicatorId) {
      const baseX = store.project.layers[indicatorId].props.x
      searchState.overrides[indicatorId] = { x: baseX + 100 }
      if (ids[2]) searchState.overrides[ids[2]] = { opacity: 0.5 }
      if (ids[3]) searchState.overrides[ids[3]] = { opacity: 1 }
      if (ids[4]) searchState.overrides[ids[4]] = { opacity: 0.5 }
    }

    // 设置 Profile 状态 overrides
    const profileState = sg.displayStates[2]
    if (profileState && indicatorId) {
      const baseX = store.project.layers[indicatorId].props.x
      profileState.overrides[indicatorId] = { x: baseX + 200 }
      if (ids[2]) profileState.overrides[ids[2]] = { opacity: 0.5 }
      if (ids[3]) profileState.overrides[ids[3]] = { opacity: 0.5 }
      if (ids[4]) profileState.overrides[ids[4]] = { opacity: 1 }
    }
  })
  await page.waitForTimeout(500)
  await snap(15)

  // ═══════════════════════════════════
  //  第六幕：搭 Patch 连线
  // ═══════════════════════════════════
  console.log('第六幕：搭 Patch')

  // 点击 Patch 工具栏按钮添加节点
  // Touch 节点
  const touchBtn = page.locator('.patch-toolbar .node-btn[data-type="touch"]')
  await touchBtn.click()
  await page.waitForTimeout(400)
  await snap(8)

  // To 节点 x2
  const toBtn = page.locator('.patch-toolbar .node-btn[data-type="to"]')
  await toBtn.click()
  await page.waitForTimeout(300)
  await snap(5)
  await toBtn.click()
  await page.waitForTimeout(300)
  await snap(5)

  // 拖拽节点到合理位置（通过 eval 更精确）
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const patches = store.project.patches
    // Touch 在左边
    if (patches[0]) patches[0].position = { x: 40, y: 60 }
    // To1 在右上
    if (patches[1]) patches[1].position = { x: 300, y: 40 }
    // To2 在右下
    if (patches[2]) patches[2].position = { x: 300, y: 160 }
  })
  await page.waitForTimeout(300)
  await snap(10)

  // 配置 Touch 节点 → 绑定到背景条图层
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const patches = store.project.patches
    const layerIds = Object.keys(store.project.layers)
    // Touch → 背景条
    if (patches[0]) patches[0].config.layerId = layerIds[0]
    // To1 → Search 状态
    const sg = store.project.stateGroups[0]
    if (patches[1] && sg) {
      patches[1].config.stateId = sg.displayStates[1]?.id
      patches[1].config.groupId = sg.id
      patches[1].name = 'To Search'
    }
    // To2 → Profile 状态
    if (patches[2] && sg) {
      patches[2].config.stateId = sg.displayStates[2]?.id
      patches[2].config.groupId = sg.id
      patches[2].name = 'To Profile'
    }
  })
  await page.waitForTimeout(300)
  await snap(10)

  // 连线：从 Touch 输出端口拖到 To 输入端口
  // 先获取端口位置
  const portPositions = await page.evaluate(() => {
    const canvas = document.querySelector('.patch-canvas')
    if (!canvas) return null
    const cr = canvas.getBoundingClientRect()
    const dots = canvas.querySelectorAll('.port-dot')
    const result = []
    for (const d of dots) {
      const r = d.getBoundingClientRect()
      result.push({
        patchId: d.dataset.patchId,
        portId: d.dataset.portId,
        dir: d.dataset.portDir,
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
      })
    }
    return result
  })

  if (portPositions && portPositions.length > 0) {
    // 找 Touch 的 output 端口
    const touchOut = portPositions.find(p => p.dir === 'out' && portPositions.some(q => q.patchId === p.patchId && q.dir === 'in'))
      || portPositions.find(p => p.dir === 'out')
    // 找 To1 和 To2 的 input 端口
    const toInputs = portPositions.filter(p => p.dir === 'in' && p.patchId !== touchOut?.patchId)

    if (touchOut && toInputs.length >= 2) {
      console.log('  连线 Touch → To Search')
      await slowDrag(touchOut.x, touchOut.y, toInputs[0].x, toInputs[0].y, 15)
      await snap(8)

      console.log('  连线 Touch → To Profile')
      // 如果 Touch 有第二个 output
      const touchOuts = portPositions.filter(p => p.dir === 'out' && p.patchId === touchOut.patchId)
      const secondOut = touchOuts[1] || touchOuts[0]
      await slowDrag(secondOut.x, secondOut.y, toInputs[1].x, toInputs[1].y, 15)
      await snap(8)
    }
  }

  // 如果连线没成功，用 eval 补上
  await page.evaluate(() => {
    const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
    const patchStore = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('patch')
    const patches = store.project.patches
    if (store.project.connections.length === 0 && patches.length >= 3) {
      // Touch tap → To1 trigger
      const touchP = patches[0]
      const to1 = patches[1]
      const to2 = patches[2]
      const touchTapOut = touchP.outputs.find(o => o.name === 'tap' || o.name === 'Tap') || touchP.outputs[0]
      const to1In = to1.inputs[0]
      const to2In = to2.inputs[0]
      if (touchTapOut && to1In) {
        store.project.connections.push({
          id: 'conn_1', fromPatchId: touchP.id, fromPortId: touchTapOut.id,
          toPatchId: to1.id, toPortId: to1In.id,
        })
      }
      if (touchTapOut && to2In) {
        store.project.connections.push({
          id: 'conn_2', fromPatchId: touchP.id, fromPortId: touchTapOut.id,
          toPatchId: to2.id, toPortId: to2In.id,
        })
      }
    }
  })
  await page.waitForTimeout(500)
  await snap(15) // 展示完成的 Patch 图

  // ═══════════════════════════════════
  //  第七幕：Preview 动画演示
  // ═══════════════════════════════════
  console.log('第七幕：Preview 动画演示')

  // 点击 Preview 面板触发动画
  const previewFrame = page.locator('.preview-frame')
  const previewVisible = await previewFrame.isVisible().catch(() => false)

  const stateSequence = ['search', 'profile', 'default', 'search', 'default', 'profile', 'default']
  for (const stateId of stateSequence) {
    console.log(`  → ${stateId}`)

    // 先尝试点击 Preview 触发 auto-cycle
    if (previewVisible) {
      try { await previewFrame.click({ timeout: 500 }) } catch {}
    }

    // 用 eval 确保状态切换
    await page.evaluate((sid) => {
      const store = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('project')
      const sg = store?.project?.stateGroups?.[0]
      if (sg) store.transitionToState(sg.id, sid)
    }, stateId)

    // 捕捉弹簧动画帧 (~1s)
    for (let i = 0; i < 30; i++) {
      await snap()
      await page.waitForTimeout(33)
    }
    // 静止帧
    await snap(8)
  }

  // 结尾静止
  await snap(20)

  console.log(`共截 ${frame} 帧`)
  await browser.close()

  console.log('合成视频...')
  execSync(`ffmpeg -y -framerate 30 -i "${FRAMES_DIR}/frame-%04d.png" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -crf 18 "${OUT}"`, { stdio: 'inherit' })
  console.log('✅ 视频已保存:', OUT)
}

main().catch(e => { console.error(e); process.exit(1) })
