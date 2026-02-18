/**
 * Flow E — 完整 Patch 链路录屏
 * Touch → toggleVariable → condition → To(ON)/To(OFF)
 * + Preview 里 fireTrigger 驱动弹簧动画
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'http://localhost:5173/Intera/'
const DIR = 'docs/journeys/flow-e-patch/frames'
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

  // ═══ 1. Frame (Toggle 背景) ═══
  await p.keyboard.press('f'); await p.waitForTimeout(200)
  await p.mouse.move(cx-40, cy-20); await p.mouse.down()
  for (let i=1;i<=15;i++) { await p.mouse.move(cx-40+5.33*i, cy-20+2.67*i); await snap(p) }
  await p.mouse.up(); await hold(p, 10, 'Frame')

  await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    s.updateLayerProps(s.project.rootLayerIds[0], { fill: '#48484a', cornerRadius: 50, width: 200, height: 100 })
  })
  await hold(p, 12, '深灰圆角')

  // ═══ 2. 椭圆 (滑块) ═══
  await p.keyboard.press('o'); await p.waitForTimeout(200)
  await p.mouse.move(cx-90, cy-40); await p.mouse.down()
  for (let i=1;i<=12;i++) { await p.mouse.move(cx-90+5.33*i, cy-40+5.33*i); await snap(p) }
  await p.mouse.up(); await hold(p, 10, '椭圆')

  // 获取 layer ids — 椭圆可能嵌套在 Frame 里
  const layerInfo = await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const layers = s.project.layers
    const all = Object.entries(layers).map(([id, l]) => ({ id, type: l.type, parentId: l.parentId }))
    return { rootIds: s.project.rootLayerIds, all }
  })
  console.log('layers:', JSON.stringify(layerInfo))

  // 找到 Frame 和 Ellipse 的 id
  const frameId = layerInfo.all.find(l => l.type === 'frame')?.id
  const ellipseId = layerInfo.all.find(l => l.type === 'ellipse')?.id
  console.log('frame:', frameId, 'ellipse:', ellipseId)

  if (ellipseId) {
    await p.evaluate(({ eid, fid }) => {
      const s = window.__pinia._s.get('project')
      const bg = s.project.layers[fid]
      s.updateLayerProps(eid, {
        fill: '#ffffff', width: 84, height: 84,
        x: (bg?.x ?? 0) + 8, y: (bg?.y ?? 0) + 8,
        cornerRadius: 42
      })
    }, { eid: ellipseId, fid: frameId })
  }
  await hold(p, 15, '白色滑块')

  await p.keyboard.press('Escape'); await hold(p, 20, 'Toggle OFF 展示')

  // ═══ 3. 添加状态 ON ═══
  const stateInfo = await p.evaluate(() => {
    const s = window.__pinia._s.get('project')
    const g = s.project.stateGroups[0]
    const ns = s.addDisplayState(g.id, 'ON')
    return { groupId: g.id, stateId: ns?.id, defaultStateId: g.displayStates[0].id }
  })
  console.log('states:', JSON.stringify(stateInfo))
  await hold(p, 10, '添加状态 ON')

  // 切到 ON tab
  const tabs = p.locator('.state-tab')
  if (await tabs.count() >= 2) { await tabs.nth(1).click(); await hold(p, 10, '切到 ON') }

  // ═══ 4. 设置 ON 态 override ═══
  if (ellipseId && frameId) {
    await p.evaluate(({ sid, eid, fid }) => {
      const s = window.__pinia._s.get('project')
      const bg = s.project.layers[fid]
      // 滑块右移到右侧
      s.setOverride(sid, eid, { x: (bg?.x ?? 0) + (bg?.width ?? 200) - 84 - 8 })
      // 背景变绿
      s.setOverride(sid, fid, { fill: '#34c759' })
    }, { sid: stateInfo.stateId, eid: ellipseId, fid: frameId })
  }
  await hold(p, 20, 'ON 态 — 绿色')

  // ═══ 5. 创建 Patch 连线 ═══
  // 切回 OFF 先
  await tabs.first().click(); await hold(p, 10, '切回 OFF')

  const patchIds = await p.evaluate(({ groupId, onStateId, offStateId, layerId }) => {
    const ps = window.__pinia._s.get('patch')

    // 添加变量
    const v = ps.addVariable('isOn', 'boolean', false)

    // 添加节点
    const touch   = ps.addPatchNode('touch',          { x: 60,  y: 80 },  { layerId },                    'Touch')
    const toggle  = ps.addPatchNode('toggleVariable',  { x: 280, y: 80 },  { variableId: v.id },           'Toggle')
    const cond    = ps.addPatchNode('condition',        { x: 500, y: 80 },  { variableId: v.id, compareValue: true }, '开?')
    const toOn    = ps.addPatchNode('to',              { x: 720, y: 40 },  { groupId, stateId: onStateId },  '→ ON')
    const toOff   = ps.addPatchNode('to',              { x: 720, y: 160 }, { groupId, stateId: offStateId }, '→ OFF')

    // 连线: Touch.tap → Toggle.in
    ps.addConnection(touch.id, 'tap', toggle.id, 'in')
    // Toggle.out → Condition.in
    ps.addConnection(toggle.id, 'out', cond.id, 'in')
    // Condition.true → To ON
    ps.addConnection(cond.id, 'true', toOn.id, 'in')
    // Condition.false → To OFF
    ps.addConnection(cond.id, 'false', toOff.id, 'in')

    return { touch: touch.id, toggle: toggle.id, cond: cond.id, toOn: toOn.id, toOff: toOff.id, varId: v.id }
  }, {
    groupId: stateInfo.groupId,
    onStateId: stateInfo.stateId,
    offStateId: stateInfo.defaultStateId,
    layerId: frameId
  })
  console.log('patches:', JSON.stringify(patchIds))
  await hold(p, 25, 'Patch 连线完成')

  // ═══ 6. Preview 动画 — fireTrigger 驱动 ═══
  for (let i = 0; i < 10; i++) {
    // 触发 Touch tap 事件
    await p.evaluate((layerId) => {
      const ps = window.__pinia._s.get('patch')
      ps.fireTrigger(layerId, 'tap')
    }, frameId)

    // 捕捉弹簧动画 ~1.2s @30fps
    for (let f = 0; f < 36; f++) {
      await snap(p, f === 0 ? `动画 ${i+1}/10 → ${i%2===0?'ON':'OFF'}` : null)
      await p.waitForTimeout(33)
    }
  }

  await hold(p, 20, '结尾')
  console.log(`✅ ${n} frames`)
  await b.close()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
