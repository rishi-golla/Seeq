import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
    onClose: () => ipcInvoke("onClose"),
    onPopupClose: () => ipcInvoke("onPopupClose"),
    onFullScreen: () => ipcInvoke("onFullScreen"),
    onMinimize: () => ipcInvoke("onMinimize"),
    aiQuery: (query: string) => ipcInvoke("aiQuery", { query }),
    listenScreenShare: (callback: (data: {
        output: string;
        filePaths: string[];
    }) => void) => ipcOn("onScreenShare", callback),
    listenOnScreenCmdPress: (callback: (data: string) => void) => ipcOn("onScreenCmdPress", callback),
    openWithDefault: (target: string) => ipcInvoke("openWithDefault", { target }),
    startFileDrag: (filePath: string) => ipcRenderer.send("startFileDrag", { filePath }),
} satisfies Window['electron'])

function ipcInvoke<Key extends keyof EventPaylaodMapping>(
    key: Key,
    payload?: EventPaylaodMapping[Key]
): Promise<EventReturnMapping[Key]> {
    return ipcRenderer.invoke(key, payload);
}

function ipcOn<Key extends keyof EventPaylaodMapping>(
    key: Key,
    callback: (payload: EventPaylaodMapping[Key]) => void
) {
    ipcRenderer.on(key, (_, payload) => callback(payload));
}
