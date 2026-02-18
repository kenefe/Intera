/**
 * Tab 切换 v3 — 全屏录制完整制作过程
 * 画布 375×812，Tab 栏在 y:350 区域
 * 一步一步用 store API 创建，全屏截帧
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JOURNEY_DIR = path.resolve(__dirname, '../docs/journeys/20260215_2349-tab-v3')
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
  await page.waitForTimeout(2000)

  let frame = 0
  const snap = async (count = 1, delayMs = 33) => {
    for (let i = 0; i < count; i++) {
      await page.screenshot({ path: path.join(FRAMES_DIR, `frame-${String(frame++).padStart(4, '0')}.png`) })
      if (i < count - 1) await page.waitForTimeout(delayMs)
    }
  }

  const store = () => `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('project')`
  const patchStore = () => `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('patch')`

  // ═══════════════════════════════════
  //  第一幕：空白画布 (1s)
  // ═══════════════════════════════════
  console.log('第一幕：空白画布')
  await snap(30)

  // ═══════════════════════════════════
  //  第二幕：画背景条
  // ═══════════════════════════════════
  console.log('第二幕：画背景条')
  // 先按 R 显示矩形工具激活状态
  await page.keyboard.press('r')
  await page.waitForTimeout(300)
  await snap(10)

  // 用 store API 创建背景条
  await page.evaluate(`(() => {
    const s = ${store()};
    s.addLayer('rectangle', {x: 15, y: 350, width: 345, height: 44, borderRadius: 12, fill: '#2a2a3e', opacity: 1});
  })()`);
  await page.waitForTimeout(300)
  await snap(20) // 展示背景条

  // ═══════════════════════════════════
  //  第三幕：画指示条
  // ═══════════════════════════════════
  console.log('第三幕：画指示条')
  await page.evaluate(`(() => {
    const s = ${store()};
    s.addLayer('rectangle', {x: 19, y: 354, width: 109, height: 36, borderRadius: 8, fill: '#5b5bf0', opacity: 1});
  })()`);
  await page.waitForTimeout(300)
  await snap(20)

  // ═══════════════════════════════════
  //  第四幕：画三个 Tab 文本
  // ═══════════════════════════════════
  console.log('第四幕：画 Tab 文本')
  // Home
  await page.evaluate(`(() => {
    const s = ${store()};
    s.addLayer('text', {x: 19, y: 358, width: 109, height: 28, fill: '#ffffff', opacity: 1});
    const ids = Object.keys(s.project.layers);
    const l = s.project.layers[ids[ids.length-1]];
    l.text = 'Home'; l.fontSize = 14; l.fontWeight = '600'; l.textAlign = 'center';
  })()`);
  await page.waitForTimeout(200)
  await snap(10)

  // Search
  await page.evaluate(`(() => {
    const s = ${store()};
    s.addLayer('text', {x: 133, y: 358, width: 109, height: 28, fill: '#ffffff', opacity: 0.5});
    const ids = Object.keys(s.project.layers);
    const l = s.project.layers[ids[ids.length-1]];
    l.text = 'Search'; l.fontSize = 14; l.fontWeight = '500'; l.textAlign = 'center';
  })()`);
  await page.waitForTimeout(200)
  await snap(10)

  // Profile
  await page.evaluate(`(() => {
    const s = ${store()};
    s.addLayer('text', {x: 247, y: 358, width: 109, height: 28, fill: '#ffffff', opacity: 0.5});
    const ids = Object.keys(s.project.layers);
    const l = s.project.layers[ids[ids.length-1]];
    l.text = 'Profile'; l.fontSize = 14; l.fontWeight = '500'; l.textAlign = 'center';
  })()`);
  await page.waitForTimeout(300)
  await snap(20) // 展示完整 Tab 设计

  // ═══════════════════════════════════
  //  第五幕：添加状态 + overrides
  // ═══════════════════════════════════
  console.log('第五幕：添加状态')

  // 点击状态栏 + 按钮（如果能找到的话）
  try {
    const addStateBtn = page.locator('button:has-text("+")').first()
    await addStateBtn.click({ timeout: 1000 })
    await page.waitForTimeout(400)
    await snap(8)
  } catch {}

  await page.evaluate(`(() => {
    const s = ${store()};
    const sg = s.project.stateGroups[0];
    const ids = Object.keys(s.project.layers);
    const indicatorId = ids[2]; // 指示条
    const tab1Id = ids[3]; const tab2Id = ids[4]; const tab3Id = ids[5];

    if (sg.displayStates.length < 2) {
      sg.displayStates.push({
        id: 'search', name: 'Search', overrides: {},
        transition: { curve: { type: 'spring', response: 0.4, damping: 0.8 } }
      });
    }
    if (sg.displayStates.length < 3) {
      sg.displayStates.push({
        id: 'profile', name: 'Profile', overrides: {},
        transition: { curve: { type: 'spring', response: 0.4, damping: 0.8 } }
      });
    }

    const search = sg.displayStates[1];
    search.overrides[indicatorId] = { x: 133 };
    search.overrides[tab1Id] = { opacity: 0.5 };
    search.overrides[tab2Id] = { opacity: 1 };

    const profile = sg.displayStates[2];
    profile.overrides[indicatorId] = { x: 247 };
    profile.overrides[tab1Id] = { opacity: 0.5 };
    profile.overrides[tab3Id] = { opacity: 1 };
  })()`);
  await page.waitForTimeout(500)
  await snap(20)

  // ═══════════════════════════════════
  //  第六幕：搭 Patch 连线
  // ═══════════════════════════════════
  console.log('第六幕：搭 Patch')

  // 点击 Patch 工具栏的 Touch 按钮
  try {
    await page.locator('.node-btn[data-type="touch"]').click({ timeout: 1000 })
    await page.waitForTimeout(300)
    await snap(8)
  } catch {}

  // 点击 To 按钮两次
  try {
    await page.locator('.node-btn[data-type="to"]').click({ timeout: 1000 })
    await page.waitForTimeout(200)
    await snap(5)
    await page.locator('.node-btn[data-type="to"]').click({ timeout: 1000 })
    await page.waitForTimeout(200)
    await snap(5)
  } catch {}

  // 用 eval 确保 Patch 节点和连线正确
  await page.evaluate(`(() => {
    const s = ${store()};
    const ps = ${patchStore()};
    const ids = Object.keys(s.project.layers);
    const bgId = ids[1];
    const sg = s.project.stateGroups[0];

    // 确保有 Touch + 2个 To 节点
    if (s.project.patches.length < 3) {
      // 清空重建
      while (s.project.patches.length > 0) s.project.patches.pop();
      while (s.project.connections.length > 0) s.project.connections.pop();

      const touch = ps.addPatchNode('touch', {x: 40, y: 60}, {layerId: bgId}, 'Touch');
      const to1 = ps.addPatchNode('to', {x: 300, y: 40}, {stateId: 'search', groupId: sg.id}, 'To Search');
      const to2 = ps.addPatchNode('to', {x: 300, y: 160}, {stateId: 'profile', groupId: sg.id}, 'To Profile');

      const tapOut = touch.outputs.find(o => o.name === 'tap' || o.name === 'Tap') || touch.outputs[0];
      if (tapOut && to1.inputs[0]) ps.addConnection(touch.id, tapOut.id, to1.id, to1.inputs[0].id);
      if (tapOut && to2.inputs[0]) ps.addConnection(touch.id, tapOut.id, to2.id, to2.inputs[0].id);
    }
  })()`);
  await page.waitForTimeout(500)
  await snap(25) // 展示 Patch 连线

  // ═══════════════════════════════════
  //  第七幕：Preview 动画演示
  // ═══════════════════════════════════
  console.log('第七幕：Preview 动画演示')

  // 点击 Preview 面板触发 auto-cycle
  const previewFrame = page.locator('.preview-frame')

  const stateSequence = [
    { id: 'search', name: 'Search' },
    { id: 'profile', name: 'Profile' },
    { id: null, name: '默认' },  // 回到默认
    { id: 'search', name: 'Search' },
    { id: null, name: '默认' },
    { id: 'profile', name: 'Profile' },
    { id: null, name: '默认' },
  ]

  for (const target of stateSequence) {
    console.log(`  → ${target.name}`)

    // 尝试点击 Preview
    try { await previewFrame.click({ timeout: 300 }) } catch {}

    // 用 eval 确保状态切换
    const stateId = target.id
    await page.evaluate(`(() => {
      const s = ${store()};
      const sg = s.project.stateGroups[0];
      const targetId = ${stateId ? `'${stateId}'` : 'sg.displayStates[0].id'};
      s.transitionToState(sg.id, targetId);
    })()`);

    // 捕捉弹簧动画帧 (~1s at 30fps)
    for (let i = 0; i < 30; i++) {
      await snap()
      await page.waitForTimeout(33)
    }
    // 静止帧
    await snap(10)
  }

  // 结尾静止
  await snap(25)

  console.log(`共截 ${frame} 帧`)
  await browser.close()

  console.log('合成视频...')
  execSync(`ffmpeg -y -framerate 30 -i "${FRAMES_DIR}/frame-%04d.png" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -crf 18 "${OUT}"`, { stdio: 'inherit' })
  console.log('✅ 视频已保存:', OUT)
}

main().catch(e => { console.error(e); process.exit(1) })
