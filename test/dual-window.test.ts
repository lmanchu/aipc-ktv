import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

describe('Dual Window Architecture', () => {
  const rootDir = process.cwd();

  it('should have dual HTML entry points', () => {
    expect(existsSync(path.join(rootDir, 'index.html'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'display.html'))).toBe(true);
  });

  it('should have dual renderer entry points', () => {
    expect(existsSync(path.join(rootDir, 'src/renderer/main.tsx'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/renderer/display.tsx'))).toBe(true);
  });

  it('should have corresponding React components', () => {
    expect(existsSync(path.join(rootDir, 'src/renderer/App.tsx'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/renderer/DisplayApp.tsx'))).toBe(true);
  });

  it('should have updated main process with dual window management', () => {
    const mainIndexPath = path.join(rootDir, 'src/main/index.ts');
    expect(existsSync(mainIndexPath)).toBe(true);
    
    // Check if main process contains window management code
    const mainContent = require('fs').readFileSync(mainIndexPath, 'utf8');
    expect(mainContent).toContain('controlWindow');
    expect(mainContent).toContain('displayWindow');
    expect(mainContent).toContain('getDisplayConfiguration');
    expect(mainContent).toContain('createControlWindow');
    expect(mainContent).toContain('createDisplayWindow');
  });

  it('should have Vite config supporting multiple entry points', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    expect(existsSync(viteConfigPath)).toBe(true);
    
    const viteContent = require('fs').readFileSync(viteConfigPath, 'utf8');
    expect(viteContent).toContain('main: path.resolve');
    expect(viteContent).toContain('display: path.resolve');
  });

  it('should have proper HTML structure', () => {
    // Check main control HTML
    const indexHtml = require('fs').readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('id="root"');
    expect(indexHtml).toContain('src/renderer/main.tsx');
    
    // Check display HTML
    const displayHtml = require('fs').readFileSync(path.join(rootDir, 'display.html'), 'utf8');
    expect(displayHtml).toContain('id="display-root"');
    expect(displayHtml).toContain('src/renderer/display.tsx');
    expect(displayHtml).toContain('AIPC KTV Display');
  });
});