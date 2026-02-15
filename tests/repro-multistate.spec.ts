import { test, expect } from '@playwright/test'

test('repro: save with multiple states then reload', async ({ page }) => {
  const traces: string[] = []
  page.on('console', msg => {
    if (msg.text().includes('[TRACE]')) traces.push(msg.text())
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

  // Add a second display state by clicking the "+" button
  const addBtn = page.locator('.add-state-btn')
  await addBtn.click()
  await page.waitForTimeout(300)

  // Verify we now have 2 artboards
  const artboards = page.locator('.artboard-frame')
  await expect(artboards).toHaveCount(2, { timeout: 3000 })

  // Save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(200)

  // Check saved data
  const savedData = await page.evaluate(() => {
    const d = localStorage.getItem('intera_project')
    if (!d) return null
    const p = JSON.parse(d)
    return {
      layers: Object.keys(p.layers).length,
      states: p.stateGroups[0]?.displayStates.map((s: any) => s.id),
    }
  })
  console.log(`Saved: ${JSON.stringify(savedData)}`)

  // Clear traces
  traces.length = 0

  // Reload
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  console.log('=== TRACE LOG ===')
  for (const t of traces) console.log(t)

  // Check: both artboards should have rendered elements
  const renderedEls = page.locator('.artboard-frame [data-layer-id]')
  const count = await renderedEls.count()
  console.log(`Total rendered elements across all artboards: ${count}`)

  // Each artboard should have the layer rendered
  const artboardFrames = page.locator('.artboard-frame')
  const artboardCount = await artboardFrames.count()
  console.log(`Artboard count: ${artboardCount}`)

  for (let i = 0; i < artboardCount; i++) {
    const frame = artboardFrames.nth(i)
    const layerEls = frame.locator('[data-layer-id]')
    const layerCount = await layerEls.count()
    console.log(`Artboard ${i}: ${layerCount} rendered layers`)
  }

  expect(count).toBeGreaterThanOrEqual(artboardCount)
})
