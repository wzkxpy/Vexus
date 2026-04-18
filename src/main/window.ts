import { BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createWindow() {
  const win = new BrowserWindow({
    width: 1160,
    height: 730,

    autoHideMenuBar: true,   // 隐藏菜单栏
    frame: false,            // 隐藏标题栏
    titleBarStyle: 'hidden', // MacOS 隐藏标题栏

    webPreferences: {
      preload: join(__dirname, '../../dist/preload/index.js'),  // 预加载脚本路径
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false, // 禁用 Node.js 集成
      sandbox: true,          // 启用沙箱模式
    },
  });

  // 根据环境变量判断是加载开发服务器还是本地文件
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // 生产环境加载 dist 目录下的文件
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}