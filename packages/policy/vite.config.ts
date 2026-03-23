import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'], exclude: ['src/test', 'src/**/*.test.ts'] })],
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
      formats: ['es'],
      fileName: (_, name) => `${name}.js`,
    },
    rollupOptions: { external: [/^@muix\//] },
    sourcemap: true,
    minify: false,
  },
});
