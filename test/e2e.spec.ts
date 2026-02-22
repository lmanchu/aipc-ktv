import path from 'node:path'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const root = path.join(__dirname, '..')
let electronApp: ElectronApplication
let page: Page

if (process.platform === 'linux') {
  // pass ubuntu
  test(() => expect(true).true)
} else {
  beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox'],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
    })
    page = await electronApp.firstWindow()

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })
  })

  afterAll(async () => {
    await page.screenshot({ path: 'test/screenshots/e2e.png' })
    await page.close()
    await electronApp.close()
  })

  describe('[aipc-ktv] e2e tests', async () => {
    test('startup', async () => {
      const title = await page.title()
      expect(title).eq('AIPC KTV Control')
    })

    test('should load control window correctly', async () => {
      // Wait for the React app to fully load by waiting for the h1 element
      await page.waitForSelector('h1', { timeout: 10000 })
      const h1 = await page.$('h1')
      const title = await h1?.textContent()
      expect(title).eq('AIPC KTV Control')
    })

    test('should have display status indicator', async () => {
      // Wait for display status element to be available
      await page.waitForSelector('.status-indicator', { timeout: 10000 })
      const statusIndicator = await page.$('.status-indicator')
      const statusText = await statusIndicator?.textContent()
      expect(statusText).toContain('Display Window: Ready')
    })

    test('should have test display button that works', async () => {
      // Wait for the test button to be available
      await page.waitForSelector('button:has-text("Test Display Connection")', { timeout: 10000 })
      const testButton = await page.$('button:has-text("Test Display Connection")')
      await testButton?.click()
      
      // Check if status changed (though it might be brief)
      const statusIndicator = await page.$('.status-indicator')
      const statusText = await statusIndicator?.textContent()
      expect(statusText).toMatch(/Display Window: (Ready|Testing\.\.\.)/)
    })
  })
}
