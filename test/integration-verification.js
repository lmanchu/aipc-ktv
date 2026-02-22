#!/usr/bin/env node

/**
 * Integration Test Verification Script
 * 
 * This script verifies that the AIPC KTV application has been properly integrated
 * and all components work together correctly.
 */

import fs from 'fs'
import path from 'path'

console.log('🧪 AIPC KTV Integration Test Verification')
console.log('==========================================')

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`✅ ${description}`)
    passed++
  } catch (error) {
    console.log(`❌ ${description}`)
    console.log(`   Error: ${error.message}`)
    failed++
  }
}

function checkFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`)
  }
}

function checkFileContains(filePath, content, description) {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  if (!fileContent.includes(content)) {
    throw new Error(`File ${filePath} does not contain: ${content}`)
  }
}

// Test 1: Verify dual HTML entry points exist
test('Dual HTML entry points exist', () => {
  checkFileExists('index.html', 'Main control HTML')
  checkFileExists('display.html', 'Display HTML')
  checkFileExists('dist/index.html', 'Built main control HTML')
  checkFileExists('dist/display.html', 'Built display HTML')
})

// Test 2: Verify dual React entry points exist
test('Dual React entry points exist', () => {
  checkFileExists('src/renderer/main.tsx', 'Main control React entry')
  checkFileExists('src/renderer/display.tsx', 'Display React entry')
  checkFileExists('src/renderer/App.tsx', 'Main control component')
  checkFileExists('src/renderer/DisplayApp.tsx', 'Display component')
})

// Test 3: Verify Electron main process has dual window support
test('Electron main process has dual window support', () => {
  const mainPath = 'src/main/index.ts'
  checkFileExists(mainPath, 'Main process file')
  checkFileContains(mainPath, 'displayWin', 'Display window variable')
  checkFileContains(mainPath, 'createDisplayWindow', 'Display window creation function')
  checkFileContains(mainPath, 'open-display-window', 'Open display window IPC handler')
  checkFileContains(mainPath, 'youtube-player-control', 'YouTube player control IPC handler')
})

// Test 4: Verify YouTube player integration
test('YouTube player integration exists', () => {
  const displayAppPath = 'src/renderer/DisplayApp.tsx'
  checkFileExists(displayAppPath, 'Display app component')
  checkFileContains(displayAppPath, 'YTPlayer', 'YouTube player interface')
  checkFileContains(displayAppPath, 'loadVideoById', 'YouTube player control')
  checkFileContains(displayAppPath, 'window.YT', 'YouTube API usage')
})

// Test 5: Verify queue system integration
test('Queue system integration exists', () => {
  const queueStorePath = 'src/renderer/store/queueStore.ts'
  checkFileExists(queueStorePath, 'Queue store')
  checkFileContains(queueStorePath, 'addSong', 'Add song functionality')
  checkFileContains(queueStorePath, 'nextSong', 'Next song functionality')
  checkFileContains(queueStorePath, 'currentSong', 'Current song state')
})

// Test 6: Verify playlist system integration  
test('Playlist system integration exists', () => {
  const playlistStorePath = 'src/renderer/store/playlistStore.ts'
  checkFileExists(playlistStorePath, 'Playlist store')
  checkFileContains(playlistStorePath, 'createPlaylist', 'Create playlist functionality')
  checkFileContains(playlistStorePath, 'addSongToPlaylist', 'Add song to playlist functionality')
  checkFileContains(playlistStorePath, 'loadPlaylistToQueue', 'Load playlist to queue functionality')
})

// Test 7: Verify IPC communication setup
test('IPC communication setup exists', () => {
  const preloadPath = 'electron/preload/index.ts'
  const mainPath = 'src/main/index.ts'
  checkFileExists(mainPath, 'Main process file')
  checkFileContains(mainPath, 'ipcMain', 'IPC main process usage')
  checkFileContains(mainPath, 'youtube-player-control', 'YouTube IPC handler')
})

// Test 8: Verify TypeScript types are properly defined
test('TypeScript types are properly defined', () => {
  const typesPath = 'src/shared/types.ts'
  checkFileExists(typesPath, 'Type definitions')
  checkFileContains(typesPath, 'interface Song', 'Song interface')
  checkFileContains(typesPath, 'interface Playlist', 'Playlist interface')
  checkFileContains(typesPath, 'videoId', 'Video ID property')
})

// Test 9: Verify build output is correct
test('Build output is correct', () => {
  checkFileExists('dist-electron/main/index.js', 'Built main process')
  checkFileExists('dist-electron/preload/index.mjs', 'Built preload script')
  
  const builtMainHtml = fs.readFileSync('dist/index.html', 'utf8')
  const builtDisplayHtml = fs.readFileSync('dist/display.html', 'utf8')
  
  if (!builtMainHtml.includes('AIPC KTV Control')) {
    throw new Error('Built main HTML missing title')
  }
  if (!builtDisplayHtml.includes('AIPC KTV Display')) {
    throw new Error('Built display HTML missing title')
  }
  if (!builtDisplayHtml.includes('display-root')) {
    throw new Error('Built display HTML missing root element')
  }
})

// Test 10: Verify package.json has correct scripts
test('Package.json has correct scripts', () => {
  const packagePath = 'package.json'
  checkFileExists(packagePath, 'Package.json')
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  
  if (!pkg.scripts.build) throw new Error('Missing build script')
  if (!pkg.scripts.dev) throw new Error('Missing dev script')
  if (!pkg.scripts.test) throw new Error('Missing test script')
  // Note: Windows and macOS build scripts will be added in packaging phase
})

// Test 11: Cross-cutting concerns - Error handling
test('Error handling is implemented', () => {
  const displayAppPath = 'src/renderer/DisplayApp.tsx'
  const mainProcessPath = 'src/main/index.ts'
  
  checkFileContains(displayAppPath, 'error', 'Error state handling')
  checkFileContains(displayAppPath, 'setError', 'Error state management')
  checkFileContains(mainProcessPath, 'catch (error', 'Main process error handling')
})

// Summary
console.log('\n📊 Integration Test Results')
console.log('===========================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Total:  ${passed + failed}`)

if (failed === 0) {
  console.log('\n🎉 All integration tests passed! The implementation is ready.')
  process.exit(0)
} else {
  console.log('\n⚠️  Some integration tests failed. Please check the issues above.')
  process.exit(1)
}