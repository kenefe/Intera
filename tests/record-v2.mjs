/**
 * Flow E v2 — 大尺寸 Toggle，动画更明显
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'http://localhost:5173/Intera/'
const DIR = 'docs/journeys/flow-e-v2/frames'
mkdirSync(DIR, { recursive: true })

let n = 0
const snap = async (p, label) => {
  n++
  await p.screenshot({ path: `${DIR}/f-${String(n).padStart(4,'0')}.png` })
  if (label) console.log(`[${n}] ${label}`)
}
const hold = async (p, count, label) => {
  for (let i = 0; i < count; i++) { await snap(p, i===0?label:null); await p.waitForTimeout(40) }
}

async function main() {
  const b = await chromium.launch({ headless: true })
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(URL, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)

  const cv = await p.locator('.canvas-area').boundingBox()
  const cx = cv.x + cv.width / 2, cy = cv.y + cv.height / 2

  await hold(p, 15, '开场')

  // 1. 大 Frame (200x100) — Toggle 背景
  await p.keyboard.press('f'); await p.waitForTimeout(200)
  await p.mouse.move(cx-100, cy-50); await p.mouse.down()
  for (let i=1;i<=20;i++) { await p.mouse.move(cx-100+10*i, cy-50+5*i); await snap(p) }
  await p.mouse.up(); await hold(p, 10, 'Frame')

  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const id = s.project.rootLayerIds[0]
    s.updateLayerProps(id, { fill: '#48484a', cornerRadius: 50, width: 200, height: 100 })
  })
  await hold(p, 15, '深灰圆角')

  // 2. 大椭圆 (80x80) — 滑块
  await p.keyboard.press('o'); await p.waitForTimeout(200)
  await p.mouse.move(cx-90, cy-40); await p.mouse.down()
  for (let i=1;i<=15;i++) { await p.mouse.move(cx-90+5.33*i, cy-40+5.33*i); await snap(p) }
  await p.mouse.up(); await hold(p, 10, '椭圆')

  // 获取实际 layer ids
  const ids = await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    return s.project.rootLayerIds
  })
  console.log('layers:', ids)

  // 设置滑块属性 — 白色，居中对齐
  await p.evaluate((knobId) => {
    const s = window.__pinia._s.get('project')
    const bgId = s.project.rootLayerIds.find(id => id !== knobId) || s.project.rootLayerIds[0]
    const bg = s.project.layers[bgId]
    // 滑块放在左侧
    s.updateLayerProps(knobId, {
      fill: '#ffffff',
      width: 84,
      height: 84,
      x: (bg?.x ?? 0) + 8,
      y: (bg?.y ?? 0) + 8,
      cornerRadius: 42
    })
  }, ids[0])
  await hold(p, 20, '白色滑块 — Toggle OFF')

  await p.keyboard.press('Escape')
  await hold(p, 25, '展示 Toggle OFF')

  // 3. 添加状态 2
  const stateResult = await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    const ns = s.addDisplayState(g.id, 'ON')
    return { stateId: ns?.id, groupId: g.id }
  })
  await hold(p, 12, '添加状态 ON')

  // 切到状态 2
  const tabs = p.locator('.state-tab')
  if (await tabs.count() >= 2) {
    await tabs.nth(1).click()
    await hold(p, 12, '切到 ON')
  }

  // 4. 设置 ON 态 override — 滑块右移 + 背景变绿
  await p.evaluate(({ stateId }) => {
    const s = window.__pinia._s.get('project')
    const ids = s.project.rootLayerIds
    // 找 Frame 和 Ellipse
    let bgId, knobId
    for (const id of ids) {
      if (s.project.layers[id].type === 'frame') bgId = id
      else knobId = id
    }
    if (!bgId || !knobId) { bgId = ids[1] || ids[0]; knobId = ids[0] }

    const bg = s.project.layers[bgId]
    const knob = s.project.layers[knobId]

    // 滑块右移到右侧
    s.setOverride(stateId, knobId, { x: (bg?.x ?? 0) + (bg?.width ?? 200) - (knob?.width ?? 84) - 8 })
    // 背景变绿
    s.setOverride(stateId, bgId, { fill: '#34c759' })
  }, stateResult)
  await hold(p, 25, 'ON 态 — 绿色')

  // 5. 切回 OFF
  await tabs.first().click()
  await hold(p, 20, '切回 OFF')

  // 6. Preview 动画
  const groupId = stateResult.groupId
  const allStates = await p.evaluate((gid) => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups.find(g => g.id === gid)
    return g.displayStates.map(st => st.id)
  }, groupId)
  console.log('states:', allStates)

  for (let i = 0; i < 10; i++) {
    const target = allStates[i % 2 === 0 ? 1 : 0]
    await p.evaluate(({ gid, sid }) => {
      window.__pinia._s.get('project').transitionToState(gid, sid)
    }, { gid: groupId, sid: target })

    // 捕捉弹簧动画 ~1.2s @30fps
    for (let f = 0; f < 36; f++) {
      await snap(p, f === 0 ? `动画 ${i+1}/10 → ${target === allStates[1] ? 'ON' : 'OFF'}` : null)
      await p.waitForTimeout(33)
    }
  }

  await hold(p, 20, '结尾')
  console.log(`✅ ${n} frames`)
  await b.close()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
