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

// Setup Patch: Touch(card) → Toggle → Condition → To(expand) / To(collapse)
const setup = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  if (!patchStore || !projectStore) return { error: 'no stores' }

  const p = projectStore.project
  const groupId = p.stateGroups[0]?.id
  const expandedStateId = p.stateGroups[0]?.displayStates?.[1]?.id
  const collapsedStateId = p.stateGroups[0]?.displayStates?.[0]?.id

  const touchNode = patchStore.addPatchNode('touch', { x: 100, y: 100 }, { layerId: 'layer_card' })
  const toggleVar = patchStore.addVariable('isExpanded', 'boolean', false)
  const toggleNode = patchStore.addPatchNode('toggleVariable', { x: 250, y: 100 }, { variableId: toggleVar.id })
  const condNode = patchStore.addPatchNode('condition', { x: 400, y: 100 }, { variableId: toggleVar.id, compareValue: true })
  const toExpand = patchStore.addPatchNode('to', { x: 550, y: 80 }, { groupId, stateId: expandedStateId })
  const toCollapse = patchStore.addPatchNode('to', { x: 550, y: 180 }, { groupId, stateId: collapsedStateId })

  patchStore.addConnection(touchNode.id, 'tap', toggleNode.id, 'in')
  patchStore.addConnection(toggleNode.id, 'out', condNode.id, 'in')
  patchStore.addConnection(condNode.id, 'true', toExpand.id, 'in')
  patchStore.addConnection(condNode.id, 'false', toCollapse.id, 'in')

  projectStore.save()

  return { ok: true, touchId: touchNode.id, groupId, expandedStateId, collapsedStateId }
})
console.log('Setup:', JSON.stringify(setup))

// Test 1: Direct fireTrigger to verify Patch chain works
console.log('\n=== Test: Direct fireTrigger ===')
const test1 = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  
  const before = projectStore.project.stateGroups[0]?.activeDisplayStateId
  patchStore.fireTrigger('layer_card', 'tap')
  
  // Small delay for async processing
  return new Promise(resolve => {
    setTimeout(() => {
      const after = projectStore.project.stateGroups[0]?.activeDisplayStateId
      const varVal = patchStore.variables.get(projectStore.project.variables[0]?.id)
      resolve({ before, after, varVal })
    }, 500)
  })
})
console.log('fireTrigger result:', JSON.stringify(test1))

await page.waitForTimeout(1500)

// Test 2: Check what element is at the click coordinates
const clickDebug = await page.evaluate(() => {
  const preview = document.querySelector('.preview-frame')
  const card = preview?.querySelector('[data-layer-id="layer_card"]')
  if (!card) return { error: 'no card element' }
  
  const r = card.getBoundingClientRect()
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  
  // Check what elementFromPoint returns
  const hitEl = document.elementFromPoint(cx, cy)
  const hitLayerId = hitEl?.closest('[data-layer-id]')?.dataset?.layerId
  
  return {
    cardRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    clickAt: { x: Math.round(cx), y: Math.round(cy) },
    hitElement: hitEl?.tagName,
    hitLayerId,
    hitClasses: hitEl?.className,
    pointerEvents: window.getComputedStyle(card).pointerEvents,
    previewFramePointerEvents: window.getComputedStyle(preview).pointerEvents,
  }
})
console.log('Click debug:', JSON.stringify(clickDebug, null, 2))

// Test 3: Fire another trigger to toggle back
const test3 = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  
  patchStore.fireTrigger('layer_card', 'tap')
  
  return new Promise(resolve => {
    setTimeout(() => {
      const state = projectStore.project.stateGroups[0]?.activeDisplayStateId
      const varVal = patchStore.variables.get(projectStore.project.variables[0]?.id)
      resolve({ state, varVal })
    }, 500)
  })
})
console.log('Second fireTrigger:', JSON.stringify(test3))

await page.waitForTimeout(1500)

// Now that we know fireTrigger works, let's do the real click test
// The issue might be that the preview-frame has a CSS transform (scale) that affects hit testing
console.log('\n=== Real click test ===')

// Try clicking with proper coordinates
for (let i = 0; i < 6; i++) {
  // Get fresh card position
  const pos = await page.evaluate(() => {
    const preview = document.querySelector('.preview-frame')
    const card = preview?.querySelector('[data-layer-id="layer_card"]')
    if (!card) return null
    const r = card.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  
  if (!pos) { console.log('No card found'); break }
  
  // Use page.mouse for precise control
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
  await page.waitForTimeout(50)
  await page.mouse.up()
  
  await page.waitForTimeout(1200)
  
  const state = await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
    return store?.project?.stateGroups?.[0]?.activeDisplayStateId
  })
  console.log(`Click ${i+1}: state=${state}`)
}

// If clicks still don't work, fall back to programmatic fireTrigger for the video
console.log('\n=== Recording video with programmatic triggers ===')

// Reset to initial state
await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  const patchStore = pinia?._s?.get('patch')
  const projectStore = pinia?._s?.get('project')
  patchStore.runtime.reset()
  patchStore.variables.reset()
  const group = projectStore.project.stateGroups[0]
  if (group?.displayStates[0]) {
    projectStore.transitionToState(group.id, group.displayStates[0].id)
  }
})
await page.waitForTimeout(1000)

for (let i = 0; i < 6; i++) {
  await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const patchStore = pinia?._s?.get('patch')
    patchStore.fireTrigger('layer_card', 'tap')
  })
  console.log(`Trigger ${i+1}`)
  await page.waitForTimeout(1500)
}

await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/v3-final.png' })

const video = page.video()
await context.close()
const videoPath = await video.path()
fs.copyFileSync(videoPath, '/tmp/intera-demo-patch.webm')
console.log('\nVideo: /tmp/intera-demo-patch.webm')
await browser.close()
