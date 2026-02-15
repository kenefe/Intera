import { test, expect } from '@playwright/test'

test('repro: inject tracing to catch syncLayers timing', async ({ page }) => {
  // Add route interception to inject tracing code
  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    if (text.startsWith('[TRACE]')) logs.push(text)
  })

  await page.goto('http://localhost:5180')
  await page.waitForLoadState('networkidle')

  // Draw a rectangle
  await page.keyboard.press('r')
  await page.waitForTimeout(200)
  const canvas = page.locator('.canvas-area')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas-area not found')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  // Save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(200)

  // Verify save
  const saved = await page.evaluate(() => localStorage.getItem('intera_project'))
  expect(saved).toBeTruthy()

  // Reload
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Deep inspect: check if layer divs exist but are orphaned (not in DOM tree)
  const domAnalysis = await page.evaluate(() => {
    const frames = document.querySelectorAll('.artboard-frame')
    const result: Record<string, unknown> = { frameCount: frames.length }

    if (frames.length > 0) {
      const frame = frames[0]
      // Walk all descendants
      const allDivs = frame.querySelectorAll('div')
      const layerDivs = frame.querySelectorAll('[data-layer-id]')
      result.totalDivs = allDivs.length
      result.layerDivs = layerDivs.length

      // Check the renderer's world div
      const children = Array.from(frame.children)
      result.directChildren = children.map(c => ({
        tag: c.tagName,
        style: (c as HTMLElement).style.cssText.substring(0, 100),
        childCount: c.children.length,
        hasLayerChildren: c.querySelectorAll('[data-layer-id]').length,
      }))
    }

    // Also check layer panel
    const layerItems = document.querySelectorAll('.layer-item')
    result.layerPanelCount = layerItems.length

    return result
  })

  console.log('DOM Analysis:', JSON.stringify(domAnalysis, null, 2))

  // The key assertion
  expect(domAnalysis.layerDivs).toBeGreaterThan(0)
})
