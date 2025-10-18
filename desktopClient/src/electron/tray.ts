import { app, BrowserWindow, Menu, Tray } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createTray(mainWindow: BrowserWindow) {
  const tray = new Tray(path.join(
    __dirname, 
    'desktopIconMain.ico'
  ));

  tray.setContextMenu(Menu.buildFromTemplate([
    {
        label: 'Quit',
        click: () => app.quit()
    },
    {
        label: 'Show',
        click: () => mainWindow.show()
    }
  ]))
}