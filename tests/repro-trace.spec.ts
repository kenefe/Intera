import { test, expect } from '@playwright/test'

test('repro: trace syncLayers timing with instrumented code', async ({ page }) => {
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

  // Save
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(200)

  // Clear traces before reload
  traces.length = 0

  // Reload
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Print all traces in order
  console.log('=== TRACE LOG (after reload) ===')
  for (const t of traces) console.log(t)
  console.log('=== END TRACE ===')

  // Check rendered elements
  const rendered = page.locator('.artboard-frame [data-layer-id]')
  const count = await rendered.count()
  console.log(`Rendered elements: ${count}`)
  expect(count).toBeGreaterThan(0)
})
