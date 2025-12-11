import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Structure', () => {
  const domains = ['book', 'loan', 'user', 'reservation', 'report'];
  const rootPath = path.resolve(__dirname, '../..');
  const srcPath = path.join(rootPath, 'src');

  it('should have all domain directories', () => {
    domains.forEach((domain) => {
      const domainPath = path.join(srcPath, 'domains', domain);
      expect(fs.existsSync(domainPath)).toBe(true);
    });
  });

  it('should have shared directory', () => {
    const sharedPath = path.join(srcPath, 'shared');
    expect(fs.existsSync(sharedPath)).toBe(true);
  });

  it('should have infrastructure directory', () => {
    const infraPath = path.join(srcPath, 'infrastructure');
    expect(fs.existsSync(infraPath)).toBe(true);
  });

  it('should have index.ts in each domain', () => {
    domains.forEach((domain) => {
      const indexPath = path.join(srcPath, 'domains', domain, 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });
});

describe('Configuration Files', () => {
  const rootPath = path.resolve(__dirname, '../..');

  it('should have tsconfig.json', () => {
    expect(fs.existsSync(path.join(rootPath, 'tsconfig.json'))).toBe(true);
  });

  it('should have docker-compose.yml in .devcontainer', () => {
    expect(fs.existsSync(path.join(rootPath, '.devcontainer/docker-compose.yml'))).toBe(true);
  });

  it('should have ESLint config', () => {
    expect(fs.existsSync(path.join(rootPath, 'eslint.config.mjs'))).toBe(true);
  });

  it('should have Prettier config', () => {
    expect(fs.existsSync(path.join(rootPath, '.prettierrc'))).toBe(true);
  });

  it('should have vitest config', () => {
    expect(fs.existsSync(path.join(rootPath, 'vitest.config.ts'))).toBe(true);
  });
});
