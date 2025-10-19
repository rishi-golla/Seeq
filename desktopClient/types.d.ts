type EventPaylaodMapping = { //Different ipc mappings when responding
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
    aiQuery: { query: string };
    startVoiceRecording: void;
    stopVoiceRecording: void;
    sendAudioData: { audioData: string };
    audioReady: string; // The audio file path
    onScreenShare: {
        output: string;
        filePaths: string[];
    };
    onScreenCmdPress: string;
    startFileDrag: { filePath: string };
    openWithDefault: { target: string };
    getOperationsLog: void;
    getAgentHistory: void;
    agentHistoryUpdated: void; // Notify frontend when agent history is updated
}

type EventReturnMapping = { //Different ipc return types
    onClose: void;
    onPopupClose: void;
    onFullScreen: void;
    onMinimize: void;
    aiQuery: string;
    startVoiceRecording: void;
    stopVoiceRecording: void;
    sendAudioData: void;
    audioReady: string; // Path to the audio file
    onScreenShare: {
        output: string;
        filePaths: string[];
    };
    onScreenCmdPress: string;
    startFileDrag: void;
    openWithDefault: void;
    getOperationsLog: {
        timestamp: string;
        operation: string;
        path: string;
    }[];
    getAgentHistory: {
        _id: string;
        description: string;
        filePaths: string[];
        createdAt: string;
        updatedAt: string;
    }[];
    agentHistoryUpdated: void; // Notify frontend when agent history is updated
}

interface Window { //Used in frontend through exposed ipc functions
    electron: {
        onClose: () => void,
        onPopupClose: () => void,
        onFullScreen: () => void,
        onMinimize: () => void,
        aiQuery: (query: string) => Promise<string>,
        startVoiceRecording: () => Promise<void>,
        stopVoiceRecording: () => Promise<void>,
        sendAudioData: (audioData: string) => Promise<void>,
        listenAudioReady: (callback: (audioPath: string) => void) => void,
        listenScreenShare: (callback: (data: {
            output: string;
            filePaths: string[];
        }) => void) => void;
        listenOnScreenCmdPress: (callback: (data: string) => void) => void;
        startFileDrag: (filePath: string) => void;
        openWithDefault: (target: string) => Promise<void>;
        getOperationsLog: () => Promise<{
            timestamp: string;
            operation: string;
            path: string;
        }[]>;
        getAgentHistory: () => Promise<{
            _id: string;
            description: string;
            filePaths: string[];
            createdAt: string;
            updatedAt: string;
        }[]>;
        listenAgentHistoryUpdated: (callback: () => void) => void;
    }
}
