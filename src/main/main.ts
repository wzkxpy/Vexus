import { app } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC, registerLaunchIPC, registerScraperIPC } from './ipc';
import { db, initializeDatabase } from './database/index'
import { GameRepository } from './database/game.repo'

app.whenReady().then(() => {
  initializeDatabase()  // Initialize the database and create tables if they don't exist

  const gameRepo = new GameRepository(db) // Create an instance of GameRepository with the database connection

  const win = createWindow() // Create the main application window 

  registerWindowIPC(win)  // Register IPC handlers for the window
  registerDBIPC(gameRepo) // Register database-related IPC handlers
  registerLaunchIPC() // Register IPC handlers for launching games
  registerScraperIPC() // Register IPC handlers for Bangumi API interactions
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

