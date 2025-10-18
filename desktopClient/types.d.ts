type EventPaylaodMapping = { //Different ipc mappings when responding
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
}

type EventReturnMapping = { //Different ipc return types
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
}

interface Window { //Used in frontend through exposed ipc functions
    electron: {
        onClose: () => void,
        onPopupClose: () => void,
        onFullScreen: () => void,
        onMinimize: () => void,
    }
}
