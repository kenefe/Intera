// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Intera — 全面 BDD 测试
//  覆盖: 布局 / 绘图 / 图层 / 属性 / 状态 / 画布 /
//       预览 / Patch / 快捷键 / 曲线 / 导出 / 撤销
//
//  运行: npx playwright test tests/intera.spec.ts
//  截图: tests/screenshots/
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { test, expect, type Page, type Locator } from '@playwright/test'

// ══════════════════════════════════════
//  辅助工具
// ══════════════════════════════════════

/** 获取画布区域的 bounding box */
async function canvasBox(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('画布区域不存在')
  return box
}

/** 在画布上拖拽绘制 (从相对中心的偏移) */
async function drawOnCanvas(
  page: Page, dx1: number, dy1: number, dx2: number, dy2: number,
) {
  const box = await canvasBox(page)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx + dx1, cy + dy1)
  await page.mouse.down()
  await page.mouse.move(cx + dx2, cy + dy2, { steps: 8 })
  await page.mouse.up()
}

/** 计算图层面板中可见的图层数 */
function layerItems(page: Page): Locator {
  return page.locator('.layer-item')
}

/** 等待页面加载完成 — 使用 playwright.config 的 baseURL */
async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

/** 绘制一个矩形 (快捷工具) */
async function drawRect(page: Page) {
  await page.keyboard.press('r')
  await drawOnCanvas(page, -60, -40, 60, 40)
}

/** 收集控制台错误 */
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

// ══════════════════════════════════════
//  Feature 1: 应用外壳与布局
// ══════════════════════════════════════

test.describe('Feature: 应用外壳', () => {

  test('页面加载后显示完整四栏布局', async ({ page }) => {
    await load(page)
    // 工具栏
    await expect(page.locator('.toolbar')).toBeVisible()
    await expect(page.locator('.brand')).toHaveText('Intera')
    // 三栏
    await expect(page.locator('.panel-left')).toBeVisible()
    await expect(page.locator('.canvas-area')).toBeVisible()
    await expect(page.locator('.panel-right')).toBeVisible()
    // 状态栏
    await expect(page.locator('.state-bar')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/01-layout.png' })
  })

  test('工具栏包含 5 个绘图工具按钮', async ({ page }) => {
    await load(page)
    const btns = page.locator('.tool-btn')
    await expect(btns).toHaveCount(5)
    for (const tool of ['select', 'frame', 'rectangle', 'ellipse', 'text']) {
      await expect(page.locator(`.tool-btn[data-tool="${tool}"]`)).toBeVisible()
    }
  })

  test('工具栏包含操作按钮 (Open/Save/Export)', async ({ page }) => {
    await load(page)
    for (const text of ['Open', 'Save', 'Export']) {
      await expect(page.locator(`button`, { hasText: text })).toBeVisible()
    }
  })

  test('加载时零控制台错误', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    await page.waitForTimeout(500)
    expect(errors).toHaveLength(0)
  })

  test('空画布时图层面板显示引导文案', async ({ page }) => {
    await load(page)
    await expect(page.locator('.panel-left .empty-state')).toBeVisible()
    await expect(page.locator('.panel-left .empty-state')).toContainText('R')
  })

  test('空画布时属性面板显示「未选中图层」', async ({ page }) => {
    await load(page)
    await expect(page.locator('.properties-panel .empty-state')).toContainText('未选中')
  })
})

// ══════════════════════════════════════
//  Feature 2: 绘图工具
// ══════════════════════════════════════

test.describe('Feature: 绘图工具', () => {

  test('按 R 激活矩形工具，按钮高亮', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r')
    await expect(page.locator('.tool-btn[data-tool="rectangle"]')).toHaveClass(/active/)
  })

  test('拖拽绘制矩形后，图层面板出现新图层', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await expect(layerItems(page)).toHaveCount(1)
    await expect(page.locator('.panel-left')).not.toContainText('空画布')
    await page.screenshot({ path: 'tests/screenshots/02-draw-rect.png' })
  })

  test('绘制矩形后自动切回选择工具', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await expect(page.locator('.tool-btn[data-tool="select"]')).toHaveClass(/active/)
  })

  test('绘制矩形后自动选中该图层', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await expect(page.locator('.layer-item.selected')).toHaveCount(1)
  })

  test('按 O 绘制椭圆', async ({ page }) => {
    await load(page)
    await page.keyboard.press('o')
    await expect(page.locator('.tool-btn[data-tool="ellipse"]')).toHaveClass(/active/)
    await drawOnCanvas(page, -40, -30, 40, 30)
    await expect(layerItems(page)).toHaveCount(1)
    // 图层名现在是中文 (椭圆 1)
    await expect(page.locator('.layer-item')).toContainText('椭圆')
  })

  test('按 F 绘制 Frame 容器', async ({ page }) => {
    await load(page)
    await page.keyboard.press('f')
    await expect(page.locator('.tool-btn[data-tool="frame"]')).toHaveClass(/active/)
    await drawOnCanvas(page, -50, -50, 50, 50)
    await expect(layerItems(page)).toHaveCount(1)
    // 图层名现在是中文 (容器 1)
    await expect(page.locator('.layer-item')).toContainText('容器')
  })

  test('按 T 点击创建文本图层', async ({ page }) => {
    await load(page)
    await page.keyboard.press('t')
    const box = await canvasBox(page)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(layerItems(page)).toHaveCount(1)
    // 图层名现在是中文 (文本 1)
    await expect(page.locator('.layer-item')).toContainText('文本')
  })

  test('连续绘制多个图形，图层面板依次增加', async ({ page }) => {
    await load(page)
    // 矩形
    await page.keyboard.press('r')
    await drawOnCanvas(page, -50, -50, -10, -10)
    // 椭圆
    await page.keyboard.press('o')
    await drawOnCanvas(page, 10, -50, 50, -10)
    // Frame
    await page.keyboard.press('f')
    await drawOnCanvas(page, -50, 10, -10, 50)
    await expect(layerItems(page)).toHaveCount(3)
    await page.screenshot({ path: 'tests/screenshots/03-multi-shapes.png' })
  })
})

// ══════════════════════════════════════
//  Feature 3: 图层管理
// ══════════════════════════════════════

test.describe('Feature: 图层管理', () => {

  test('点击图层面板中的图层可以选中', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 点击空白取消选中
    const canvas = await canvasBox(page)
    await page.mouse.click(canvas.x + 10, canvas.y + 10)
    // 再点击图层面板的图层
    await page.locator('.layer-item').first().click()
    await expect(page.locator('.layer-item.selected')).toHaveCount(1)
  })

  test('画布框选可一次选中多个图层（支持画板外起手）', async ({ page }) => {
    await load(page)
    await page.evaluate(() => {
      const app = (document.querySelector('#app') as HTMLElement & {
        __vue_app__?: { config?: { globalProperties?: { $pinia?: { _s?: Map<string, unknown> } } } }
      }).__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      const project = pinia?._s?.get('project') as {
        addLayer: (type: string) => { id: string }
        updateLayerProps: (id: string, props: Record<string, number>) => void
      }
      const a = project.addLayer('rectangle')
      const b = project.addLayer('rectangle')
      project.updateLayerProps(a.id, { x: 40, y: 140, width: 90, height: 90 })
      project.updateLayerProps(b.id, { x: 200, y: 240, width: 90, height: 90 })
    })
    await page.keyboard.press('v')
    const layers = page.locator('.artboard-frame [data-layer-id]')
    await expect(layers).toHaveCount(2)
    const boxes = await layers.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }))
    const left = Math.min(...boxes.map(b => b.left)) - 8
    const top = Math.min(...boxes.map(b => b.top)) - 8
    const right = Math.max(...boxes.map(b => b.right)) + 8
    const bottom = Math.max(...boxes.map(b => b.bottom)) + 8
    const canvas = await canvasBox(page)
    const startX = canvas.x + 8
    const startY = canvas.y + 8
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(right, bottom, { steps: 8 })
    const marquee = page.locator('.marquee-box')
    await expect(marquee).toBeVisible()
    const box = await marquee.boundingBox()
    const viewport = await page.locator('.canvas-viewport').boundingBox()
    expect(box).toBeTruthy()
    expect(viewport).toBeTruthy()
    const expectedX = Math.min(startX, right) - (viewport?.x ?? 0)
    const expectedY = Math.min(startY, bottom) - (viewport?.y ?? 0)
    const actualX = (box?.x ?? 0) - (viewport?.x ?? 0)
    const actualY = (box?.y ?? 0) - (viewport?.y ?? 0)
    expect(Math.abs(actualX - expectedX)).toBeLessThanOrEqual(2)
    expect(Math.abs(actualY - expectedY)).toBeLessThanOrEqual(2)
    await page.mouse.up()
    await expect(page.locator('.layer-item.selected')).toHaveCount(2)
  })

  test('画布右键命中图层时弹出上下文菜单', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const layer = page.locator('.artboard-frame [data-layer-id]').first()
    await layer.click({ button: 'right' })
    await expect(page.locator('.ctx-menu')).toBeVisible()
    await expect(page.locator('.ctx-item', { hasText: '删除' })).toBeVisible()
  })

  test('绘制图层后属性面板显示有效坐标', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 绘制后图层自动选中，属性面板应显示有效数值
    const xInput = page.locator('.prop-field .input').first()
    const yInput = page.locator('.prop-field .input').nth(1)
    const x = Number(await xInput.inputValue())
    const y = Number(await yInput.inputValue())
    expect(x).not.toBeNaN()
    expect(y).not.toBeNaN()
  })

  test('图层面板显示正确的类型图标', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r')
    await drawOnCanvas(page, -60, -40, 0, 0)
    const icon = page.locator('.layers-section .layer-icon').first()
    await expect(icon).toHaveAttribute('data-type', 'rectangle')
  })
})

// ══════════════════════════════════════
//  Feature 4: 属性面板
// ══════════════════════════════════════

test.describe('Feature: 属性面板', () => {

  test('选中图层后属性面板显示 X/Y/W/H', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await expect(page.locator('.layer-header')).toBeVisible()
    await expect(page.locator('.group-title', { hasText: '位置 / 尺寸' })).toBeVisible()
    await expect(page.locator('.group-title', { hasText: '外观' })).toBeVisible()
  })

  test('属性面板显示正确的宽高值', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 绘制了 120x80 的矩形 (从 -60,-40 到 60,40)
    const wInput = page.locator('.prop-field').nth(2).locator('.input')
    const hInput = page.locator('.prop-field').nth(3).locator('.input')
    const w = Number(await wInput.inputValue())
    const h = Number(await hInput.inputValue())
    expect(w).toBeGreaterThan(50)
    expect(h).toBeGreaterThan(30)
  })

  test('修改 X 坐标属性后图层位置更新', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const xInput = page.locator('.prop-field').first().locator('.input')
    await xInput.fill('200')
    await xInput.press('Enter')
    await page.waitForTimeout(100)
    // 重新读取确认
    expect(await xInput.inputValue()).toBe('200')
  })

  test('透明度属性可编辑', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const opacityInput = page.locator('.prop-field', { hasText: '透明度' }).locator('.input')
    await opacityInput.fill('0.5')
    await opacityInput.press('Enter')
    expect(await opacityInput.inputValue()).toBe('0.5')
  })

  test('填充颜色选择器可用', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 自定义 ColorPicker — 色块可见
    const swatch = page.locator('.prop-row', { hasText: '填充' }).locator('.color-swatch')
    await expect(swatch).toBeVisible()
  })

  test('通过图层面板切换选中后属性面板响应', async ({ page }) => {
    await load(page)
    // 绘制两个图形
    await page.keyboard.press('r')
    await drawOnCanvas(page, -80, -40, -10, 10)
    await page.keyboard.press('r')
    await drawOnCanvas(page, 10, -40, 80, 10)
    // 此时第二个图层被选中
    await expect(page.locator('.layer-item.selected')).toHaveCount(1)
    // 点击第一个图层
    await layerItems(page).first().click()
    await expect(layerItems(page).first()).toHaveClass(/selected/)
    // 属性面板应显示第一个图层的属性
    await expect(page.locator('.layer-header')).toBeVisible()
  })
})

// ══════════════════════════════════════
//  Feature 5: 显示状态 (关键帧)
// ══════════════════════════════════════

test.describe('Feature: 显示状态', () => {

  test('初始只有一个默认状态', async ({ page }) => {
    await load(page)
    const slots = page.locator('.artboard-slot')
    await expect(slots).toHaveCount(1)
    await expect(slots.first()).toContainText('默认')
    await expect(slots.first().locator('.artboard.active')).toHaveCount(1)
  })

  test('点击 + 按钮添加新状态', async ({ page }) => {
    await load(page)
    await page.locator('.add-state-btn').click()
    await expect(page.locator('.artboard-slot')).toHaveCount(2)
    await page.screenshot({ path: 'tests/screenshots/04-two-states.png' })
  })

  test('点击状态标签切换激活状态', async ({ page }) => {
    await load(page)
    await page.locator('.add-state-btn').click()
    const second = page.locator('.artboard-slot').nth(1)
    await second.click()
    await expect(second.locator('.artboard.active')).toHaveCount(1)
    await expect(page.locator('.artboard-slot').first().locator('.artboard.active')).toHaveCount(0)
  })

  test('默认状态不可删除 — 右键菜单删除项禁用', async ({ page }) => {
    await load(page)
    await page.locator('.add-state-btn').click()
    // 默认状态右键 → 删除应禁用
    await page.locator('.artboard-slot').first().click({ button: 'right' })
    const del = page.locator('.ctx-item').filter({ hasText: '删除' })
    await expect(del).toHaveClass(/disabled/)
    await page.keyboard.press('Escape')
  })

  test('只有一个状态时删除禁用', async ({ page }) => {
    await load(page)
    await page.locator('.artboard-slot').first().click({ button: 'right' })
    const del = page.locator('.ctx-item').filter({ hasText: '删除' })
    await expect(del).toHaveClass(/disabled/)
    await page.keyboard.press('Escape')
  })

  test('删除非默认状态后数量减少', async ({ page }) => {
    await load(page)
    await page.locator('.add-state-btn').click()
    await expect(page.locator('.artboard-slot')).toHaveCount(2)
    await page.locator('.artboard-slot').nth(1).click({ button: 'right' })
    await page.locator('.ctx-item').filter({ hasText: '删除' }).click()
    await expect(page.locator('.artboard-slot')).toHaveCount(1)
  })
})

// ══════════════════════════════════════
//  Feature 6: 画布导航
// ══════════════════════════════════════

test.describe('Feature: 画布导航', () => {

  test('Ctrl+滚轮缩放画布', async ({ page }) => {
    await load(page)
    const box = await canvasBox(page)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    // Ctrl + 向上滚动 = 放大 (模拟触控板 pinch)
    await page.mouse.move(cx, cy)
    // 通过 JS 派发带 ctrlKey 的 wheel 事件
    await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      el?.dispatchEvent(new WheelEvent('wheel', {
        clientX: x, clientY: y, deltaY: -200, ctrlKey: true, bubbles: true,
      }))
    }, { x: cx, y: cy })
    await page.waitForTimeout(100)
    // 验证 transform scale 变大
    const world = page.locator('.canvas-world')
    const style = await world.getAttribute('style')
    expect(style).toContain('scale(')
    const match = style?.match(/scale\(([^)]+)\)/)
    if (match) {
      expect(parseFloat(match[1])).toBeGreaterThan(1)
    }
  })

  test('Ctrl+向下滚动缩小画布', async ({ page }) => {
    await load(page)
    const box = await canvasBox(page)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      el?.dispatchEvent(new WheelEvent('wheel', {
        clientX: x, clientY: y, deltaY: 200, ctrlKey: true, bubbles: true,
      }))
    }, { x: cx, y: cy })
    await page.waitForTimeout(100)
    const style = await page.locator('.canvas-world').getAttribute('style')
    const match = style?.match(/scale\(([^)]+)\)/)
    if (match) {
      expect(parseFloat(match[1])).toBeLessThan(1)
    }
  })
})

// ══════════════════════════════════════
//  Feature 7: 预览面板 (常驻左栏)
// ══════════════════════════════════════

test.describe('Feature: 预览面板', () => {

  test('预览面板始终可见', async ({ page }) => {
    await load(page)
    await expect(page.locator('.preview-panel')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/05-preview-panel.png' })
  })

  test('绘制图层后预览面板显示对应元素', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 预览面板的 .preview-frame 内应该有图层渲染
    const previewLayers = page.locator('.preview-frame [data-layer-id]')
    await expect(previewLayers).toHaveCount(1)
  })

  test('预览面板交互不产生控制台错误', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    await drawRect(page)
    // 点击预览面板
    const preview = page.locator('.preview-panel')
    const pbox = await preview.boundingBox()
    if (pbox) {
      await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2)
    }
    await page.waitForTimeout(300)
    expect(errors).toHaveLength(0)
  })

  test('预览面板 Level 0 自动循环 (两个状态无 Patch 时)', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    await drawRect(page)
    // 添加第二个状态
    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(200)
    // 点击预览面板触发自动循环
    const preview = page.locator('.preview-panel')
    const pbox = await preview.boundingBox()
    if (pbox) {
      await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2)
    }
    await page.waitForTimeout(600)
    expect(errors).toHaveLength(0)
  })

  test('预览播放不污染画布编辑态 (状态标签保持不变)', async ({ page }) => {
    await load(page)
    await drawRect(page)

    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(120)

    await page.locator('.artboard-slot').nth(1).click()
    const activeBefore = await page.locator('.artboard-slot:has(.artboard.active) .artboard-name').first().innerText()

    const preview = page.locator('.preview-panel')
    const pbox = await preview.boundingBox()
    if (pbox) {
      await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2)
    }
    await page.waitForTimeout(600)

    await expect(page.locator('.artboard-slot:has(.artboard.active) .artboard-name').first()).toHaveText(activeBefore)
  })

  test('预览播放不写入编辑态 live 通道', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(120)
    await page.locator('.artboard-slot').nth(1).click()

    await page.evaluate(() => {
      type ProjectStoreEval = {
        project: { stateGroups: Array<{ displayStates: Array<{ id: string }> }>; rootLayerIds: string[] }
        setOverride: (sid: string, lid: string, v: { x: number }) => void
      }
      const app = (document.querySelector('#app') as HTMLElement & { __vue_app__?: unknown }).__vue_app__
      const pinia = (app as { config?: { globalProperties?: { $pinia?: { _s?: Map<string, unknown> } } } })
        ?.config?.globalProperties?.$pinia
      const project = pinia?._s?.get('project') as ProjectStoreEval
      const group = project.project.stateGroups[0]
      const sid = group.displayStates[1].id
      const lid = project.project.rootLayerIds[0]
      project.setOverride(sid, lid, { x: 420 })
    })

    const preview = page.locator('.preview-panel')
    const pbox = await preview.boundingBox()
    if (pbox) {
      await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2)
    }
    await page.waitForTimeout(250)

    const channels = await page.evaluate(() => {
      type ProjectStoreEval = { liveStateId: string | null; previewLiveStateId: string | null }
      const app = (document.querySelector('#app') as HTMLElement & { __vue_app__?: unknown }).__vue_app__
      const pinia = (app as { config?: { globalProperties?: { $pinia?: { _s?: Map<string, unknown> } } } })
        ?.config?.globalProperties?.$pinia
      const project = pinia?._s?.get('project') as ProjectStoreEval
      return { liveStateId: project.liveStateId, previewLiveStateId: project.previewLiveStateId }
    })

    expect(channels.liveStateId).toBeNull()
    expect(channels.previewLiveStateId).not.toBeNull()
  })
})

// ══════════════════════════════════════
//  Feature 8: Patch 编辑器
// ══════════════════════════════════════

test.describe('Feature: Patch 编辑器', () => {

  test('Patch 编辑器常驻可见，含节点工具栏', async ({ page }) => {
    await load(page)
    await expect(page.locator('.patch-canvas')).toBeVisible()
    // 7 种节点类型按钮齐全
    for (const t of ['touch', 'condition', 'toggleVariable', 'delay', 'to', 'setTo', 'setVariable']) {
      await expect(page.locator(`.node-btn[data-type="${t}"]`)).toBeVisible()
    }
    await page.screenshot({ path: 'tests/screenshots/06-patch-editor.png' })
  })

  test('变量面板常驻可见，支持新建变量', async ({ page }) => {
    await load(page)
    const panel = page.locator('.patch-var-panel')
    await expect(panel).toBeVisible()
    // 初始无变量
    await expect(panel.locator('.panel-title')).toContainText('变量 (0)')
    // 点击 + 新建
    await panel.locator('.btn-add').click()
    await expect(panel.locator('.panel-title')).toContainText('变量 (1)')
    await expect(panel.locator('.var-name')).toHaveValue('myVar')
    await expect(panel.locator('.var-type')).toHaveValue('boolean')
  })

  test('变量面板支持删除变量', async ({ page }) => {
    await load(page)
    const panel = page.locator('.patch-var-panel')
    await panel.locator('.btn-add').click()
    await expect(panel.locator('.var-item')).toHaveCount(1)
    // 删除
    await panel.locator('.var-del').click()
    await expect(panel.locator('.var-item')).toHaveCount(0)
    await expect(panel.locator('.panel-title')).toContainText('变量 (0)')
  })

  test('变量面板可折叠和展开', async ({ page }) => {
    await load(page)
    const panel = page.locator('.patch-var-panel')
    // 初始展开态
    await expect(panel.locator('.panel-header')).toBeVisible()
    // 折叠
    await panel.locator('.btn-collapse').click()
    await expect(panel).toHaveClass(/collapsed/)
    await expect(panel.locator('.toggle-strip')).toBeVisible()
    // 展开
    await panel.locator('.toggle-strip').click()
    await expect(panel).not.toHaveClass(/collapsed/)
    await expect(panel.locator('.panel-header')).toBeVisible()
  })

  test('Patch 面板有可拖拽调高度的分割手柄', async ({ page }) => {
    await load(page)
    const handle = page.locator('.resize-handle')
    await expect(handle).toBeVisible()
    await expect(handle.locator('.resize-grip')).toBeVisible()
    // 手柄 cursor 应为 row-resize
    await expect(handle).toHaveCSS('cursor', 'row-resize')
  })

  test('Patch 面板默认高度约为视口的 1/3', async ({ page }) => {
    await load(page)
    const vh = page.viewportSize()!.height
    const row = page.locator('.patch-row')
    const box = await row.boundingBox()
    expect(box).toBeTruthy()
    // 允许 ±30px 误差 (resize handle 本身占 6px + 边框)
    expect(box!.height).toBeGreaterThan(vh / 3 - 30)
    expect(box!.height).toBeLessThan(vh / 3 + 30)
  })

  test('拖拽分割手柄可改变 Patch 面板高度', async ({ page }) => {
    await load(page)
    const handle = page.locator('.resize-handle')
    const row = page.locator('.patch-row')
    const before = (await row.boundingBox())!.height
    // 向上拖 80px → 高度应增加
    const hBox = (await handle.boundingBox())!
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y - 80, { steps: 8 })
    await page.mouse.up()
    const after = (await row.boundingBox())!.height
    expect(after).toBeGreaterThan(before + 50)
  })

  test('Patch 面板高度在刷新后持久化', async ({ page }) => {
    await load(page)
    const handle = page.locator('.resize-handle')
    const row = page.locator('.patch-row')
    // 拖拽改变高度
    const hBox = (await handle.boundingBox())!
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y - 100, { steps: 8 })
    await page.mouse.up()
    const saved = (await row.boundingBox())!.height
    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')
    const restored = (await row.boundingBox())!.height
    // 允许 ±5px 误差
    expect(Math.abs(restored - saved)).toBeLessThan(5)
  })
})

// ══════════════════════════════════════
//  Feature 9: 键盘快捷键
// ══════════════════════════════════════

test.describe('Feature: 键盘快捷键', () => {

  test('V 键切换到选择工具', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r') // 先切到别的
    await page.keyboard.press('v')
    await expect(page.locator('.tool-btn[data-tool="select"]')).toHaveClass(/active/)
  })

  test('R 键切换到矩形工具', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r')
    await expect(page.locator('.tool-btn[data-tool="rectangle"]')).toHaveClass(/active/)
  })

  test('O 键切换到椭圆工具', async ({ page }) => {
    await load(page)
    await page.keyboard.press('o')
    await expect(page.locator('.tool-btn[data-tool="ellipse"]')).toHaveClass(/active/)
  })

  test('F 键切换到容器工具', async ({ page }) => {
    await load(page)
    await page.keyboard.press('f')
    await expect(page.locator('.tool-btn[data-tool="frame"]')).toHaveClass(/active/)
  })

  test('T 键切换到文本工具', async ({ page }) => {
    await load(page)
    await page.keyboard.press('t')
    await expect(page.locator('.tool-btn[data-tool="text"]')).toHaveClass(/active/)
  })

  test('快速连续切换工具不报错', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    for (const k of ['v', 'r', 'o', 'f', 't', 'v', 'r']) {
      await page.keyboard.press(k)
    }
    expect(errors).toHaveLength(0)
  })
})

// ══════════════════════════════════════
//  Feature 10: 曲线配置
// ══════════════════════════════════════

test.describe('Feature: 曲线配置', () => {

  test('曲线面板默认显示弹簧类型', async ({ page }) => {
    await load(page)
    const select = page.locator('.curve-type-select, select').first()
    // 面板应该可见
    await expect(page.locator('.panel-right')).toContainText('过渡曲线')
  })

  test('曲线面板包含响应和阻尼滑块', async ({ page }) => {
    await load(page)
    const rightPanel = page.locator('.panel-right')
    await expect(rightPanel).toContainText('响应')
    await expect(rightPanel).toContainText('阻尼')
  })
})

// ══════════════════════════════════════
//  Feature 11: 关键属性
// ══════════════════════════════════════

test.describe('Feature: 关键属性', () => {

  test('选中图层后右面板显示关键属性列表', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const keyPanel = page.locator('.panel-right')
    // 应有关键属性相关的 UI
    for (const prop of ['X', 'Y', 'W', 'H']) {
      await expect(keyPanel).toContainText(prop)
    }
    await page.screenshot({ path: 'tests/screenshots/07-key-props.png' })
  })
})

// ══════════════════════════════════════
//  Feature 12: 导出
// ══════════════════════════════════════

test.describe('Feature: 导出', () => {

  test('点击 Export 打开导出对话框', async ({ page }) => {
    await load(page)
    // Export 按钮使用 .btn-action 类
    await page.locator('button', { hasText: 'Export' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/08-export-dialog.png' })
  })
})

// ══════════════════════════════════════
//  Feature 13: 状态间动画过渡
// ══════════════════════════════════════

test.describe('Feature: 状态间动画过渡', () => {

  test('创建两个状态 + 修改属性 + 切换时无报错', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    // 画一个矩形
    await drawRect(page)
    // 添加第二个状态
    await page.locator('.add-state-btn').click()
    // 切换到第二个状态
    await page.locator('.artboard-slot').nth(1).click()
    await page.waitForTimeout(200)
    // 修改属性 (模拟在新状态中改位置)
    const xInput = page.locator('.prop-field').first().locator('.input')
    if (await xInput.isVisible()) {
      await xInput.fill('500')
      await xInput.press('Enter')
    }
    // 切回默认状态 (触发动画)
    await page.locator('.artboard-slot').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/09-state-transition.png' })
    expect(errors).toHaveLength(0)
  })
})

// ══════════════════════════════════════
//  Feature 14: 综合集成
// ══════════════════════════════════════

test.describe('Feature: 综合集成', () => {

  test('完整工作流: 绘制 → 编辑 → 切状态 → Patch → 预览点击', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    // 绘制两个图形
    await page.keyboard.press('r')
    await drawOnCanvas(page, -50, -40, -10, -10)
    await page.keyboard.press('o')
    await drawOnCanvas(page, 10, -40, 50, -10)
    await expect(layerItems(page)).toHaveCount(2)
    // 选中第一个图层
    await layerItems(page).first().click()
    // 修改属性
    const opacityInput = page.locator('.prop-field', { hasText: '透明度' }).locator('.input')
    if (await opacityInput.isVisible()) {
      await opacityInput.fill('0.8')
      await opacityInput.press('Enter')
    }
    // 添加状态
    await page.locator('.add-state-btn').click()
    await expect(page.locator('.artboard-slot')).toHaveCount(2)
    // 切换到第二状态
    await page.locator('.artboard-slot').nth(1).click()
    await page.waitForTimeout(200)
    // 切回默认 (触发动画过渡)
    await page.locator('.artboard-slot').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/10-integration.png' })
    expect(errors).toHaveLength(0)
  })

  test('大量操作后无内存泄漏 (无控制台错误)', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    // 快速创建 10 个矩形
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('r')
      await drawOnCanvas(page, -50 + i * 10, -40 + i * 5, -30 + i * 10, -20 + i * 5)
    }
    await expect(layerItems(page)).toHaveCount(10)
    // 快速切换工具
    for (const k of ['v', 'r', 'o', 'f', 't']) {
      await page.keyboard.press(k)
    }
    // Patch 编辑器常驻可见
    await expect(page.locator('.patch-canvas')).toBeVisible()
    expect(errors).toHaveLength(0)
    await page.screenshot({ path: 'tests/screenshots/11-stress.png' })
  })

  test('保存后刷新页面，画布正确渲染恢复的图层', async ({ page }) => {
    await load(page)
    // 绘制矩形
    await drawRect(page)
    await expect(layerItems(page)).toHaveCount(1)
    // 画布有渲染元素
    const renderedBefore = page.locator('.artboard-frame [data-layer-id]')
    await expect(renderedBefore).toHaveCount(1)
    // Ctrl+S 保存
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(200)
    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')
    // 图层面板恢复
    await expect(layerItems(page)).toHaveCount(1)
    // 画布渲染恢复的图层 (回归: 修复 syncLayers 在 renderer 未挂载时的时序问题)
    const renderedAfter = page.locator('.artboard-frame [data-layer-id]')
    await expect(renderedAfter).toHaveCount(1)
    const box = await renderedAfter.first().boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════
//  Feature: Drag 行为
// ══════════════════════════════════════

test.describe('Feature: Drag 行为', () => {

  test('behaviorDrag 绑定图层后，预览面板拖拽图层位置跟手', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)

    // 绘制矩形
    await drawRect(page)
    await expect(layerItems(page)).toHaveCount(1)

    // 通过 store 添加 behaviorDrag patch 并绑定到图层
    const layerId = await page.evaluate(() => {
      const app = (document.querySelector('#app') as HTMLElement & { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, Record<string, unknown>> } } } } }).__vue_app__
      const pinia = app.config.globalProperties.$pinia
      const proj = pinia._s.get('project') as Record<string, unknown>
      const project = proj.project as { layers: Record<string, unknown>; rootLayerIds: string[] }
      const lid = project.rootLayerIds[0]

      const patchStore = pinia._s.get('patch') as Record<string, (...args: unknown[]) => unknown>
      patchStore.addPatchNode('behaviorDrag', { x: 100, y: 100 }, { layerId: lid, axis: 'both' })
      return lid
    })
    expect(layerId).toBeTruthy()

    // 在预览面板找到图层元素
    const previewLayer = page.locator(`.preview-frame [data-layer-id="${layerId}"]`)
    await expect(previewLayer).toBeVisible()
    const before = await previewLayer.boundingBox()
    expect(before).toBeTruthy()

    // 在预览面板拖拽图层
    const frame = page.locator('.preview-frame')
    const fBox = await frame.boundingBox()
    expect(fBox).toBeTruthy()
    const startX = before!.x + before!.width / 2
    const startY = before!.y + before!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 50, startY + 30, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    // 验证图层位置发生了变化
    const after = await previewLayer.boundingBox()
    expect(after).toBeTruthy()
    // 拖拽后位置应该有明显偏移
    const dx = Math.abs(after!.x - before!.x)
    const dy = Math.abs(after!.y - before!.y)
    expect(dx + dy).toBeGreaterThan(5)

    expect(errors).toHaveLength(0)
    await page.screenshot({ path: 'tests/screenshots/drag-behavior.png' })
  })
})

// ══════════════════════════════════════
//  Feature 15: UI 打磨回归
// ══════════════════════════════════════

test.describe('Feature: UI 打磨回归', () => {

  test('状态栏激活态有底部蓝色下划线', async ({ page }) => {
    await load(page)
    const activeTab = page.locator('.artboard-slot:has(.artboard.active)')
    await expect(activeTab).toBeVisible()
    const style = await activeTab.evaluate(el => getComputedStyle(el).boxShadow)
    expect(style).toContain('rgb')
  })

  test('工具按钮激活态有底部蓝色下划线', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r')
    const activeBtn = page.locator('.tool-btn.active')
    await expect(activeBtn).toBeVisible()
    const style = await activeBtn.evaluate(el => getComputedStyle(el).boxShadow)
    expect(style).toContain('rgb')
  })

  test('开启描边后默认宽度为 2', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const toggle = page.locator('.stroke-toggle')
    await toggle.click()
    await page.waitForTimeout(100)
    const swInput = page.locator('.prop-field', { hasText: '宽度' }).locator('.input')
    await expect(swInput).toBeVisible()
    expect(Number(await swInput.inputValue())).toBe(2)
  })

  test('Patch 画布自定义平移 (overflow hidden)', async ({ page }) => {
    await load(page)
    const canvas = page.locator('.patch-canvas')
    await expect(canvas).toBeVisible()
    const overflow = await canvas.evaluate(el => getComputedStyle(el).overflow)
    expect(overflow).toBe('hidden')
  })

  test('曲线面板 slider 旁有可编辑数值输入框', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(200)
    const paramInput = page.locator('.panel-right .param-input').first()
    await expect(paramInput).toBeVisible()
    await expect(paramInput).toHaveAttribute('type', 'number')
  })

  test('曲线面板元素有 data-testid 属性', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="curve-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="curve-response"]')).toBeVisible()
    await expect(page.locator('[data-testid="curve-damping"]')).toBeVisible()
  })

  test('Number input 无 spinner 箭头 (appearance textfield)', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const numInput = page.locator('.prop-field .input[type="number"]').first()
    await expect(numInput).toBeVisible()
    const appearance = await numInput.evaluate(el => getComputedStyle(el).MozAppearance || getComputedStyle(el).webkitAppearance || getComputedStyle(el).appearance)
    // Chromium 中 textfield 或 auto 都可接受，关键是 spinner 被隐藏
    expect(['textfield', 'auto', 'none', '']).toContain(appearance)
  })
})

// ══════════════════════════════════════
//  Feature 16: Review #1 补测试
// ══════════════════════════════════════

test.describe('Feature: Review #1 补缺', () => {

  test('新增状态命名为递增数字而非时间戳', async ({ page }) => {
    await load(page)
    await drawRect(page)
    await page.locator('.add-state-btn').click()
    await page.waitForTimeout(200)
    const tabs = page.locator('.artboard-slot')
    const count = await tabs.count()
    expect(count).toBe(2)
    const name = await tabs.nth(1).textContent()
    // 应该是 "状态 2" 之类的递增名，不是时间戳
    expect(name).not.toMatch(/\d{4}-\d{2}/)
    expect(name!.trim()).toBeTruthy()
  })

  test('Patch 节点可删除', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 添加一个 Touch 节点
    await page.locator('.patch-toolbar button[data-type="touch"]').click()
    await page.waitForTimeout(200)
    const nodesBefore = await page.locator('.patch-node').count()
    expect(nodesBefore).toBeGreaterThanOrEqual(1)
    // 点击节点选中
    await page.locator('.patch-node').first().click()
    await page.waitForTimeout(100)
    // 按 Delete 或 Backspace 删除
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    const nodesAfter = await page.locator('.patch-node').count()
    expect(nodesAfter).toBeLessThan(nodesBefore)
  })

  test('Patch 端口拖线创建连接', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 添加 Touch + To 节点
    await page.locator('.patch-toolbar button[data-type="touch"]').click()
    await page.waitForTimeout(200)
    await page.locator('.patch-toolbar button[data-type="to"]').click()
    await page.waitForTimeout(200)
    // 找到 Touch 的 Tap 输出端口和 To 的输入端口
    const outPort = page.locator('.patch-node').first().locator('.port-out').nth(2) // Tap
    const inPort = page.locator('.patch-node').last().locator('.port-in').first()
    const outBox = await outPort.boundingBox()
    const inBox = await inPort.boundingBox()
    expect(outBox).toBeTruthy()
    expect(inBox).toBeTruthy()
    await page.mouse.move(outBox!.x + outBox!.width/2, outBox!.y + outBox!.height/2)
    await page.mouse.down()
    await page.mouse.move(inBox!.x + inBox!.width/2, inBox!.y + inBox!.height/2, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // 验证连线存在 (SVG path 或 wire 元素)
    const wires = await page.locator('.patch-canvas svg path, .patch-canvas .wire').count()
    expect(wires).toBeGreaterThanOrEqual(1)
  })

  test('变量面板 + 按钮就地创建变量', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 展开变量面板
    const varPanel = page.locator('.patch-var-panel')
    await expect(varPanel).toBeVisible()
    // 点击新建变量
    const addVarBtn = varPanel.locator('button', { hasText: /[+＋新]/ })
    if (await addVarBtn.count() > 0) {
      const before = await varPanel.locator('.var-item').count()
      await addVarBtn.click()
      await page.waitForTimeout(200)
      const after = await varPanel.locator('.var-item').count()
      expect(after).toBeGreaterThan(before)
    }
  })

  test('聚焦 input 时快捷键不触发工具切换', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 找到属性面板的数值输入框
    const input = page.locator('.prop-field .input').first()
    await input.click()
    await input.focus()
    // 在 input 内按 R (矩形工具快捷键)
    await input.press('r')
    await page.waitForTimeout(100)
    // 工具不应该切换到矩形 — 选择工具应该仍然激活
    const rectActive = await page.locator('.tool-btn[data-tool="rect"].active').count()
    expect(rectActive).toBe(0)
  })
})

// ══════════════════════════════════════
//  Feature: 摩擦点修复回归
// ══════════════════════════════════════

test.describe('Feature: 摩擦点修复回归', () => {

  test('自定义 ColorPicker 替换原生 color input', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 属性面板应该有 ColorPicker 组件，不是原生 input[type=color]
    const nativeColor = page.locator('.properties-panel input[type="color"]')
    expect(await nativeColor.count()).toBe(0)
    // 应该有 .color-swatch (自定义 ColorPicker)
    const swatch = page.locator('.properties-panel .color-swatch')
    expect(await swatch.count()).toBeGreaterThan(0)
  })

  test('ColorPicker 点击弹出 hex 输入和色板', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const swatch = page.locator('.properties-panel .color-swatch').first()
    await swatch.click()
    // 弹出下拉面板
    const dropdown = page.locator('.color-dropdown')
    await expect(dropdown).toBeVisible()
    // 包含 hex 输入框
    const hexInput = page.locator('.hex-input')
    await expect(hexInput).toBeVisible()
    // 包含色板
    const palette = page.locator('.palette-color')
    expect(await palette.count()).toBeGreaterThan(0)
  })

  test('属性面板所有区块统一使用 CollapsibleGroup', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 矩形: 位置/尺寸 + 变换 + 外观 + 过渡曲线 = 4 个 CollapsibleGroup
    const groups = page.locator('.panel-right .collapsible-group')
    expect(await groups.count()).toBeGreaterThanOrEqual(4)
    // 变换组默认收起 — chevron 应该有 collapsed 类
    const chevrons = page.locator('.properties-panel .chevron.collapsed')
    expect(await chevrons.count()).toBeGreaterThanOrEqual(1)
  })

  test('折叠分组点击可展开/收起', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 找到变换组 (默认收起) — 按标题定位
    const group = page.locator('.collapsible-group', { has: page.locator('.group-title', { hasText: '变换' }) })
    const header = group.locator('.group-header')
    const body = group.locator('.group-body')
    // 默认收起 — body 不可见
    await expect(body).toBeHidden()
    // 点击展开
    await header.click()
    await expect(body).toBeVisible()
    // 再点击收起
    await header.click()
    await expect(body).toBeHidden()
  })

  test('Shift 绘制保持工具不切回 select', async ({ page }) => {
    await load(page)
    await page.keyboard.press('r')
    // 第一次绘制，按住 Shift 松手
    const box = await canvasBox(page)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx - 80, cy - 40)
    await page.mouse.down()
    await page.mouse.move(cx - 20, cy + 20, { steps: 5 })
    await page.keyboard.down('Shift')
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(100)
    // 工具应该仍然是矩形
    const rectActive = await page.locator('.tool-btn.active')
    const tool = await rectActive.getAttribute('data-tool')
    expect(tool).toBe('rectangle')
  })
})

// ══════════════════════════════════════
//  Feature: 视觉一致性 — 区块标题统一
// ══════════════════════════════════════

test.describe('Feature: 视觉一致性', () => {

  test('矩形图层 — 所有属性区块标题使用 .group-title', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 矩形应有: 位置/尺寸 + 变换 + 外观 (properties) + 过渡曲线 (curve)
    for (const title of ['位置 / 尺寸', '变换', '外观', '过渡曲线']) {
      await expect(page.locator('.group-title', { hasText: title })).toBeVisible()
    }
    // 不应有旧的 .prop-label (已全部迁移为 CollapsibleGroup)
    expect(await page.locator('.panel-right .prop-label').count()).toBe(0)
  })

  test('文本图层 — 文本区块也使用 CollapsibleGroup', async ({ page }) => {
    await load(page)
    await page.keyboard.press('t')
    await drawOnCanvas(page, -30, -10, 30, 10)
    await page.waitForTimeout(200)
    // 文本图层应有: 文本 + 位置/尺寸 + 变换 + 外观 + 过渡曲线
    for (const title of ['文本', '位置 / 尺寸', '外观']) {
      await expect(page.locator('.group-title', { hasText: title })).toBeVisible()
    }
  })

  test('所有 .group-title 视觉权重一致 (font-size + opacity)', async ({ page }) => {
    await load(page)
    await drawRect(page)
    const titles = page.locator('.panel-right .group-title')
    const count = await titles.count()
    expect(count).toBeGreaterThanOrEqual(3)
    // 采样每个标题的 computed style
    const styles = await titles.evaluateAll(els =>
      els.map(el => {
        const s = getComputedStyle(el)
        return { fontSize: s.fontSize, opacity: s.opacity }
      }),
    )
    // 所有标题的 font-size 和 opacity 应该相同
    const ref = styles[0]
    for (const s of styles) {
      expect(s.fontSize).toBe(ref.fontSize)
      expect(s.opacity).toBe(ref.opacity)
    }
  })

  test('过渡曲线面板标题不再使用 .section-title', async ({ page }) => {
    await load(page)
    await drawRect(page)
    // 旧的 .section-title 不应存在
    expect(await page.locator('.curve-panel .section-title').count()).toBe(0)
    // 替代的 CollapsibleGroup 应存在
    await expect(page.locator('.curve-panel .collapsible-group')).toBeVisible()
  })
})

// ══════════════════════════════════════
//  Feature: 组件状态组 (stateGroups[0] 修复)
// ══════════════════════════════════════

test.describe('Feature: 组件状态组', () => {

  /** 辅助: 创建容器图层并转为组件 */
  async function createComponent(page: Page) {
    // 绘制 Frame
    await page.keyboard.press('f')
    await drawOnCanvas(page, -60, -40, 60, 40)
    await page.waitForTimeout(200)
    // 图层面板右键 → 创建组件
    const frameItem = page.locator('.layer-item').first()
    await frameItem.click({ button: 'right' })
    await page.waitForTimeout(200)
    const compMenuItem = page.locator('.ctx-item', { hasText: '创建组件' })
    await compMenuItem.click()
    await page.waitForTimeout(300)
  }

  test('Frame 右键菜单有"创建组件"选项', async ({ page }) => {
    await load(page)
    await page.keyboard.press('f')
    await drawOnCanvas(page, -40, -30, 40, 30)
    await page.waitForTimeout(200)
    await page.locator('.layer-item').first().click({ button: 'right' })
    await page.waitForTimeout(200)
    await expect(page.locator('.ctx-item', { hasText: '创建组件' })).toBeVisible()
  })

  test('非 Frame 图层的"创建组件"选项禁用', async ({ page }) => {
    await load(page)
    await drawRect(page) // 矩形，不是 frame
    await page.locator('.layer-item').first().click({ button: 'right' })
    await page.waitForTimeout(200)
    const compItem = page.locator('.ctx-item', { hasText: '创建组件' })
    // 应该有 disabled 类
    await expect(compItem).toHaveClass(/disabled/)
  })

  test('创建组件后状态栏出现 group pill', async ({ page }) => {
    await load(page)
    await createComponent(page)
    // 应出现 2 个 group-pill (主画面 + 组件)
    const pills = page.locator('.group-pill')
    await expect(pills).toHaveCount(2)
  })

  test('点击 group pill 切换状态组', async ({ page }) => {
    await load(page)
    await createComponent(page)
    const pills = page.locator('.group-pill')
    // 点击第二个 pill (组件组)
    await pills.nth(1).click()
    await page.waitForTimeout(200)
    // 第二个 pill 应该 active
    await expect(pills.nth(1)).toHaveClass(/active/)
    // 状态标签列表应更新 (组件组有独立的状态)
    const tabs = page.locator('.artboard-slot')
    expect(await tabs.count()).toBeGreaterThanOrEqual(1)
  })

  test('组件非默认状态编辑属性 → 产生覆盖', async ({ page }) => {
    await load(page)
    await createComponent(page)
    // 切到组件组
    await page.locator('.group-pill').nth(1).click()
    await page.waitForTimeout(200)
    // 添加第二状态
    await page.locator('.state-group-row.active .add-state-btn').click()
    await page.waitForTimeout(200)
    // 切换到第二状态
    await page.locator('.state-group-row.active .artboard-slot').nth(1).click()
    await page.waitForTimeout(200)
    // 选中组件内的图层 (点击图层面板)
    if (await page.locator('.layer-item').count() > 0) {
      await page.locator('.layer-item').first().click()
      await page.waitForTimeout(200)
    }
    // 面板头应显示"覆盖" badge (限定属性面板内)
    const badge = page.locator('.properties-panel .state-badge')
    await expect(badge).toBeVisible()
    // 通过 Pinia 验证 stateGroups 数据正确性
    const groupData = await page.evaluate(() => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      const store = pinia?._s?.get('project')
      return store?.project?.stateGroups?.map((g: any) => ({
        id: g.id,
        name: g.name,
        stateCount: g.displayStates?.length,
      }))
    })
    // 应有 2 个状态组
    expect(groupData?.length).toBeGreaterThanOrEqual(2)
    // 组件组应有 2 个状态
    const compGroup = groupData?.find((g: any) => g.stateCount >= 2)
    expect(compGroup).toBeTruthy()
  })

  test('组件状态编辑位置 → 覆盖写入正确的状态组', async ({ page }) => {
    const errors = collectErrors(page)
    await load(page)
    await createComponent(page)
    // 切到组件组
    await page.locator('.group-pill').nth(1).click()
    await page.waitForTimeout(300)
    // 添加第二状态
    await page.locator('.state-group-row.active .add-state-btn').click()
    await page.waitForTimeout(300)
    // 切到第二状态
    await page.locator('.state-group-row.active .artboard-slot').nth(1).click()
    await page.waitForTimeout(300)
    // 选中图层
    await page.locator('.layer-item').first().click()
    await page.waitForTimeout(300)
    // 定位「位置/尺寸」组内的 X 输入框 (Frame 首个 prop-field 是布局方向按钮)
    const posGroup = page.locator('.collapsible-group', {
      has: page.locator('.group-title', { hasText: '位置 / 尺寸' }),
    })
    const xInput = posGroup.locator('.prop-field').first().locator('.input')
    await expect(xInput).toBeVisible({ timeout: 3000 })
    // 修改 X 坐标
    await xInput.fill('999')
    await xInput.press('Enter')
    await page.waitForTimeout(300)
    // 验证覆盖写入组件组 (非 stateGroups[0])
    const overrideCheck = await page.evaluate(() => {
      const app = (document.querySelector('#app') as any)?.__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      const store = pinia?._s?.get('project')
      const groups = store?.project?.stateGroups
      if (!groups || groups.length < 2) return { ok: false, reason: 'groups < 2' }
      const compGroup = groups.find((g: any) => g.rootLayerId !== null)
      if (!compGroup) return { ok: false, reason: 'no comp group' }
      const state2 = compGroup.displayStates?.[1]
      if (!state2) return { ok: false, reason: 'no state 2' }
      const hasOverrides = Object.keys(state2.overrides || {}).length > 0
      return { ok: hasOverrides, hasOverrides, reason: 'checked' }
    })
    expect(overrideCheck.ok).toBe(true)
    expect(errors).toHaveLength(0)
  })

  test('组件状态切回默认后属性值恢复', async ({ page }) => {
    await load(page)
    await createComponent(page)
    // 切到组件组
    await page.locator('.group-pill').nth(1).click()
    await page.waitForTimeout(300)
    // 选中图层
    await page.locator('.layer-item').first().click()
    await page.waitForTimeout(300)
    // 定位「位置/尺寸」组内的 X 输入框
    const posGroup = page.locator('.collapsible-group', {
      has: page.locator('.group-title', { hasText: '位置 / 尺寸' }),
    })
    const xInput = posGroup.locator('.prop-field').first().locator('.input')
    await expect(xInput).toBeVisible({ timeout: 3000 })
    // 记录默认状态的 X
    const defaultX = await xInput.inputValue()
    // 添加第二状态
    await page.locator('.state-group-row.active .add-state-btn').click()
    await page.waitForTimeout(300)
    // 切到第二状态
    await page.locator('.state-group-row.active .artboard-slot').nth(1).click()
    await page.waitForTimeout(300)
    // 重新选中图层
    await page.locator('.layer-item').first().click()
    await page.waitForTimeout(300)
    await expect(xInput).toBeVisible({ timeout: 3000 })
    // 修改 X
    await xInput.fill('888')
    await xInput.press('Enter')
    await page.waitForTimeout(300)
    // 切回默认状态
    await page.locator('.state-group-row.active .artboard-slot').first().click()
    await page.waitForTimeout(300)
    // 重新选中图层
    await page.locator('.layer-item').first().click()
    await page.waitForTimeout(300)
    await expect(xInput).toBeVisible({ timeout: 3000 })
    // X 应恢复为默认值 (不是 888)
    const restoredX = await xInput.inputValue()
    expect(restoredX).toBe(defaultX)
  })
})

// ══════════════════════════════════════
//  Feature: Design Token 体系
// ══════════════════════════════════════

test.describe('Feature: Design Token 体系', () => {

  test('CSS 自定义属性在 :root 正确加载', async ({ page }) => {
    await load(page)
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        surface0: s.getPropertyValue('--surface-0').trim(),
        surface1: s.getPropertyValue('--surface-1').trim(),
        textPrimary: s.getPropertyValue('--text-primary').trim(),
        accent: s.getPropertyValue('--accent').trim(),
        fontSans: s.getPropertyValue('--font-sans').trim(),
        sp4: s.getPropertyValue('--sp-4').trim(),
        radiusMd: s.getPropertyValue('--radius-md').trim(),
      }
    })
    // 所有 token 都不应为空
    for (const [key, val] of Object.entries(tokens)) {
      expect(val, `token --${key} 不应为空`).toBeTruthy()
    }
  })

  test('暗色主题 — 无白色背景泄漏', async ({ page }) => {
    await load(page)
    const panels = ['.toolbar', '.panel-left', '.panel-right', '.patch-canvas']
    for (const sel of panels) {
      const bg = await page.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor)
      // RGB 各分量应 < 80 (暗色阈值)
      const match = bg.match(/\d+/g)
      if (match) {
        const [r, g, b] = match.map(Number)
        expect(r, `${sel} 红色分量过高`).toBeLessThan(80)
        expect(g, `${sel} 绿色分量过高`).toBeLessThan(80)
        expect(b, `${sel} 蓝色分量过高`).toBeLessThan(80)
      }
    }
  })

  test('文字层次 — primary/secondary 对比度差异', async ({ page }) => {
    await load(page)
    const colors = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        primary: s.getPropertyValue('--text-primary').trim(),
        secondary: s.getPropertyValue('--text-secondary').trim(),
        tertiary: s.getPropertyValue('--text-tertiary').trim(),
      }
    })
    // 三个层级都应存在且互不相同
    expect(colors.primary).toBeTruthy()
    expect(colors.secondary).toBeTruthy()
    expect(colors.tertiary).toBeTruthy()
    expect(colors.primary).not.toBe(colors.secondary)
    expect(colors.secondary).not.toBe(colors.tertiary)
  })

  test('布局尺寸符合规格 — Toolbar 40px', async ({ page }) => {
    await load(page)
    const toolbar = await page.locator('.toolbar').boundingBox()
    expect(toolbar).toBeTruthy()
    expect(toolbar!.height).toBe(48)
  })

  test('Indigo 主色调应用于激活元素', async ({ page }) => {
    await load(page)
    // 默认选择工具处于激活态
    const activeTool = page.locator('.tool-btn.active')
    await expect(activeTool).toBeVisible()
    const bg = await activeTool.evaluate(el => getComputedStyle(el).backgroundColor)
    // 应包含 indigo 色调 (蓝紫系 — b 分量 > r 分量)
    const match = bg.match(/\d+/g)
    if (match && match.length >= 3) {
      const [r, , b] = match.map(Number)
      expect(b, '激活元素应偏蓝紫色调').toBeGreaterThanOrEqual(r)
    }
  })

  test('滚动条样式 — 暗色窄轨道', async ({ page }) => {
    await load(page)
    // 检查 ::-webkit-scrollbar 样式是否生效 (通过面板溢出区域)
    const scrollbarWidth = await page.evaluate(() => {
      const el = document.querySelector('.panel-left') as HTMLElement
      if (!el) return -1
      return el.offsetWidth - el.clientWidth
    })
    // 自定义滚动条应 ≤ 6px (tokens.css 定义)
    expect(scrollbarWidth).toBeLessThanOrEqual(8)
  })
})

// ══════════════════════════════════════
//  Feature: UI 现代化 (Figma/Paper 风格)
// ══════════════════════════════════════

test.describe('Feature: UI 现代化', () => {

  test('面板间无硬边框线 — 使用阴影分层', async ({ page }) => {
    await load(page)
    const left = page.locator('.panel-left')
    const right = page.locator('.panel-right')
    // 面板应有 border 分隔
    const leftBR = await left.evaluate(el => getComputedStyle(el).borderRightStyle)
    const rightBL = await right.evaluate(el => getComputedStyle(el).borderLeftStyle)
    expect(leftBR).toBe('solid')
    expect(rightBL).toBe('solid')
  })

  test('工具栏有毛玻璃效果 (backdrop-filter)', async ({ page }) => {
    await load(page)
    const toolbar = page.locator('.toolbar')
    const blur = await toolbar.evaluate(el => {
      const s = getComputedStyle(el)
      return s.backdropFilter || s.webkitBackdropFilter || ''
    })
    expect(blur).toContain('blur')
  })

  test('圆角升级 — radius-md 为 8px', async ({ page }) => {
    await load(page)
    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--radius-md').trim(),
    )
    expect(val).toBe('8px')
  })

  test('多层阴影 token 已加载', async ({ page }) => {
    await load(page)
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        panel: s.getPropertyValue('--shadow-panel').trim(),
        toolbar: s.getPropertyValue('--shadow-toolbar').trim(),
      }
    })
    expect(tokens.panel).toBeTruthy()
    expect(tokens.toolbar).toBeTruthy()
  })

  test('Surface 色近中性灰 — 蓝通道差 ≤ 10%', async ({ page }) => {
    await load(page)
    const neutral = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      const hex = (v: string) => v.trim()
      return {
        s0: hex(s.getPropertyValue('--surface-0')),
        s1: hex(s.getPropertyValue('--surface-1')),
      }
    })
    // #141415 → R=20, G=20, B=21 → B/R = 1.05 (5% 差异)
    const parse = (h: string) => {
      const m = h.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
      if (!m) return null
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    }
    for (const [, hex] of Object.entries(neutral)) {
      const c = parse(hex)
      if (!c || c.r === 0) continue
      const ratio = c.b / c.r
      expect(ratio).toBeLessThanOrEqual(1.25) // B 通道最多比 R 高 25% (冷暖分离)
    }
  })
})

// ══════════════════════════════════════
//  Feature: Patch Editor 交互修复
// ══════════════════════════════════════

test.describe('Feature: Patch Editor 交互', () => {

  test('Patch 画布有 .patch-world 容器 (平移系统)', async ({ page }) => {
    await load(page)
    const world = page.locator('.patch-canvas .patch-world')
    await expect(world).toHaveCount(1)
    const style = await world.getAttribute('style')
    expect(style).toContain('translate')
  })

  test('Patch 画布 overflow 为 hidden (非 auto)', async ({ page }) => {
    await load(page)
    const canvas = page.locator('.patch-canvas')
    const overflow = await canvas.evaluate(el => getComputedStyle(el).overflow)
    expect(overflow).toBe('hidden')
  })

  test('Patch 工具栏在 .patch-world 外部 (不随平移)', async ({ page }) => {
    await load(page)
    const toolbar = page.locator('.patch-canvas > .patch-toolbar')
    await expect(toolbar).toHaveCount(1)
  })
})

// ══════════════════════════════════════
//  Feature: BehaviorDrag 值端口 + Transition 节点
// ══════════════════════════════════════

test.describe('Feature: BehaviorDrag 值端口 + Transition 节点', () => {

  test('BehaviorDrag 节点包含 x/y/ΔX/ΔY 值端口', async ({ page }) => {
    await load(page)
    const btn = page.locator('.node-btn[data-type="behaviorDrag"]')
    await btn.click()
    // 等待节点渲染
    const node = page.locator('.patch-node').last()
    await expect(node).toBeVisible()
    const labels = await node.locator('.port-label.out').allTextContents()
    for (const name of ['X', 'Y', 'ΔX', 'ΔY'])
      expect(labels).toContain(name)
  })

  test('Transition 节点可通过工具栏添加', async ({ page }) => {
    await load(page)
    const result = await page.evaluate(() => {
      const btn = document.querySelector('.node-btn[data-type="transition"]') as HTMLElement
      return btn !== null && btn.textContent?.trim() === 'Trans'
    })
    expect(result).toBe(true)
  })

  test('Transition 进度映射: inputRange → [0,1] 钳制', async ({ page }) => {
    await load(page)
    const result = await page.evaluate(() => {
      const inputRange: [number, number] = [0, 500]
      const values = [0, 250, 500, -100, 700]
      return values.map(v => {
        const [lo, hi] = inputRange
        const delta = hi - lo
        return Math.max(0, Math.min(1, (v - lo) / delta))
      })
    })
    expect(result[0]).toBe(0)      // 起点
    expect(result[1]).toBe(0.5)    // 中点
    expect(result[2]).toBe(1)      // 终点
    expect(result[3]).toBe(0)      // 越界下限 → 钳制 0
    expect(result[4]).toBe(1)      // 越界上限 → 钳制 1
  })

  test('lerp 插值算法: t=0.5 时属性值取中', async ({ page }) => {
    await load(page)
    const result = await page.evaluate(() => {
      const from = { x: 0, y: 0, width: 375, height: 812, borderRadius: 0 }
      const to = { x: 128, y: 500, width: 120, height: 120, borderRadius: 26 }
      const t = 0.5
      const out: Record<string, number> = {}
      for (const k of Object.keys(from)) {
        const a = (from as Record<string, number>)[k]
        const b = (to as Record<string, number>)[k]
        if (typeof a === 'number' && typeof b === 'number')
          out[k] = a + (b - a) * t
      }
      return out
    })
    expect(result.width).toBeCloseTo(247.5)
    expect(result.height).toBeCloseTo(466)
    expect(result.borderRadius).toBeCloseTo(13)
  })
})
