import { chromium } from '@playwright/test'
import fs from 'node:fs'

const design = fs.readFileSync('/tmp/intera-patch-demo/card-expand-design.json', 'utf8')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: '/tmp/', size: { width: 1440, height: 900 } }
})

// Inject localStorage BEFORE page loads
await context.addInitScript((data) => {
  localStorage.setItem('intera_project', data)
}, design)

const page = await context.newPage()
await page.goto('http://localhost:5173')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2000)

// Verify design loaded
const appState = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
  if (!store) return { error: 'no store' }
  const p = store.project
  return {
    layers: Object.keys(p.layers),
    states: p.stateGroups?.[0]?.displayStates?.map(s => ({ id: s.id, name: s.name })),
    groupId: p.stateGroups?.[0]?.id,
  }
})
console.log('App state:', JSON.stringify(appState))

// Add Patch nodes programmatically
const patchResult = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  if (!patchStore || !projectStore) return { error: 'no stores' }

  const p = projectStore.project
  const groupId = p.stateGroups[0]?.id
  const expandedStateId = p.stateGroups[0]?.displayStates?.[1]?.id  // "展开" state
  const collapsedStateId = p.stateGroups[0]?.displayStates?.[0]?.id  // "收起" state

  // Add Touch node - bind to card layer
  const touchNode = patchStore.addPatchNode('touch', { x: 100, y: 100 }, { layerId: 'layer_card' })
  
  // Add To node - target "展开" state
  const toNode = patchStore.addPatchNode('to', { x: 350, y: 100 }, { groupId, stateId: expandedStateId })

  // Add another To node for going back to "收起"
  const toBackNode = patchStore.addPatchNode('to', { x: 350, y: 200 }, { groupId, stateId: collapsedStateId })

  // Connect Touch.Tap → To.In (expand)
  const conn1 = patchStore.addConnection(touchNode.id, 'tap', toNode.id, 'in')

  // Save
  projectStore.save()

  return {
    touchId: touchNode.id,
    toId: toNode.id,
    toBackId: toBackNode.id,
    conn1: conn1?.id,
    groupId,
    expandedStateId,
    collapsedStateId,
    patches: p.patches.length,
    connections: p.connections.length,
  }
})
console.log('Patch result:', JSON.stringify(patchResult))

// Take a screenshot of the setup
await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/patch-setup.png' })
console.log('Setup screenshot saved')

// Now let's check if Preview panel exists and find it
// First, let's look at the preview panel
const previewInfo = await page.evaluate(() => {
  const preview = document.querySelector('.preview-panel')
  if (!preview) return { error: 'no preview panel' }
  const r = preview.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
})
console.log('Preview panel:', JSON.stringify(previewInfo))

// Wait a moment for the UI to settle
await page.waitForTimeout(1000)

// Now record the interaction - click on the preview panel to trigger the card animation
// The preview panel should be on the left side
// Let's find where the card is in the preview

const cardInPreview = await page.evaluate(() => {
  const preview = document.querySelector('.preview-panel')
  if (!preview) return null
  const layers = preview.querySelectorAll('[data-layer-id]')
  const results = []
  for (const el of layers) {
    const r = el.getBoundingClientRect()
    results.push({
      id: el.dataset.layerId,
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      width: Math.round(r.width),
      height: Math.round(r.height),
    })
  }
  return results
})
console.log('Card in preview:', JSON.stringify(cardInPreview))

// Click on the card in the preview to trigger the animation
// The preview panel is typically on the left side
// Let's try clicking in the preview area where the card should be

await page.waitForTimeout(500)

// Do 6 cycles of clicking to trigger expand/collapse
for (let i = 0; i < 6; i++) {
  console.log(`Click cycle ${i + 1}...`)
  
  // Find the card layer in preview
  const cardPos = await page.evaluate(() => {
    const preview = document.querySelector('.preview-panel')
    if (!preview) return null
    // Find the card background layer
    const card = preview.querySelector('[data-layer-id="layer_card"]')
    if (card) {
      const r = card.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    }
    // Fallback: click center of preview
    const r = preview.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  
  if (cardPos) {
    await page.mouse.click(cardPos.x, cardPos.y)
    console.log(`  Clicked at (${cardPos.x}, ${cardPos.y})`)
  } else {
    console.log('  No card found, clicking preview center')
    // Fallback click
    await page.mouse.click(130, 400)
  }
  
  await page.waitForTimeout(1500)
}

await page.waitForTimeout(1000)

// Final screenshot
await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/patch-final.png' })
console.log('Final screenshot saved')

// Close and save video
const video = page.video()
await context.close()
const videoPath = await video.path()
fs.copyFileSync(videoPath, '/tmp/intera-demo-patch.webm')
console.log('Video saved: /tmp/intera-demo-patch.webm')

await browser.close()
console.log('Done!')
