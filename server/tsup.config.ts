import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  // shared exports TypeScript source, so bundle it into the server output
  noExternal: ['@sketch/shared'],
});
