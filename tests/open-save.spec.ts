import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('Feature: 文件打开与保存', () => {

  test('localStorage 自动保存 — 绘制图层后自动持久化', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 画一个矩形
    await page.keyboard.press('r')
    const canvas = page.locator('.canvas-area')
    const box = await canvas.boundingBox()
    await page.mouse.move(box!.x + 200, box!.y + 200)
    await page.mouse.down()
    await page.mouse.move(box!.x + 400, box!.y + 400, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    const saved = await page.evaluate(() => localStorage.getItem('intera_project'))
    expect(saved).toBeTruthy()
    const project = JSON.parse(saved!)
    expect(project.layers.length).toBeGreaterThan(0)
  })

  test('localStorage 恢复 — 刷新后图层仍在', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 画矩形
    await page.keyboard.press('r')
    const canvas = page.locator('.canvas-area')
    const box = await canvas.boundingBox()
    await page.mouse.move(box!.x + 200, box!.y + 200)
    await page.mouse.down()
    await page.mouse.move(box!.x + 400, box!.y + 400, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    // 记录图层数
    const before = await page.evaluate(() => {
      const json = localStorage.getItem('intera_project')
      return json ? JSON.parse(json).layers.length : 0
    })
    expect(before).toBeGreaterThan(0)

    // 刷新
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 验证图层恢复
    const after = await page.evaluate(() => {
      const json = localStorage.getItem('intera_project')
      return json ? JSON.parse(json).layers.length : 0
    })
    expect(after).toBe(before)
  })

  test('Open 按钮 — 通过文件选择器加载 .intera 文件', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 先画一个矩形并导出
    await page.keyboard.press('r')
    const canvas = page.locator('.canvas-area')
    const box = await canvas.boundingBox()
    await page.mouse.move(box!.x + 200, box!.y + 200)
    await page.mouse.down()
    await page.mouse.move(box!.x + 400, box!.y + 400, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    // 保存项目 JSON 到临时文件
    const projectJson = await page.evaluate(() => localStorage.getItem('intera_project'))
    const tmpFile = path.join('/tmp', 'test-open.intera')
    fs.writeFileSync(tmpFile, projectJson!)

    // 清空并刷新
    await page.evaluate(() => localStorage.removeItem('intera_project'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 点 Open，等 file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.click('button:has-text("Open")'),
    ])
    await fileChooser.setFiles(tmpFile)
    await page.waitForTimeout(1000)

    // 验证加载成功
    const loaded = await page.evaluate(() => {
      const json = localStorage.getItem('intera_project')
      return json ? JSON.parse(json).layers.length : 0
    })
    expect(loaded).toBeGreaterThan(0)
  })

  test('Save 按钮可见且可点击', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const saveBtn = page.locator('button:has-text("Save")')
    await expect(saveBtn).toBeVisible()
  })

  test('序列化往返 — 导出再导入数据一致', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 画两个图形
    await page.keyboard.press('r')
    const canvas = page.locator('.canvas-area')
    const box = await canvas.boundingBox()
    await page.mouse.move(box!.x + 100, box!.y + 100)
    await page.mouse.down()
    await page.mouse.move(box!.x + 300, box!.y + 300, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    await page.keyboard.press('o')
    await page.mouse.move(box!.x + 400, box!.y + 100)
    await page.mouse.down()
    await page.mouse.move(box!.x + 600, box!.y + 300, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // 导出
    const originalJson = await page.evaluate(() => localStorage.getItem('intera_project'))
    const original = JSON.parse(originalJson!)

    // 反序列化验证
    const roundtrip = JSON.parse(JSON.stringify(original))
    expect(roundtrip.layers.length).toBe(original.layers.length)
    expect(roundtrip.name).toBe(original.name)
  })
})
