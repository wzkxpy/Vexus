import { app } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC } from './ipc';

app.whenReady().then(() => {
  const win = createWindow() // Create the main application window 
  registerWindowIPC(win)  // Register IPC handlers for the window
  registerDBIPC() // Register database-related IPC handlers
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

