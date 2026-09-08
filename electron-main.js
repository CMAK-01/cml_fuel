const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "CML Fuel Management System Pro - Compagnie Minière du Littoral",
    icon: path.join(__dirname, 'public/icons/icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.maximize();

  // Load production web application URL or local build
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  win.loadURL(appUrl);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
