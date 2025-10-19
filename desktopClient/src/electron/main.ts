import { app, BrowserWindow, globalShortcut, nativeImage } from 'electron'
import path from "path";
import { ipcHandle, ipcWebContentSend, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { fileURLToPath } from "url";
import { createTray } from './tray.js';
import { screen } from 'electron';
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileSysAgent } from './fileSysAgent.js';
import fileIndexer from "./fileSysIndexer.js";
import { generateSpeechFile } from './elevelLabs.js';
import { ipcMain } from 'electron/main';
import fs from 'fs';
import { openWithDefaultApp } from './fileSysOperations.js';
import ScreenShareAgent from './fileScreenShareAgent.js';


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
    width: 1200,
    height: 900,
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
      await fileIndexer();
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

  ipcHandle("onFullScreen", async () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    await generateSpeechFile("This is a test of trigger from frontend", './output');
    console.log("Finished processing AI Recording Res")
  })

  ipcHandle("onMinimize", () => {
    mainWindow.minimize();
  })

  ipcHandle("aiQuery", async (payload) => {
    try {
      const result = await fileSysAgent(payload.query);
      await generateSpeechFile(result, './output');
      console.log("Finished processing AI Recording Res")
      return result;
    } catch (error) {
      console.error("Error in AI query handler:", error);
      return "Error processing your request. Please try again.";
    }
  })

  ipcMain.on("startFileDrag", (event, { filePath }) => {
    try {
      const normalizedPath = path.normalize(filePath);
      const ext = path.extname(normalizedPath).toLowerCase();

      let iconFile = "attachment.png";
      if (ext === ".pdf") {
        iconFile = "pdf.png";
      } else if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext)) {
        iconFile = "picture.png";
      }

      const iconPath = path.join(__dirname, "./assets", iconFile);
      const icon = fs.existsSync(iconPath)
        ? nativeImage.createFromPath(iconPath)
        : nativeImage.createEmpty();

      event.sender.startDrag({
        file: normalizedPath,
        icon,
      });

      console.log(`Dragging file: ${normalizedPath} with icon: ${iconFile}`);
    } catch (err) {
      console.error("Error during file drag:", err);
    }
  });

  ipcHandle("openWithDefault", async (payload) => {
    try {
      const target = payload.target;
      await openWithDefaultApp(target);
      return;
    } catch (err) {
      console.error("Error opening with default app:", err);
      return;
    }
  });

  globalShortcut.register('Control+Shift+Q', () => {
    if (popWindow) {
      if (popWindow.isVisible()) {
        popWindow.hide();
      } else {
        popWindow.show();
        ipcWebContentSend("onScreenCmdPress", popWindow.webContents, "Press Ctrl+Shift+Enter to provide relevant files based on screen contents")
      }
      return;
    }
  })

  globalShortcut.register('Control+Shift+A', () => {
    if (!popWindow.isVisible()) return;
    const [x, y] = popWindow.getPosition();
    const newX = Math.max(0, x - 50);
    popWindow.setPosition(newX, y);
  });

  globalShortcut.register('Control+Shift+D', () => {
    if (!popWindow.isVisible()) return;
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const [x, y] = popWindow.getPosition();
    const newX = Math.min(screenWidth - popWindow.getBounds().width, x + 50);
    popWindow.setPosition(newX, y);
  });

  globalShortcut.register('Control+Shift+Enter', async () => {
    if (!popWindow.isVisible()) return;
    ipcWebContentSend("onScreenCmdPress", popWindow.webContents, "Processing Request...")
    const result = await ScreenShareAgent();
    ipcWebContentSend("onScreenShare", popWindow.webContents, result);
  });

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