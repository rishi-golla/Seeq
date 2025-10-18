import { app, BrowserWindow } from 'electron'
import path from "path";
import { ipcHandle, ipcWebContentSend, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { fileURLToPath } from "url";
import { createTray } from './tray.js';
import { screen } from 'electron';
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL environment variable is not defined");
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.on('ready', () => {
  mongoose
    .connect(dbUrl)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: any) => console.log("MongoDB Connection failed", err));

  const splash = new BrowserWindow({
    width: 690,
    height: 450,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    icon: path.join(__dirname, 'desktopIconMain.ico')
  });

  splash.loadFile(path.join(__dirname, "splash.html"));
  splash.once("ready-to-show", () => splash?.show());

  const mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    width: 1000,
    height: 700,
    webPreferences: {
      preload: getPreloadPath(),
    },
    icon: path.join(__dirname, 'desktopIconMain.ico')
  });

  const popWindow = new BrowserWindow({
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    transparent: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    width: 500,
    height: 300,
    webPreferences: {
      preload: getPreloadPath()
    },
    icon: path.join(__dirname, 'desktopIconMain.ico')
  });

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 500;
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = 20;

  popWindow.setPosition(x, y);

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123/main')
    popWindow.loadURL('http://localhost:5123/popup')
  } else {
    mainWindow.loadFile(path.join(app.getAppPath() + '/dist-react/index.html'));
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  mainWindow.once("ready-to-show", async () => {
    try {
      await sleep(2000);
      if (splash) {
        splash.close();
      }
      mainWindow.show();
    }
    catch (error) {
      console.error("Error during indexing:", error);
      if (splash) splash.close();
      mainWindow.show();
      
    }
  });

  // Electron handlers
  ipcHandle("onClose", () => {
    mainWindow.close();
  })

  ipcHandle("onPopupClose", () => {
    popWindow.hide();
  })

  ipcHandle("onFullScreen", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  })

  ipcHandle("onMinimize", () => {
    mainWindow.minimize();
  })


  //clsoe dependencies handler
  handleCloseEvents(mainWindow);
  createTray(mainWindow);
})

function handleCloseEvents(mainWindow: BrowserWindow) {
  let willClose = false;

  mainWindow.on("close", (e) => {
    if (willClose) {
      return;
    }
    e.preventDefault();
    mainWindow.hide();
  });

  app.on("before-quit", () => {
    willClose = true;
  });

  mainWindow.on("show", () => {
    willClose = false;
  })
}