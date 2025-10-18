import { ipcMain } from "electron";
import type { WebContents } from "electron";
export function isDev(): boolean  {
    return process.env.NODE_ENV === "development";
}

//TypeScript adapters around ipcfunctions (key and callback function to execute when listner is triggered)
export function ipcHandle<Key extends keyof EventPaylaodMapping>(
  key: Key,
  handler: (payload: EventPaylaodMapping[Key]) => any
) {
  ipcMain.handle(key, (_, payload) => handler(payload));
}

export function ipcWebContentSend<Key extends keyof EventPaylaodMapping>( //send payload to render process
  key: Key,
  webContents: WebContents,
  payload: EventPaylaodMapping[Key]
) {
  webContents.send(key, payload);
}
