import { test, expect } from '@playwright/test'

test('repro: canvas should render immediately after reload (no artificial delay)', async ({ page }) => {
  await page.goto('http://localhost:5180')
  await page.waitForLoadState('networkidle')

  // 1. Draw a rectangle
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

  // 2. Save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(200)

  // 3. Reload and check IMMEDIATELY (no waitForTimeout)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  // Check rendered elements right after DOM is ready
  // Use a tight polling loop instead of artificial delay
  const rendered = page.locator('.artboard-frame [data-layer-id]')
  
  // Take a snapshot of what's rendered at various time points
  const t0 = Date.now()
  let firstRenderTime = -1
  for (let i = 0; i < 20; i++) {
    const count = await rendered.count()
    if (count > 0 && firstRenderTime < 0) {
      firstRenderTime = Date.now() - t0
    }
    if (i < 5) await page.waitForTimeout(10) // check very quickly at first
    else await page.waitForTimeout(50)
  }

  // Check layer panel
  const layers = page.locator('.layer-item')
  const layerCount = await layers.count()
  const renderCount = await rendered.count()
  
  console.log(`Layer panel: ${layerCount} layers`)
  console.log(`Canvas rendered: ${renderCount} elements`)
  console.log(`First render appeared at: ${firstRenderTime}ms after domcontentloaded`)

  // The real test: does the canvas have rendered elements?
  expect(renderCount).toBeGreaterThan(0)
  
  // Also verify the element is actually visible (has dimensions)
  if (renderCount > 0) {
    const elBox = await rendered.first().boundingBox()
    console.log(`Rendered element box: ${JSON.stringify(elBox)}`)
    // A truly rendered element should have non-zero dimensions
    expect(elBox).toBeTruthy()
    expect(elBox!.width).toBeGreaterThan(0)
    expect(elBox!.height).toBeGreaterThan(0)
  }
})
