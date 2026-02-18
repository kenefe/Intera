/**
 * Flow E — headless + store 驱动动画
 * Preview 动画通过 transitionToState 触发，不依赖 DOM 点击
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'http://localhost:5173/Intera/'
const DIR = 'docs/journeys/flow-e-final/frames'
mkdirSync(DIR, { recursive: true })

let n = 0
const snap = async (p, label) => {
  n++
  await p.screenshot({ path: `${DIR}/f-${String(n).padStart(4,'0')}.png` })
  if (label) console.log(`[${n}] ${label}`)
}
const hold = async (p, count, label) => {
  for (let i = 0; i < count; i++) { await snap(p, i === 0 ? label : null); await p.waitForTimeout(40) }
}

async function main() {
  const b = await chromium.launch({ headless: true })
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(URL, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  console.log('loaded')

  const cv = await p.locator('.canvas-area').boundingBox()
  const cx = cv.x + cv.width / 2, cy = cv.y + cv.height / 2

  await hold(p, 20, '开场')

  // 1. Frame
  await p.keyboard.press('f'); await p.waitForTimeout(200)
  await snap(p, 'F tool')
  await p.mouse.move(cx-40, cy-20); await p.mouse.down()
  for (let i=1;i<=15;i++) { await p.mouse.move(cx-40+5.33*i, cy-20+2.67*i); await snap(p) }
  await p.mouse.up(); await hold(p, 12, 'Frame done')

  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.updateLayerProps(s.project.rootLayerIds[0], { fill: '#3a3a3c', cornerRadius: 20 })
  })
  await hold(p, 15, 'dark + radius')

  // 2. Ellipse
  await p.keyboard.press('o'); await p.waitForTimeout(200)
  await snap(p, 'O tool')
  await p.mouse.move(cx-36, cy-16); await p.mouse.down()
  for (let i=1;i<=12;i++) { await p.mouse.move(cx-36+2.67*i, cy-16+2.67*i); await snap(p) }
  await p.mouse.up(); await hold(p, 12, 'Ellipse done')

  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.updateLayerProps(s.project.rootLayerIds[0], { fill: '#ffffff' })
  })
  await hold(p, 15, 'white knob')

  await p.keyboard.press('Escape'); await hold(p, 20, 'Toggle OFF 展示')

  // 3. 添加状态 2
  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.addDisplayState(s.project.stateGroups[0].id, '开启')
  })
  await hold(p, 15, '状态 2 added')

  // 切到状态 2
  const tabs = p.locator('.state-tab')
  await tabs.nth(1).click(); await hold(p, 15, '切到状态 2')

  // 4. 修改状态 2 — 滑块右移 + 背景变绿
  await p.locator('.layer-item').first().click(); await p.waitForTimeout(200)
  const xIn = p.locator('.prop-row', { hasText: 'X' }).locator('input').first()
  if (await xIn.isVisible()) {
    const cur = await xIn.inputValue()
    const nv = Math.round(parseFloat(cur) + 48)
    await xIn.click(); await p.keyboard.press('Meta+a')
    await p.keyboard.type(String(nv), { delay: 50 })
    await p.keyboard.press('Enter'); await hold(p, 12, `X ${cur}→${nv}`)
  }

  // 确保 override 正确
  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    const st2 = g.displayStates[g.displayStates.length - 1]
    const ids = s.project.rootLayerIds
    const knob = s.project.layers[ids[0]]
    s.setOverride(st2.id, ids[0], { x: (knob?.x ?? 0) + 48 })
    s.setOverride(st2.id, ids[ids.length - 1], { fill: '#34c759' })
  })
  await hold(p, 20, '状态 2 — 绿色开启态')

  // 5. 切回状态 1
  await tabs.first().click(); await hold(p, 20, '切回状态 1')

  // 6. Preview 动画 — 用 transitionToState 驱动
  const stateIds = await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    return { groupId: g.id, states: g.displayStates.map(st => st.id) }
  })
  console.log('states:', JSON.stringify(stateIds))

  for (let i = 0; i < 8; i++) {
    const targetState = stateIds.states[i % 2 === 0 ? 1 : 0]
    await p.evaluate(({ gid, sid }) => {
      window.__pinia._s.get('project').transitionToState(gid, sid)
    }, { gid: stateIds.groupId, sid: targetState })
    // 高频截帧捕捉弹簧动画 (~1s, 30fps)
    for (let f = 0; f < 30; f++) {
      await snap(p, f === 0 ? `动画 ${i+1}/8 → ${targetState}` : null)
      await p.waitForTimeout(33)
    }
    await p.waitForTimeout(200)
  }

  await hold(p, 25, '结尾')
  console.log(`✅ 总帧数: ${n}`)
  await b.close()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
