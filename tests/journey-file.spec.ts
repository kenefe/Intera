import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'

const SHOTS = 'docs/journeys/20260214_1900-file-open-save/screenshots'

async function load(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function canvasCenter(page: Page) {
  const box = await page.locator('.canvas-area').boundingBox()
  if (!box) throw new Error('no canvas')
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

/** 通过分发 KeyboardEvent 触发应用内的 Ctrl+S 保存 */
async function triggerSave(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's', code: 'KeyS', ctrlKey: true, bubbles: true,
    }))
  })
  await page.waitForTimeout(200)
}

test('旅程: 文件打开与保存', async ({ page }) => {
  // ━━ Step 01: 清空环境，确保干净起点 ━━
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('intera_project'))
  await load(page)
  await page.screenshot({ path: `${SHOTS}/step-01-clean.png` })

  // ━━ Step 02: 绘制 Frame 容器 ━━
  const { cx, cy } = await canvasCenter(page)
  await page.keyboard.press('f')
  await page.mouse.move(cx - 100, cy - 80)
  await page.mouse.down()
  await page.mouse.move(cx + 100, cy + 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-02-frame.png` })

  // ━━ Step 03: 绘制矩形 ━━
  await page.keyboard.press('r')
  await page.mouse.move(cx - 60, cy - 30)
  await page.mouse.down()
  await page.mouse.move(cx + 60, cy + 40, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-03-rect.png` })

  // ━━ Step 04: 重命名容器 ━━
  const frameItem = page.locator('.layer-item .layer-name').first()
  await frameItem.dblclick()
  await page.waitForTimeout(100)
  const renameInput = page.locator('.layer-name-input')
  if (await renameInput.count() > 0) {
    await renameInput.fill('保存测试')
    await renameInput.press('Enter')
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/step-04-renamed.png` })

  // ━━ Step 05: 添加第二个状态 ━━
  await page.locator('.add-btn').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/step-05-states.png` })

  // ━━ Step 06: 保存到 localStorage (通过 dispatchEvent) ━━
  await triggerSave(page)

  const savedRaw = await page.evaluate(() => localStorage.getItem('intera_project'))
  expect(savedRaw).not.toBeNull()
  const saved = JSON.parse(savedRaw!)
  expect(Object.keys(saved.layers).length).toBeGreaterThanOrEqual(2)
  expect(saved.stateGroups[0].displayStates.length).toBe(2)
  await page.screenshot({ path: `${SHOTS}/step-06-saved.png` })

  // ━━ Step 07: 刷新页面 — 验证自动恢复 ━━
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // 图层恢复
  const layerCount = await page.locator('.layer-item').count()
  expect(layerCount).toBeGreaterThanOrEqual(2)

  // 状态恢复
  expect(await page.locator('.state-tab').count()).toBe(2)

  // 名称恢复
  expect(await page.locator('.layer-item .layer-name', { hasText: '保存测试' }).count()).toBe(1)

  await page.screenshot({ path: `${SHOTS}/step-07-restored.png` })

  // ━━ Step 08: 导出设计文件 (存到归档目录) ━━
  const exportData = await page.evaluate(() => localStorage.getItem('intera_project'))
  if (exportData) {
    fs.writeFileSync(`${SHOTS}/../design.intera`, exportData, 'utf-8')
  }

  // ━━ Step 09: 清空 localStorage → 模拟全新环境 ━━
  // beforeunload 会触发自动保存，需要在 unload 后再清一次
  await page.evaluate(() => {
    localStorage.removeItem('intera_project')
    window.addEventListener('beforeunload', () => {
      localStorage.removeItem('intera_project')
    })
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  expect(await page.locator('.layer-item').count()).toBe(0)
  await page.screenshot({ path: `${SHOTS}/step-09-cleared.png` })

  // ━━ Step 10: 注入文件数据 → 模拟"打开文件" ━━
  const fileContent = fs.readFileSync(`${SHOTS}/../design.intera`, 'utf-8')
  // 注入后需防止 beforeunload 的自动保存覆盖注入数据
  await page.evaluate((data) => {
    localStorage.setItem('intera_project', data)
    window.addEventListener('beforeunload', () => {
      localStorage.setItem('intera_project', data)
    })
  }, fileContent)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // 完整验证恢复
  expect(await page.locator('.layer-item').count()).toBeGreaterThanOrEqual(2)
  expect(await page.locator('.state-tab').count()).toBe(2)
  expect(await page.locator('.layer-item .layer-name', { hasText: '保存测试' }).count()).toBe(1)

  await page.screenshot({ path: `${SHOTS}/step-10-imported.png` })
})
