/**
 * Intera Demo — 创建交互动效 + 录制视频
 * 
 * 设计：卡片从小变大展开，背景色变化，圆角变化，透明度变化
 * 使用 Level 0 自动循环（无 Touch Patch，点击 Preview 自动切换状态）
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'

const design = {
  id: 'proj_demo',
  name: 'Card Expand Demo',
  canvasSize: { width: 390, height: 844 },
  layers: {
    'layer_bg': {
      id: 'layer_bg', name: 'Background', type: 'rectangle',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: {
        x: 0, y: 0, width: 390, height: 844,
        rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 1, borderRadius: 0,
        fill: '#0a0a1a', stroke: 'transparent', strokeWidth: 0,
      },
      layoutProps: {
        layout: 'free', gap: 0, padding: [0,0,0,0],
        alignItems: 'start', justifyContent: 'start',
        clipContent: false, widthMode: 'fixed', heightMode: 'fixed',
      },
    },
    'layer_card': {
      id: 'layer_card', name: 'Card', type: 'rectangle',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: {
        x: 95, y: 322, width: 200, height: 200,
        rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 0.6, borderRadius: 32,
        fill: '#1a1040', stroke: 'transparent', strokeWidth: 0,
      },
      layoutProps: {
        layout: 'free', gap: 0, padding: [0,0,0,0],
        alignItems: 'start', justifyContent: 'start',
        clipContent: false, widthMode: 'fixed', heightMode: 'fixed',
      },
    },
    'layer_accent': {
      id: 'layer_accent', name: 'Accent', type: 'ellipse',
      parentId: null, childrenIds: [], visible: true, locked: false,
      props: {
        x: 155, y: 382, width: 80, height: 80,
        rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 0.4, borderRadius: 40,
        fill: '#6c3ce0', stroke: 'transparent', strokeWidth: 0,
      },
      layoutProps: {
        layout: 'free', gap: 0, padding: [0,0,0,0],
        alignItems: 'start', justifyContent: 'start',
        clipContent: false, widthMode: 'fixed', heightMode: 'fixed',
      },
    },
  },
  rootLayerIds: ['layer_bg', 'layer_card', 'layer_accent'],
  stateGroups: [{
    id: 'sg_main',
    name: '主画面',
    rootLayerId: null,
    displayStates: [
      {
        id: 'ds_collapsed',
        name: '收起',
        overrides: {},
        transition: {
          curve: { type: 'spring', response: 0.5, damping: 0.75 },
        },
      },
      {
        id: 'ds_expanded',
        name: '展开',
        overrides: {
          'layer_card': {
            x: 25, y: 172, width: 340, height: 500,
            opacity: 1, borderRadius: 12,
            fill: '#3a1a7e',
          },
          'layer_accent': {
            x: 130, y: 340, width: 130, height: 130,
            opacity: 1,
            fill: '#a78bfa',
          },
          'layer_bg': {
            fill: '#12122e',
          },
        },
        transition: {
          curve: { type: 'spring', response: 0.45, damping: 0.8 },
        },
      },
    ],
    activeDisplayStateId: 'ds_collapsed',
  }],
  variables: [],
  // 无 Touch Patch → Level 0 自动循环模式
  patches: [],
  connections: [],
}

async function main() {
  console.log('🎬 Starting Intera demo recording...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: '/tmp/', size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()

  // 注入设计数据
  await page.addInitScript((data) => {
    localStorage.setItem('intera_project', JSON.stringify(data))
  }, design)

  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  console.log('📐 Page loaded')

  // 验证设计加载成功
  const layerCount = await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
    return Object.keys(store?.project?.layers ?? {}).length
  })
  console.log(`📊 Layers loaded: ${layerCount}`)

  const stateCount = await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
    return store?.project?.stateGroups?.[0]?.displayStates?.length ?? 0
  })
  console.log(`📊 States: ${stateCount}`)

  // 找 Preview 面板
  const previewFrame = page.locator('.preview-frame')
  await previewFrame.waitFor({ state: 'visible', timeout: 5000 })
  const box = await previewFrame.boundingBox()
  
  if (!box) {
    console.error('❌ Preview frame not found!')
    await context.close()
    await browser.close()
    return
  }

  console.log(`📍 Preview: ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`)

  // 截图初始状态
  await page.screenshot({ path: '/tmp/intera-demo/state-collapsed.png' })

  // 检查当前活跃状态
  const getActiveState = async () => {
    return page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__
      const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
      const sg = store?.project?.stateGroups?.[0]
      const active = sg?.activeDisplayStateId
      const ds = sg?.displayStates?.find(s => s.id === active)
      return ds?.name ?? 'unknown'
    })
  }

  console.log(`🔵 Initial state: ${await getActiveState()}`)

  // 点击 Preview 触发自动循环
  console.log('🎯 Clicking preview to trigger animations...')
  
  const cx = box.x + box.width / 2
  const cy = box.y + box.height * 0.45

  for (let i = 0; i < 8; i++) {
    await page.mouse.click(cx, cy)
    const state = await getActiveState()
    console.log(`  Click ${i + 1}/8 → state: ${state}`)
    await page.waitForTimeout(1500) // 等弹簧动画完成
    
    // 每次状态切换后截图
    if (i === 0) {
      await page.screenshot({ path: '/tmp/intera-demo/state-expanded.png' })
    }
  }

  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/intera-demo/final.png' })

  // 保存视频
  const videoPath = await page.video()?.path()
  console.log(`🎥 Video temp: ${videoPath}`)
  
  await context.close()
  await browser.close()

  // 复制视频
  if (videoPath && fs.existsSync(videoPath)) {
    fs.copyFileSync(videoPath, '/tmp/intera-demo.webm')
    const stat = fs.statSync('/tmp/intera-demo.webm')
    console.log(`✅ Video saved: /tmp/intera-demo.webm (${(stat.size / 1024).toFixed(1)} KB)`)
  } else {
    // fallback: 找最新的 webm
    const files = fs.readdirSync('/tmp/').filter(f => f.endsWith('.webm') && f !== 'intera-demo.webm')
    if (files.length > 0) {
      const latest = files.map(f => ({ f, t: fs.statSync(`/tmp/${f}`).mtimeMs }))
        .sort((a, b) => b.t - a.t)[0].f
      fs.copyFileSync(`/tmp/${latest}`, '/tmp/intera-demo.webm')
      console.log(`✅ Video saved: /tmp/intera-demo.webm (from ${latest})`)
    } else {
      console.log('⚠️ No video file found')
    }
  }
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
