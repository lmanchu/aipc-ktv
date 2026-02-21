import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

describe('Project Structure', () => {
  const rootDir = process.cwd();

  it('should have the required directory structure', () => {
    // Check src directory structure
    expect(existsSync(path.join(rootDir, 'src'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/main'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/renderer'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/shared'))).toBe(true);
  });

  it('should have main process files', () => {
    expect(existsSync(path.join(rootDir, 'src/main/index.ts'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/main/preload.ts'))).toBe(true);
  });

  it('should have renderer files', () => {
    expect(existsSync(path.join(rootDir, 'src/renderer/main.tsx'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src/renderer/App.tsx'))).toBe(true);
  });

  it('should have configuration files', () => {
    expect(existsSync(path.join(rootDir, 'package.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'vite.config.ts'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.eslintrc.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.prettierrc.json'))).toBe(true);
  });
});