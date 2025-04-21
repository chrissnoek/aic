// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/gen-commit.ts'],
  format: ['cjs'], 
  outDir: 'dist',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})