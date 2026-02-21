import { describe, it, expect } from 'vitest';
import packageJson from '../package.json';

describe('Package Dependencies', () => {
  it('should have Electron 28+', () => {
    expect(packageJson.devDependencies.electron).toMatch(/^\^33\./);
  });

  it('should have React 18', () => {
    expect(packageJson.devDependencies.react).toMatch(/^\^18\./);
    expect(packageJson.devDependencies['react-dom']).toMatch(/^\^18\./);
  });

  it('should have required build tools', () => {
    expect(packageJson.devDependencies.vite).toBeDefined();
    expect(packageJson.devDependencies.typescript).toBeDefined();
    expect(packageJson.devDependencies['vite-plugin-electron']).toBeDefined();
  });

  it('should have linting tools', () => {
    expect(packageJson.devDependencies.eslint).toBeDefined();
    expect(packageJson.devDependencies.prettier).toBeDefined();
    expect(packageJson.devDependencies['@typescript-eslint/eslint-plugin']).toBeDefined();
  });

  it('should have required scripts', () => {
    expect(packageJson.scripts.dev).toBeDefined();
    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.typecheck).toBeDefined();
    expect(packageJson.scripts.lint).toBeDefined();
  });
});