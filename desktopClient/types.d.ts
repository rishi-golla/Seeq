type EventPaylaodMapping = { //Different ipc mappings when responding
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
    aiQuery: { query: string };
    onScreenShare: {
        output: string;
        filePaths: string[];
    };
    onScreenCmdPress: string;
    startFileDrag: { filePath: string };
    openWithDefault: { target: string };
}

type EventReturnMapping = { //Different ipc return types
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
    aiQuery: string;
    onScreenShare: {
        output: string;
        filePaths: string[];
    };
    onScreenCmdPress: string;
    startFileDrag: void;
    openWithDefault: void;
}

interface Window { //Used in frontend through exposed ipc functions
    electron: {
        onClose: () => void,
        onPopupClose: () => void,
        onFullScreen: () => void,
        onMinimize: () => void,
        aiQuery: (query: string) => Promise<string>,
        listenScreenShare: (callback: (data: {
            output: string;
            filePaths: string[];
        }) => void) => void;
        listenOnScreenCmdPress: (callback: (data: string) => void) => void;
        startFileDrag: (filePath: string) => void;
        openWithDefault: (target: string) => Promise<void>;
    }
}
