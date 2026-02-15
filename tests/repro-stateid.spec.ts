import { test, expect } from '@playwright/test'

test('repro: check if stateId changes cause Artboard remount', async ({ page }) => {
  const traces: string[] = []
  page.on('console', msg => {
    if (msg.text().includes('[TRACE]')) traces.push(msg.text())
  })

  await page.goto('http://localhost:5180')
  await page.waitForLoadState('networkidle')

  // Check initial state id
  const initialStateId = await page.evaluate(() => {
    const el = document.querySelector('[data-state-id]')
    return el?.getAttribute('data-state-id')
  })
  console.log(`Initial state id: ${initialStateId}`)

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

  // Check saved state id
  const savedData = await page.evaluate(() => {
    const d = localStorage.getItem('intera_project')
    if (!d) return null
    const p = JSON.parse(d)
    return {
      stateIds: p.stateGroups.flatMap((g: any) => g.displayStates.map((s: any) => s.id)),
      activeStateId: p.stateGroups[0]?.activeDisplayStateId,
    }
  })
  console.log(`Saved state ids: ${JSON.stringify(savedData)}`)

  // Clear traces
  traces.length = 0

  // Reload
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Check state id after reload
  const reloadedStateId = await page.evaluate(() => {
    const el = document.querySelector('[data-state-id]')
    return el?.getAttribute('data-state-id')
  })
  console.log(`Reloaded state id: ${reloadedStateId}`)

  console.log('=== TRACE LOG ===')
  for (const t of traces) console.log(t)

  // Key question: did the state id change?
  console.log(`State id changed: ${initialStateId !== reloadedStateId}`)
  console.log(`Initial: ${initialStateId}, Reloaded: ${reloadedStateId}`)
})
