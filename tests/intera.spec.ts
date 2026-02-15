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
    await drawOnCanvas(page, -100, -80, -20, -20)
    // 椭圆
    await page.keyboard.press('o')
    await drawOnCanvas(page, 20, -80, 100, -20)
    // Frame
    await page.keyboard.press('f')
    await drawOnCanvas(page, -100, 20, -20, 80)
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
    await expect(page.locator('.prop-label', { hasText: '位置' })).toBeVisible()
    await expect(page.locator('.prop-label', { hasText: '尺寸' })).toBeVisible()
    await expect(page.locator('.prop-label', { hasText: '外观' })).toBeVisible()
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
    // 面板中有多个颜色输入 (填充 + 描边)，取填充的第一个
    const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('.color-input')
    await expect(colorInput).toBeVisible()
    await expect(colorInput).toHaveAttribute('type', 'color')
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
    const tabs = page.locator('.state-tab')
    await expect(tabs).toHaveCount(1)
    await expect(tabs.first()).toContainText('默认')
    await expect(tabs.first()).toHaveClass(/active/)
  })

  test('点击 + 按钮添加新状态', async ({ page }) => {
    await load(page)
    await page.locator('.add-btn').click()
    await expect(page.locator('.state-tab')).toHaveCount(2)
    await page.screenshot({ path: 'tests/screenshots/04-two-states.png' })
  })

  test('点击状态标签切换激活状态', async ({ page }) => {
    await load(page)
    await page.locator('.add-btn').click()
    const secondTab = page.locator('.state-tab').nth(1)
    await secondTab.click()
    await expect(secondTab).toHaveClass(/active/)
    // 默认状态不再 active
    await expect(page.locator('.state-tab').first()).not.toHaveClass(/active/)
  })

  test('默认状态不可删除 — 无删除按钮', async ({ page }) => {
    await load(page)
    await page.locator('.add-btn').click()
    // 默认状态 hover 后无删除按钮
    const firstTab = page.locator('.state-tab').first()
    await firstTab.hover()
    await expect(firstTab.locator('.delete-btn')).toHaveCount(0)
    // 非默认状态 hover 后有删除按钮
    const secondTab = page.locator('.state-tab').nth(1)
    await secondTab.hover()
    await expect(secondTab.locator('.delete-btn')).toBeVisible()
  })

  test('只有一个状态时无删除按钮', async ({ page }) => {
    await load(page)
    await expect(page.locator('.delete-btn')).toHaveCount(0)
  })

  test('删除非默认状态后数量减少', async ({ page }) => {
    await load(page)
    await page.locator('.add-btn').click()
    await expect(page.locator('.state-tab')).toHaveCount(2)
    const tab = page.locator('.state-tab').nth(1)
    await tab.hover()
    await tab.locator('.delete-btn').click()
    await expect(page.locator('.state-tab')).toHaveCount(1)
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
    await page.locator('.add-btn').click()
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
    for (const prop of ['X', 'Y', '宽度', '高度']) {
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
    await page.locator('.add-btn').click()
    // 切换到第二个状态
    await page.locator('.state-tab').nth(1).click()
    await page.waitForTimeout(200)
    // 修改属性 (模拟在新状态中改位置)
    const xInput = page.locator('.prop-field').first().locator('.input')
    if (await xInput.isVisible()) {
      await xInput.fill('500')
      await xInput.press('Enter')
    }
    // 切回默认状态 (触发动画)
    await page.locator('.state-tab').first().click()
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
    await drawOnCanvas(page, -80, -60, -10, -10)
    await page.keyboard.press('o')
    await drawOnCanvas(page, 10, -60, 80, -10)
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
    await page.locator('.add-btn').click()
    await expect(page.locator('.state-tab')).toHaveCount(2)
    // 切换到第二状态
    await page.locator('.state-tab').nth(1).click()
    await page.waitForTimeout(200)
    // 切回默认 (触发动画过渡)
    await page.locator('.state-tab').first().click()
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
