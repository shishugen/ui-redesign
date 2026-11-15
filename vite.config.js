import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 后端代理：与主项目 ui/vite.config.js 保持一致，全部指向真实后台，不使用 mock
// /dev-api  -> 主后端 38080
// /preview  -> 文件预览 3080
// /gpt-api  -> AI 服务 5001
// 注意：原项目还有 /terminal -> 6066（VNC），本项目暂无 VNC 页面，故未配置
//
// 真实后端主机地址**不入库**：在 `.env.local` 里设
//   PROXY_HOST = 'http://<你的后端主机>'
// 未设置时回落 127.0.0.1（代理会连不上，但不会把地址写进仓库）。
// 变量名不带 VITE_ 前缀，确保不会被注入客户端 bundle。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyHost = env.PROXY_HOST || 'http://127.0.0.1'

  return {
    base: './',
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
      host: '0.0.0.0',
      port: 5180,
      proxy: {
        '/dev-api': {
          target: `${proxyHost}:38080`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/dev-api/, '')
        },
        '/preview': {
          target: `${proxyHost}:3080`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/preview/, '')
        },
        '/gpt-api': {
          target: `${proxyHost}:5001/`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/gpt-api/, '')
        }
      }
    }
  }
})
