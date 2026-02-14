/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Journey Server — 持久浏览器单步执行器
 *
 *  用法: node tests/journey-server.mjs \
 *          --dir docs/journeys/xxx \
 *          --url http://localhost:5177 \
 *          --port 3900
 *
 *  AI 通过 curl 逐步操作:
 *    curl -s localhost:3900/step -d '{"action":"press","key":"r"}'
 *    → {"step":1,"screenshot":"docs/journeys/xxx/screenshots/step-01.png"}
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
import { chromium } from '@playwright/test'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

// ── 参数解析 ──
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) =>
    v.startsWith('--') ? [...acc, [v.slice(2), a[i + 1]]] : acc, [])
)
const PORT = parseInt(args.port || '3900')
const URL  = args.url || 'http://localhost:5177'
const DIR  = args.dir || '/tmp/journey-poc'
const SHOT_DIR = path.join(DIR, 'screenshots')

// ── 状态 ──
let browser, page, stepNum = 0

// ── 截图 ──
async function shot() {
  stepNum++
  const name = `step-${String(stepNum).padStart(2, '0')}.png`
  const fp = path.join(SHOT_DIR, name)
  await page.waitForTimeout(400)
  await page.screenshot({ path: fp })
  const vp = page.viewportSize()
  return { path: fp, width: vp.width, height: vp.height }
}

// ── 动作分发 (纯视觉 — 零选择器，像真实用户) ──
const ACTIONS = {
  screenshot: async () => {},
  mouse:      async ({ x, y }) => page.mouse.click(x, y),
  dblclick:   async ({ x, y }) => page.mouse.dblclick(x, y),
  rightclick: async ({ x, y }) => page.mouse.click(x, y, { button: 'right' }),
  hover:      async ({ x, y }) => page.mouse.move(x, y),
  drag:       async ({ x1, y1, x2, y2, steps = 10 }) => {
    await page.mouse.move(x1, y1)
    await page.mouse.down()
    await page.mouse.move(x2, y2, { steps })
    await page.mouse.up()
  },
  press:      async ({ key }) => page.keyboard.press(key),
  keyboard:   async ({ text }) => page.keyboard.type(text),
  scroll:     async ({ x, y, deltaX = 0, deltaY = 0 }) => {
    await page.mouse.move(x, y)
    await page.mouse.wheel(deltaX, deltaY)
  },

  // 保存设计文件 — 先触发 Pinia store 写入 localStorage，再导出
  save: async () => {
    await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__
      const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
      if (store?.save) store.save()
    })
    const data = await page.evaluate(() => localStorage.getItem('intera_project'))
    if (data) {
      fs.writeFileSync(path.join(DIR, 'design.intera'), data)
      return { saved: true, size: data.length }
    }
    return { saved: false }
  },

  // 关闭
  stop: async () => {
    await browser.close()
    process.exit(0)
  },
}

// ── HTTP 服务 ──
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/step') {
    res.writeHead(404)
    return res.end('POST /step only')
  }

  let body = ''
  for await (const chunk of req) body += chunk
  let cmd
  try { cmd = JSON.parse(body) } catch {
    res.writeHead(400)
    return res.end(JSON.stringify({ error: 'invalid JSON' }))
  }

  const handler = ACTIONS[cmd.action]
  if (!handler) {
    res.writeHead(400)
    return res.end(JSON.stringify({ error: `unknown action: ${cmd.action}` }))
  }

  try {
    const extra = await handler(cmd) || {}
    // stop 不需要截图
    if (cmd.action === 'stop') return

    const snap = cmd.action === 'save' ? null : await shot()
    const viewport = snap ? { width: snap.width, height: snap.height } : undefined
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ step: stepNum, screenshot: snap?.path ?? null, viewport, ...extra }))
  } catch (err) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: err.message }))
  }
})

// ── 启动 ──
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })

  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(URL)
  await page.waitForLoadState('networkidle')

  server.listen(PORT, () => {
    console.log(`🚀 Journey server ready`)
    console.log(`   Browser: ${URL}`)
    console.log(`   API:     http://localhost:${PORT}/step`)
    console.log(`   Dir:     ${DIR}`)
  })
}

main().catch(e => { console.error(e); process.exit(1) })
