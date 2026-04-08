import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/main/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              external: [
                "electron",
                "better-sqlite3",
                "fluent-ffmpeg",
                "@ffmpeg-installer/ffmpeg",
                "ffprobe-static",
                "electron-updater",
                "electron-log",
              ],
            },
          },
        },
        onstart(options) {
          // VS Code 会设置 ELECTRON_RUN_AS_NODE=1，导致 Electron 以 Node.js 模式运行
          // 必须删除此变量，否则 process.type 为 undefined，require('electron') 返回字符串路径
          delete process.env.ELECTRON_RUN_AS_NODE;
          if (process.env.VSCODE_DEBUG) {
            console.log("[startup] Electron App");
          } else {
            options.startup();
          }
        },
      },
      {
        entry: "src/preload/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/preload",
          },
        },
        onstart(options) {
          // 通知渲染进程重新加载
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@main": path.resolve(__dirname, "src/main"),
      "@renderer": path.resolve(__dirname, "src/renderer"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
  },
  // 渲染进程构建输出到 dist-electron/renderer
  build: {
    outDir: "dist-electron/renderer",
    emptyOutDir: true,
  },
});
