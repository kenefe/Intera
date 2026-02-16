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
const STORAGE = args.storage || null  // path to storage JSON to inject into localStorage
const SHOT_DIR = path.join(DIR, 'screenshots')

// ── 状态 ──
let browser, page, stepNum = 0

// ── 截图 + 元素扫描 ──

async function shot() {
  stepNum++
  const name = `step-${String(stepNum).padStart(2, '0')}.png`
  const fp = path.join(SHOT_DIR, name)
  await page.waitForTimeout(400)
  await page.screenshot({ path: fp })
  const vp = page.viewportSize()
  const elements = await scanElements()
  return { path: fp, width: vp.width, height: vp.height, elements }
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  通用元素扫描 — 零硬编码选择器
 *
 *  策略: 按交互信号自动发现 + 区域归属
 *  UI 怎么改都不用动这里
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
async function scanElements() {
  return page.evaluate(() => {

    // ── 区域定义 (从 DOM 实时读取) ──
    const REGION_SEL = {
      toolbar:    '.toolbar',
      layers:     '.panel-left',
      canvas:     '.canvas-viewport',
      properties: '.panel-right',
      states:     '.state-bar, .canvas-area > :last-child',
      patch:      '.patch-canvas',
      patchVars:  '.var-panel',
    }
    const regionRects = {}
    for (const [name, sel] of Object.entries(REGION_SEL)) {
      const el = document.querySelector(sel)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1) continue
      regionRects[name] = [Math.round(r.x), Math.round(r.y),
                           Math.round(r.width), Math.round(r.height)]
    }

    /** 判断元素属于哪个区域 */
    function regionOf(el) {
      for (const [name, sel] of Object.entries(REGION_SEL)) {
        if (el.closest(sel)) return name
      }
      return null
    }

    /** 从元素提取人类可读标签 */
    function labelOf(el) {
      const tag = el.tagName.toLowerCase()
      // 1. title 属性
      const title = el.getAttribute('title')
      if (title) return title
      // 2. data 属性语义
      const tool = el.getAttribute('data-tool')
      if (tool) return `tool:${tool}`
      const dtype = el.getAttribute('data-type')
      if (dtype) return `type:${dtype}`
      const patchId = el.getAttribute('data-patch-id')
      if (patchId) {
        const hdr = el.querySelector('.header-text')
        return hdr?.textContent?.trim() || `patch:${patchId.slice(0, 6)}`
      }
      // 3. input/select: 相邻 label + 当前值
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        const field = el.closest('.prop-field, .prop-row, .cfg-row, .var-row')
        const sib = field?.querySelector('.label, span.label')
        const lbl = sib?.textContent?.trim() || el.placeholder || ''
        if (lbl) return `${lbl}:${el.value ?? ''}`
        // checkbox 特殊处理
        if (el.type === 'checkbox') {
          const parent = el.closest('.prop-field')
          const pLbl = parent?.querySelector('.label')?.textContent?.trim()
          return pLbl ? `${pLbl}:${el.checked ? 'on' : 'off'}` : ''
        }
        return ''
      }
      // 4. textContent
      const text = el.textContent?.trim()?.slice(0, 25)
      if (text) return text
      return ''
    }

    const els = []
    const seen = new Set()

    function add(label, x, y, box) {
      const key = `${x},${y}`
      if (seen.has(key)) return
      seen.add(key)
      const entry = { label: label.slice(0, 35), x, y }
      if (box) entry.box = box
      els.push(entry)
    }

    // ── 1. 区域 bounding box ──
    for (const [name, box] of Object.entries(regionRects)) {
      add(`[${name}]`, box[0] + Math.round(box[2] / 2),
                        box[1] + Math.round(box[3] / 2), box)
    }

    // ── 2. 画布图层 (带 bounding box) ──
    const store = document.querySelector('#app')?.__vue_app__
      ?.config?.globalProperties?.$pinia?._s?.get('project')
    const layerMap = store?.project?.layers ?? {}
    const cvEl = document.querySelector('.canvas-viewport')
    const cvR = cvEl?.getBoundingClientRect()
    for (const el of document.querySelectorAll('[data-layer-id]')) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      if (cvR && (r.right < cvR.x || r.x > cvR.right)) continue
      const lid = el.dataset.layerId
      const name = layerMap[lid]?.name || lid?.slice(0, 8)
      add(`[${name}]`, Math.round(r.x + r.width / 2),
                        Math.round(r.y + r.height / 2),
                        [Math.round(r.x), Math.round(r.y),
                         Math.round(r.width), Math.round(r.height)])
    }

    // ── 3. 所有可交互元素 (通用发现) ──
    const interactive = document.querySelectorAll([
      'button', 'input', 'select', 'textarea',
      '[role="button"]', '[tabindex]',
      '[data-tool]', '[data-type]', '[data-patch-id]',
      '.layer-item', '.state-tab', '.port-dot',
    ].join(','))

    for (const el of interactive) {
      const r = el.getBoundingClientRect()
      if (r.width < 3 || r.height < 3) continue
      if (r.bottom < 0 || r.top > innerHeight) continue
      if (r.right < 0 || r.left > innerWidth) continue

      let label = labelOf(el)
      if (!label) continue

      // patch 端口: 特殊标签
      if (el.classList.contains('port-dot')) {
        const dir = el.dataset.portDir || ''
        const node = el.closest('[data-patch-id]')
        const nodeName = node?.querySelector('.header-text')?.textContent?.trim() || ''
        const portName = el.closest('.port-row')?.querySelector('.port-label')?.textContent?.trim() || ''
        label = `port:${nodeName}.${portName}.${dir}`
      }

      const region = regionOf(el)
      const entry = {
        label: label.slice(0, 35),
        x: Math.round(r.x + r.width / 2),
        y: Math.round(r.y + r.height / 2),
      }
      if (region) entry.region = region
      const key = `${entry.x},${entry.y}`
      if (seen.has(key)) continue
      seen.add(key)
      els.push(entry)
    }

    return els
  })
}

// ── 动作分发 (纯视觉 — 零选择器，像真实用户) ──
const ACTIONS = {
  screenshot: async () => {},
  mouse:      async ({ x, y }) => page.mouse.click(x, y),
  dblclick:   async ({ x, y }) => page.mouse.dblclick(x, y),
  rightclick: async ({ x, y }) => page.mouse.click(x, y, { button: 'right' }),
  mousedown:  async ({ x, y, button }) => { await page.mouse.move(x, y); await page.mouse.down({ button: button || 'left' }) },
  mousemove:  async ({ x, y, steps }) => page.mouse.move(x, y, { steps: steps || 1 }),
  mouseup:    async ({ x, y, button }) => { if (x != null) await page.mouse.move(x, y); await page.mouse.up({ button: button || 'left' }) },
  hover:      async ({ x, y }) => page.mouse.move(x, y),
  drag:       async ({ x1, y1, x2, y2, steps = 10 }) => {
    await page.mouse.move(x1, y1)
    await page.waitForTimeout(80)
    await page.mouse.down()
    await page.waitForTimeout(80)
    await page.mouse.move(x2, y2, { steps })
    await page.waitForTimeout(80)
    await page.mouse.up()
  },
  rightdrag:  async ({ x1, y1, x2, y2, steps = 10 }) => {
    await page.mouse.move(x1, y1)
    await page.waitForTimeout(80)
    await page.mouse.down({ button: 'right' })
    await page.waitForTimeout(80)
    await page.mouse.move(x2, y2, { steps })
    await page.waitForTimeout(80)
    await page.mouse.up({ button: 'right' })
  },
  press:      async ({ key }) => page.keyboard.press(key),
  keyboard:   async ({ text }) => page.keyboard.type(text),

  // headless 模式下原生 <select> 无法通过 click+keyboard 操作
  // 用坐标定位元素 → 程序化设置值 → 触发 change 事件
  selectOption: async ({ x, y, label, value }) => {
    await page.evaluate(([px, py, lbl, val]) => {
      const el = document.elementFromPoint(px, py)?.closest('select')
      if (!el) return
      const opt = [...el.options].find(o =>
        (lbl && o.text.includes(lbl)) || (val && o.value === val)
      )
      if (!opt) return
      el.value = opt.value
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, [x, y, label ?? '', value ?? ''])
  },
  scroll:     async ({ x, y, deltaX = 0, deltaY = 0 }) => {
    await page.mouse.move(x, y)
    await page.mouse.wheel(deltaX, deltaY)
  },

  // 调试: 在浏览器上下文中执行 JS 表达式
  evaluate: async ({ expr }) => {
    const result = await page.evaluate(expr)
    return { result }
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
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      step: stepNum,
      screenshot: snap?.path ?? null,
      viewport: snap ? { width: snap.width, height: snap.height } : undefined,
      elements: snap?.elements,
      ...extra,
    }))
  } catch (err) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: err.message }))
  }
})

// ── 启动 ──
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  // Inject localStorage if --storage provided
  if (STORAGE && fs.existsSync(STORAGE)) {
    const data = fs.readFileSync(STORAGE, 'utf8')
    await context.addInitScript((d) => {
      localStorage.setItem('intera_project', d)
    }, data)
    console.log(`📦 Injected localStorage from ${STORAGE}`)
  }

  page = await context.newPage()
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
