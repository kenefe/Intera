import { test, expect } from '@playwright/test'

test('repro: check syncLayers call count after reload', async ({ page }) => {
  // Inject logging to track syncLayers calls
  await page.goto('http://localhost:5180')
  await page.waitForLoadState('networkidle')

  // Draw a rectangle
  await page.keyboard.press('r')
  await page.waitForTimeout(200)
  const canvas = page.locator('.canvas-area')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas-area not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 120, cy + 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  // Save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(200)

  // Before reload, inject a script that will run early to monitor
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(200)

  // Check: are there rendered elements in the artboard?
  const rendered = page.locator('.artboard-frame [data-layer-id]')
  const count = await rendered.count()
  console.log(`Rendered elements after reload: ${count}`)

  // Check if elements are actually children of artboard-frame's child div
  const domInfo = await page.evaluate(() => {
    const frame = document.querySelector('.artboard-frame')
    if (!frame) return { error: 'no frame' }
    const children = frame.children
    const result: string[] = []
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      result.push(`${child.tagName} class="${child.className}" children=${child.children.length} layerId=${child.dataset.layerId || 'none'}`)
    }
    // Also check nested: the renderer creates a world div inside frame
    const worldDiv = frame.querySelector('div[style*="position:relative"]')
    const worldChildren: string[] = []
    if (worldDiv) {
      for (let i = 0; i < worldDiv.children.length; i++) {
        const c = worldDiv.children[i] as HTMLElement
        worldChildren.push(`layerId=${c.dataset.layerId || 'none'} visible=${c.offsetWidth > 0}`)
      }
    }
    return { frameChildren: result, worldDiv: !!worldDiv, worldChildren }
  })
  console.log('DOM structure:', JSON.stringify(domInfo, null, 2))

  expect(count).toBeGreaterThan(0)
})
