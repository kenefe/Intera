import { test, expect } from '@playwright/test'

test('repro: trace mount vs loadSaved timing', async ({ page }) => {
  const logs: string[] = []
  page.on('console', msg => {
    if (msg.text().startsWith('[TRACE]')) logs.push(msg.text())
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

  // Verify save worked
  const saved = await page.evaluate(() => {
    const d = localStorage.getItem('intera_project')
    return d ? JSON.parse(d) : null
  })
  expect(saved).toBeTruthy()
  console.log(`Saved: ${Object.keys(saved.layers).length} layers, ${saved.rootLayerIds.length} rootIds`)

  // Now reload and carefully inspect the DOM after various delays
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  // Check at 0ms
  const check = async (label: string) => {
    const info = await page.evaluate(() => {
      const frames = document.querySelectorAll('.artboard-frame')
      const results: Array<{frameIdx: number, childCount: number, layerEls: number, worldExists: boolean}> = []
      frames.forEach((frame, i) => {
        const layerEls = frame.querySelectorAll('[data-layer-id]').length
        // The renderer's world div is the first child of artboard-frame
        const firstChild = frame.firstElementChild as HTMLElement | null
        const worldExists = firstChild !== null && firstChild.style.position === 'relative'
        results.push({
          frameIdx: i,
          childCount: frame.children.length,
          layerEls,
          worldExists,
        })
      })
      return results
    })
    console.log(`[${label}] frames:`, JSON.stringify(info))
    return info
  }

  await check('0ms')
  await page.waitForTimeout(50)
  await check('50ms')
  await page.waitForTimeout(200)
  await check('250ms')
  await page.waitForTimeout(500)
  const final = await check('750ms')

  // Final assertion
  const totalLayers = final.reduce((sum, f) => sum + f.layerEls, 0)
  console.log(`Total rendered layer elements: ${totalLayers}`)
  expect(totalLayers).toBeGreaterThan(0)
})
