import { chromium } from '@playwright/test'
import fs from 'node:fs'

const design = fs.readFileSync('/tmp/intera-patch-demo/card-expand-design.json', 'utf8')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

// Inject localStorage BEFORE page loads
await context.addInitScript((data) => {
  localStorage.setItem('intera_project', data)
}, design)

const page = await context.newPage()
await page.goto('http://localhost:5173')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1500)

// Verify
const stored = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('intera_project') || '{}')
  return {
    layers: Object.keys(d.layers || {}),
    states: d.stateGroups?.[0]?.displayStates?.map(s => s.name),
    rootLayerIds: d.rootLayerIds
  }
})
console.log('Stored:', JSON.stringify(stored))

// Check what the app actually rendered
const appState = await page.evaluate(() => {
  const app = document.querySelector('#app')?.__vue_app__
  const store = app?.config?.globalProperties?.$pinia?._s?.get('project')
  if (!store) return { error: 'no store' }
  const p = store.project
  return {
    layers: Object.keys(p.layers),
    rootLayerIds: p.rootLayerIds,
    states: p.stateGroups?.[0]?.displayStates?.map(s => s.name)
  }
})
console.log('App state:', JSON.stringify(appState))

await page.screenshot({ path: '/tmp/intera-patch-demo/screenshots/injected.png' })
console.log('Screenshot saved')

// Save storage state for journey-server to use
await context.storageState({ path: '/tmp/intera-storage.json' })

await browser.close()
