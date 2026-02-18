/**
 * iOS Toggle — 截图序列录制（轻量版）
 * 截图 Preview 面板的每一帧，然后用 ffmpeg 合成视频
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRAMES_DIR = path.resolve(__dirname, '../docs/journeys/20260215_2122-ios-toggle-v2/frames')
const OUT = path.resolve(__dirname, '../docs/journeys/20260215_2122-ios-toggle-v2/toggle-demo.mp4')

fs.mkdirSync(FRAMES_DIR, { recursive: true })

const project = {
  id: 'toggle-demo', name: 'iOS Toggle',
  canvasSize: { width: 800, height: 600 },
  layers: {
    track: {
      id: 'track', name: '轨道', type: 'rectangle',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: { x: 100, y: 200, width: 200, height: 120, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, borderRadius: 60, fill: '#e0e0e0', stroke: 'transparent', strokeWidth: 0 },
      layoutProps: { layout: 'free', gap: 0, padding: [0,0,0,0], alignItems: 'start', justifyContent: 'start', clipContent: false, widthMode: 'fixed', heightMode: 'fixed' },
    },
    knob: {
      id: 'knob', name: '滑块', type: 'ellipse',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: { x: 110, y: 210, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, borderRadius: 0, fill: '#ffffff', stroke: 'transparent', strokeWidth: 0 },
      layoutProps: { layout: 'free', gap: 0, padding: [0,0,0,0], alignItems: 'start', justifyContent: 'start', clipContent: false, widthMode: 'fixed', heightMode: 'fixed' },
    },
  },
  rootLayerIds: ['track', 'knob'],
  stateGroups: [{
    id: 'sg0', name: '开关', rootLayerId: null, activeDisplayStateId: 'off',
    displayStates: [
      { id: 'off', name: 'OFF', overrides: {}, transition: { curve: { type: 'spring', response: 0.35, damping: 0.7 } } },
      { id: 'on', name: 'ON', overrides: { track: { fill: '#34c759' }, knob: { x: 190 } }, transition: { curve: { type: 'spring', response: 0.35, damping: 0.7 } } },
    ],
  }],
  variables: [{ id: 'var_toggle', name: 'isOn', type: 'boolean', defaultValue: false }],
  patches: [
    { id: 'p_touch', type: 'touch', name: 'Touch', position: { x: 50, y: 50 }, config: { type: 'touch', layerId: 'knob' }, inputs: [], outputs: [{ id: 'down', name: 'Down', dataType: 'pulse' }, { id: 'up', name: 'Up', dataType: 'pulse' }, { id: 'tap', name: 'Tap', dataType: 'pulse' }] },
    { id: 'p_toggle', type: 'toggleVariable', name: 'Toggle', position: { x: 250, y: 50 }, config: { type: 'toggleVariable', variableId: 'var_toggle' }, inputs: [{ id: 'in', name: 'In', dataType: 'pulse' }], outputs: [{ id: 'out', name: 'Out', dataType: 'pulse' }] },
    { id: 'p_cond', type: 'condition', name: '条件', position: { x: 450, y: 50 }, config: { type: 'condition', variableId: 'var_toggle', compareValue: true }, inputs: [{ id: 'in', name: 'In', dataType: 'pulse' }], outputs: [{ id: 'true', name: 'True', dataType: 'pulse' }, { id: 'false', name: 'False', dataType: 'pulse' }] },
    { id: 'p_to_on', type: 'to', name: 'To ON', position: { x: 650, y: 20 }, config: { type: 'to', groupId: 'sg0', stateId: 'on' }, inputs: [{ id: 'in', name: 'In', dataType: 'pulse' }], outputs: [{ id: 'done', name: 'Done', dataType: 'pulse' }] },
    { id: 'p_to_off', type: 'to', name: 'To OFF', position: { x: 650, y: 100 }, config: { type: 'to', groupId: 'sg0', stateId: 'off' }, inputs: [{ id: 'in', name: 'In', dataType: 'pulse' }], outputs: [{ id: 'done', name: 'Done', dataType: 'pulse' }] },
  ],
  connections: [
    { id: 'c1', fromPatchId: 'p_touch', fromPortId: 'tap', toPatchId: 'p_toggle', toPortId: 'in' },
    { id: 'c2', fromPatchId: 'p_toggle', fromPortId: 'out', toPatchId: 'p_cond', toPortId: 'in' },
    { id: 'c3', fromPatchId: 'p_cond', fromPortId: 'true', toPatchId: 'p_to_on', toPortId: 'in' },
    { id: 'c4', fromPatchId: 'p_cond', fromPortId: 'false', toPatchId: 'p_to_off', toPortId: 'in' },
  ],
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.addInitScript((data) => {
    localStorage.setItem('intera_project', JSON.stringify(data))
  }, project)

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 截 Preview 面板区域（放大效果）
  let frame = 0
  const previewPanel = page.locator('.preview-panel')
  const snap = async () => {
    await previewPanel.screenshot({ path: path.join(FRAMES_DIR, `frame-${String(frame++).padStart(4, '0')}.png`) })
  }

  await snap() // 初始状态

  // 找 Preview 里的滑块（knob 在最上层，直接点击）
  const previewKnob = page.locator('.preview-frame [data-layer-id="knob"]')
  const exists = await previewKnob.count()
  console.log('Preview knob found:', exists > 0)

  if (exists === 0) {
    // fallback: 截全屏
    console.log('No preview track, taking full screenshots')
    await snap()
    await browser.close()
    return
  }

  // 直接调用 store.transitionToState() 触发弹簧动画
  // 绕过 Patch 系统，直接驱动状态切换
  const states = ['on', 'off'] // 交替切换
  for (let click = 0; click < 4; click++) {
    const targetState = states[click % 2]
    await page.evaluate((stateId) => {
      const app = document.querySelector('#app')?.__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      const store = pinia?._s?.get('project')
      if (store?.transitionToState) {
        store.transitionToState('sg0', stateId)
      }
    }, targetState)
    // 连续截帧 ~1s 的弹簧动画（每 33ms 一帧 = 30 帧）
    for (let f = 0; f < 30; f++) {
      await page.waitForTimeout(33)
      await snap()
    }
    // 静止帧
    await page.waitForTimeout(200)
    await snap()
  }

  console.log(`截了 ${frame} 帧`)
  await browser.close()

  // ffmpeg 合成视频
  console.log('合成视频...')
  execSync(`ffmpeg -y -framerate 20 -i "${FRAMES_DIR}/frame-%04d.png" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -crf 18 "${OUT}"`, { stdio: 'inherit' })
  console.log('✅ 视频已保存:', OUT)
}

main().catch(e => { console.error(e); process.exit(1) })
