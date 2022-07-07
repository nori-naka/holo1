import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from "fs"

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    sourcemap: true,
  },
  plugins: [vue()],
  server: {
    host: true,
    https: {
      key: fs.readFileSync('./cert/server.key'),
      cert: fs.readFileSync('./cert/server.crt'),
    },
    proxy: {
      '/socket.io': {
        target: 'https://localhost',
        secure: false,
        ws: true,
      },
      "/store": {
        target: 'https://localhost',
        secure: false,
      },
      "/file_list": {
        target: 'https://localhost',
        secure: false,
      }
    }
  },
})