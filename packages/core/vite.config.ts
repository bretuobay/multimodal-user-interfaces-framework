import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/test', 'src/**/*.test.ts'],
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        observable: resolve(__dirname, 'src/observable.ts'),
        signal: resolve(__dirname, 'src/signal.ts'),
        channel: resolve(__dirname, 'src/channel.ts'),
        session: resolve(__dirname, 'src/session.ts'),
        action: resolve(__dirname, 'src/action.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [/^@muix\//],
      output: {
        preserveModules: false,
      },
    },
    sourcemap: true,
    minify: false,
  },
});
