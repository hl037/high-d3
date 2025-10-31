import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  const isLib = process.env.BUILD_LIB === 'true';
  
  return {
    plugins: [vue(), react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    build: isLib ? {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          'core/index': resolve(__dirname, 'src/core/index.ts'),
          'react/index': resolve(__dirname, 'src/react/index.ts'),
          'vue/index': resolve(__dirname, 'src/vue/index.ts')
        },
        formats: ['es']
      },
      rollupOptions: {
        external: ['vue', 'react', 'react-dom', 'd3', 'mitt']
      }
    } : undefined
  };
});
