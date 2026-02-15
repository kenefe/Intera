import { test, expect } from '@playwright/test'

test('repro: layers should render on canvas after save + reload', async ({ page }) => {
  await page.goto('http://localhost:5180')
  await page.waitForLoadState('networkidle')

  // 1. Press R to activate rectangle tool
  await page.keyboard.press('r')
  await page.waitForTimeout(200)

  // 2. Draw a rectangle on the canvas
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

  // 3. Verify layer panel shows the layer
  const layersBefore = page.locator('.layer-item')
  await expect(layersBefore).toHaveCount(1, { timeout: 3000 })

  // 4. Verify canvas has rendered element (div with data-layer-id)
  const renderedBefore = page.locator('.artboard-frame [data-layer-id]')
  const countBefore = await renderedBefore.count()
  console.log(`Before save: rendered elements = ${countBefore}`)
  expect(countBefore).toBeGreaterThan(0)

  // 5. Ctrl+S to save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(300)

  // 6. Verify localStorage has data
  const lsData = await page.evaluate(() => localStorage.getItem('intera_project'))
  expect(lsData).toBeTruthy()
  const parsed = JSON.parse(lsData!)
  console.log(`localStorage: layers=${Object.keys(parsed.layers).length}, rootLayerIds=${parsed.rootLayerIds.length}`)

  // 7. Reload the page
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // 8. Verify layer panel shows restored layer
  const layersAfter = page.locator('.layer-item')
  await expect(layersAfter).toHaveCount(1, { timeout: 3000 })
  console.log('Layer panel: restored 1 layer ✓')

  // 9. THE BUG: Verify canvas has rendered elements
  const renderedAfter = page.locator('.artboard-frame [data-layer-id]')
  const countAfter = await renderedAfter.count()
  console.log(`After reload: rendered elements = ${countAfter}`)

  // This is the assertion that should fail if the bug exists
  expect(countAfter).toBeGreaterThan(0)
})
