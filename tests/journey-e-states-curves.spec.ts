/**
 * Flow E: {states, curves} 画像 — 弹簧卡片
 * 目标: 创建一个卡片，两个状态（收起/展开），调整曲线参数，预览弹簧动画
 */
import { test, expect } from '@playwright/test'

const SHOT_DIR = 'docs/journeys/20260215_1805-states-curves-spring-card/screenshots'

test('Flow E: states+curves 弹簧卡片旅程', async ({ page }) => {
  const frictions: string[] = []
  const log = (msg: string) => { console.log(`[journey] ${msg}`); frictions.push(msg) }

  await page.goto('/')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOT_DIR}/01-initial.png` })
  log('✅ 页面加载完成')

  // Step 1: 画一个矩形作为卡片
  await page.keyboard.press('r')
  const canvas = page.locator('.canvas-viewport')
  const box = await canvas.boundingBox()
  if (!box) { log('❌ 画布不可见'); return }
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx - 80, cy - 50)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 50, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOT_DIR}/02-rect-drawn.png` })

  // 验证图层出现
  const layers = page.locator('.layer-item')
  const layerCount = await layers.count()
  if (layerCount === 0) { log('❌ 摩擦: 绘制矩形后图层面板无图层'); return }
  log('✅ 矩形绘制成功，图层面板显示')

  // Step 2: 修改填充颜色
  const colorInput = page.locator('.prop-row', { hasText: '填充' }).locator('input[type="color"]')
  if (await colorInput.count() > 0) {
    await colorInput.evaluate((el: HTMLInputElement) => { el.value = '#4a90d9'; el.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.waitForTimeout(100)
    log('✅ 填充颜色修改为蓝色')
  } else {
    log('⚠️ 摩擦: 找不到填充颜色输入')
  }

  // Step 3: 添加第二个状态
  const addStateBtn = page.locator('.add-btn, button:has-text("+")').first()
  await addStateBtn.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOT_DIR}/03-state-added.png` })

  const stateTabs = page.locator('.state-tab')
  const stateCount = await stateTabs.count()
  if (stateCount < 2) { log('❌ 摩擦: 点击+后没有新增状态'); return }
  log('✅ 第二个状态已添加')

  // Step 4: 切换到第二个状态
  await stateTabs.nth(1).click()
  await page.waitForTimeout(200)
  const isActive = await stateTabs.nth(1).evaluate(el => el.classList.contains('active'))
  if (!isActive) { log('⚠️ 摩擦: 点击第二个状态标签后未激活') }
  else { log('✅ 切换到第二个状态') }
  await page.screenshot({ path: `${SHOT_DIR}/04-state2-active.png` })

  // Step 5: 在第二个状态修改属性（模拟展开效果）
  // 修改 Y 坐标（上移）
  const yInput = page.locator('.prop-field', { hasText: 'Y' }).locator('.input').first()
  if (await yInput.count() > 0) {
    await yInput.fill('200')
    await yInput.press('Enter')
    await page.waitForTimeout(100)
    log('✅ 第二个状态 Y 坐标修改为 200')
  }

  // 修改尺寸（放大）
  const wInput = page.locator('.prop-field', { hasText: 'W' }).locator('.input').first()
  if (await wInput.count() > 0) {
    await wInput.fill('300')
    await wInput.press('Enter')
    await page.waitForTimeout(100)
  }
  const hInput = page.locator('.prop-field', { hasText: 'H' }).locator('.input').first()
  if (await hInput.count() > 0) {
    await hInput.fill('200')
    await hInput.press('Enter')
    await page.waitForTimeout(100)
  }
  log('✅ 第二个状态尺寸修改为 300x200')

  // 修改透明度
  const opacityInput = page.locator('.prop-field', { hasText: '透明度' }).locator('.input')
  if (await opacityInput.count() > 0) {
    await opacityInput.fill('0.8')
    await opacityInput.press('Enter')
    await page.waitForTimeout(100)
    log('✅ 第二个状态透明度修改为 0.8')
  }

  // 修改圆角
  const radiusInput = page.locator('.prop-field', { hasText: '圆角' }).locator('.input')
  if (await radiusInput.count() > 0) {
    await radiusInput.fill('16')
    await radiusInput.press('Enter')
    await page.waitForTimeout(100)
    log('✅ 第二个状态圆角修改为 16')
  }

  await page.screenshot({ path: `${SHOT_DIR}/05-state2-props.png` })

  // Step 6: 检查曲线面板
  const curvePanel = page.locator('.panel-right', { hasText: '过渡曲线' })
  if (await curvePanel.count() === 0) {
    log('❌ 摩擦: 曲线面板不可见')
  } else {
    log('✅ 曲线面板可见')
  }

  // Step 7: 调整曲线参数 — 响应
  const responseSlider = page.locator('[data-testid="curve-response"]')
  if (await responseSlider.count() > 0) {
    // 用精确输入框
    const responseInput = page.locator('.param-input').first()
    if (await responseInput.count() > 0) {
      await responseInput.fill('0.5')
      await responseInput.press('Enter')
      await page.waitForTimeout(100)
      log('✅ 曲线响应调整为 0.5')
    }
  } else {
    log('⚠️ 摩擦: 找不到曲线响应 slider')
  }

  // Step 8: 调整曲线参数 — 阻尼
  const dampingInput = page.locator('.param-input').nth(1)
  if (await dampingInput.count() > 0) {
    await dampingInput.fill('0.7')
    await dampingInput.press('Enter')
    await page.waitForTimeout(100)
    log('✅ 曲线阻尼调整为 0.7')
  }

  await page.screenshot({ path: `${SHOT_DIR}/06-curves-adjusted.png` })

  // Step 9: 切换回默认状态，观察预览面板
  await stateTabs.first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOT_DIR}/07-back-to-default.png` })
  log('✅ 切换回默认状态')

  // Step 10: 检查预览面板是否有动画（Level 0 自动循环）
  const previewFrame = page.locator('.preview-frame')
  if (await previewFrame.count() > 0) {
    // 等待一个动画周期
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${SHOT_DIR}/08-preview-animation.png` })
    log('✅ 预览面板可见，等待动画循环')
  } else {
    log('❌ 摩擦: 预览面板不可见')
  }

  // Step 11: 在预览面板点击触发交互
  if (await previewFrame.count() > 0) {
    const pfBox = await previewFrame.boundingBox()
    if (pfBox) {
      await page.mouse.click(pfBox.x + pfBox.width / 2, pfBox.y + pfBox.height / 2)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${SHOT_DIR}/09-preview-clicked.png` })
      log('✅ 预览面板点击完成')
    }
  }

  // Step 12: 尝试启用元素覆盖曲线
  const elemOverride = page.locator('text=元素覆盖')
  if (await elemOverride.count() > 0) {
    await elemOverride.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SHOT_DIR}/10-elem-override.png` })
    log('✅ 元素覆盖曲线已启用')
  } else {
    log('⚠️ 摩擦: 找不到元素覆盖选项')
  }

  // Step 13: 调整延迟
  const delayInput = page.locator('.prop-field, .param-row', { hasText: '延迟' }).locator('input[type="number"]')
  if (await delayInput.count() > 0) {
    await delayInput.fill('100')
    await delayInput.press('Enter')
    await page.waitForTimeout(100)
    log('✅ 延迟设置为 100ms')
  }

  await page.screenshot({ path: `${SHOT_DIR}/11-final.png` })

  // 输出摩擦日志
  console.log('\n━━━ 摩擦日志 ━━━')
  for (const f of frictions) console.log(f)
  console.log(`━━━ 共 ${frictions.length} 条 ━━━\n`)
})
