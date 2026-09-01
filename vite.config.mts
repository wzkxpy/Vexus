import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  // 渲染进程的根目录
  root: resolve(__dirname, 'src/renderer'),

  plugins: [
    vue(),
    electron([
      {
        entry: resolve(__dirname, 'src/main/main.ts'),
        vite: {
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src')
            }
          },
          build: {
            outDir: resolve(__dirname, 'dist/main'),
            emptyOutDir: true,
            rollupOptions: {
              external: ['fsevents', 'electron','better-sqlite3','fs', 'path', 'sharp'],
              output: {
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
      {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src')
            }
          },
          build: {
            outDir: resolve(__dirname, 'dist/preload'),
            emptyOutDir: true,
            rollupOptions: {
              external: ['fsevents', 'better-sqlite3', 'path', 'sharp'],
              output: {
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],

  build: {
    // 渲染进程输出路径
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 5273,
  },
})
