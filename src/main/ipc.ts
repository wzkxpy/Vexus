import { ipcMain, BrowserWindow, IpcMainServiceWorker } from 'electron'
import { addGame, deleteGame, getAllGames } from './db/game.repo'
import { d } from 'vue-router/dist/index-Cu9B0wDz.mjs'


export function registerWindowIPC(win: BrowserWindow) {
  ipcMain.on('window:minimize', () => {
    win.minimize()
  })
  ipcMain.on('window:maximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', () => {
    win.close()
  })
}


export function registerDBIPC() {
  ipcMain.handle('getAllGames', () => getAllGames())
  ipcMain.handle('addGame', (_, game) => addGame(game))
  ipcMain.handle('deleteGame', (_, id: string) => deleteGame(id))
}