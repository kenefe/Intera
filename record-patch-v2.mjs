import { chromium } from '@playwright/test'
import fs from 'node:fs'

const design = fs.readFileSync('/tmp/intera-patch-demo/card-expand-design.json', 'utf8')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: '/tmp/', size: { width: 1440, height: 900 } }
})

await context.addInitScript((data) => {
  localStorage.setItem('intera_project', data)
}, design)

const page = await context.newPage()
await page.goto('http://localhost:5173')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2000)

// Add Patch nodes: Touch → Toggle (so it alternates between states)
const patchResult = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  if (!patchStore || !projectStore) return { error: 'no stores' }

  const p = projectStore.project
  const groupId = p.stateGroups[0]?.id
  const expandedStateId = p.stateGroups[0]?.displayStates?.[1]?.id
  const collapsedStateId = p.stateGroups[0]?.displayStates?.[0]?.id

  // Touch node bound to card layer
  const touchNode = patchStore.addPatchNode('touch', { x: 100, y: 100 }, { layerId: 'layer_card' })
  
  // To node → expand
  const toExpand = patchStore.addPatchNode('to', { x: 350, y: 80 }, { groupId, stateId: expandedStateId })
  
  // To node → collapse
  const toCollapse = patchStore.addPatchNode('to', { x: 350, y: 180 }, { groupId, stateId: collapsedStateId })

  // Connect Touch.Tap → To(expand).In
  patchStore.addConnection(touchNode.id, 'tap', toExpand.id, 'in')
  
  // Connect To(expand).Done → To(collapse) — chain: after expand completes, set up for collapse
  // Actually, for a simple toggle, let's use a different approach:
  // We need a condition or toggle variable
  
  // Better approach: use toggleVariable
  // Add a boolean variable
  const toggleVar = patchStore.addVariable('isExpanded', 'boolean', false)
  
  // Add a toggleVariable node
  const toggleNode = patchStore.addPatchNode('toggleVariable', { x: 250, y: 100 }, { variableId: toggleVar.id })
  
  // Add condition node
  const condNode = patchStore.addPatchNode('condition', { x: 450, y: 100 }, { variableId: toggleVar.id, compareValue: true })
  
  // Remove the direct Touch→To connection, rewire through toggle+condition
  // Clear connections
  p.connections.splice(0, p.connections.length)
  
  // Touch.Tap → ToggleVariable.In
  patchStore.addConnection(touchNode.id, 'tap', toggleNode.id, 'in')
  
  // ToggleVariable.Out → Condition.In
  patchStore.addConnection(toggleNode.id, 'out', condNode.id, 'in')
  
  // Condition.True → To(expand).In
  patchStore.addConnection(condNode.id, 'true', toExpand.id, 'in')
  
  // Condition.False → To(collapse).In
  patchStore.addConnection(condNode.id, 'false', toCollapse.id, 'in')

  projectStore.save()

  return {
    patches: p.patches.map(n => ({ id: n.id, type: n.type, config: n.config })),
    connections: p.connections.length,
    variables: p.variables.length,
  }
})
console.log('Patch setup:', JSON.stringify(patchResult, null, 2))

await page.waitForTimeout(500)

// Check preview panel and card rendering
const previewCheck = await page.evaluate(() => {
  const preview = document.querySelector('.preview-panel')
  if (!preview) return { error: 'no preview' }
  const frame = preview.querySelector('.preview-frame')
  if (!frame) return { error: 'no frame' }
  
  // Check for data-layer-id elements
  const layerEls = frame.querySelectorAll('[data-layer-id]')
  const layers = []
  for (const el of layerEls) {
    const r = el.getBoundingClientRect()
    layers.push({
      id: el.dataset.layerId,
      tag: el.tagName,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      cx: Math.round(r.x + r.width / 2),
      cy: Math.round(r.y + r.height / 2),
    })
  }
  
  const hint = preview.querySelector('.preview-hint')?.textContent?.trim()
  const badge = preview.querySelector('.state-badge')?.textContent?.trim()
  
  return { layers, hint, badge }
})
console.log('Preview check:', JSON.stringify(previewCheck, null, 2))

// Take setup screenshot
await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/v2-setup.png' })

// Now click on the card in the preview to trigger the animation
// The card should have data-layer-id="layer_card"
const cardEl = previewCheck.layers?.find(l => l.id === 'layer_card')
if (!cardEl) {
  console.log('ERROR: Card not found in preview!')
  await browser.close()
  process.exit(1)
}

console.log(`Card at (${cardEl.cx}, ${cardEl.cy}), size ${cardEl.w}x${cardEl.h}`)

// Wait for video to capture the initial state
await page.waitForTimeout(1500)

// Click cycles
for (let i = 0; i < 6; i++) {
  console.log(`\n--- Click ${i + 1} ---`)
  
  // Get current state before click
  const before = await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
    const group = store?.project?.stateGroups?.[0]
    return {
      activeState: group?.activeDisplayStateId,
      stateName: group?.displayStates?.find(s => s.id === group.activeDisplayStateId)?.name,
    }
  })
  console.log('Before:', JSON.stringify(before))
  
  // Find the card's current position (it may have moved due to animation)
  const currentCard = await page.evaluate(() => {
    const preview = document.querySelector('.preview-frame')
    const card = preview?.querySelector('[data-layer-id="layer_card"]')
    if (!card) return null
    const r = card.getBoundingClientRect()
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }
  })
  
  const clickX = currentCard?.cx || cardEl.cx
  const clickY = currentCard?.cy || cardEl.cy
  
  // Click on the card
  await page.mouse.click(clickX, clickY)
  console.log(`Clicked at (${clickX}, ${clickY})`)
  
  // Wait for animation
  await page.waitForTimeout(1200)
  
  // Check state after click
  const after = await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
    const patchStore = app?.config?.globalProperties?.$pinia?._s?.get('patch')
    const group = store?.project?.stateGroups?.[0]
    const vars = store?.project?.variables?.map(v => ({ name: v.name, val: patchStore?.variables?.get(v.id) }))
    return {
      activeState: group?.activeDisplayStateId,
      stateName: group?.displayStates?.find(s => s.id === group.activeDisplayStateId)?.name,
      variables: vars,
    }
  })
  console.log('After:', JSON.stringify(after))
  
  // Take screenshot
  await page.screenshot({ path: `/tmp/intera-patch-demo/screenshots/v2-click-${i + 1}.png` })
}

await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/v2-final.png' })

// Save video
const video = page.video()
await context.close()
const videoPath = await video.path()
fs.copyFileSync(videoPath, '/tmp/intera-demo-patch.webm')
console.log('\nVideo saved: /tmp/intera-demo-patch.webm')
await browser.close()
console.log('Done!')
