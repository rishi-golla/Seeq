import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
    onClose: () => ipcInvoke("onClose"),
    onPopupClose: () => ipcInvoke("onPopupClose"),
    onFullScreen: () => ipcInvoke("onFullScreen"),
    onMinimize: () => ipcInvoke("onMinimize"),
    aiQuery: (query: string) => ipcInvoke("aiQuery", { query }),
    createDocument: (prompt: string, documentType: 'excel' | 'word') => ipcInvoke("createDocument", { prompt, documentType }),
    startVoiceRecording: () => ipcInvoke("startVoiceRecording"),
    stopVoiceRecording: () => ipcInvoke("stopVoiceRecording"),
    sendAudioData: (audioData: string) => ipcInvoke("sendAudioData", { audioData }),
    listenAudioReady: (callback: (audioPath: string) => void) => ipcOn("audioReady", callback),
    listenScreenShare: (callback: (data: {
        output: string;
        filePaths: string[];
    }) => void) => ipcOn("onScreenShare", callback),
    listenOnScreenCmdPress: (callback: (data: string) => void) => ipcOn("onScreenCmdPress", callback),
    openWithDefault: (target: string) => ipcInvoke("openWithDefault", { target }),
    startFileDrag: (filePath: string) => ipcRenderer.send("startFileDrag", { filePath }),
    getOperationsLog: () => ipcInvoke("getOperationsLog"),
    getAgentHistory: () => ipcInvoke("getAgentHistory"),
    listenAgentHistoryUpdated: (callback: () => void) => ipcOn("agentHistoryUpdated", callback),
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
