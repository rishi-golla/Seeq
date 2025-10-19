import closeButton from '../../icons/closeButton.svg';
import { useEffect, useState } from 'react';

export default function PopupLayer() {
  const [agentOutput, setAgentOutput] = useState("Press Ctrl+Shift+Enter to provide relevant files based on screen contents");
  const [filePaths, setFilePaths] = useState<string[]>([]);

  const onClose = () => {
    window.electron.onPopupClose();
  }

  const getFileName = (filePath: string) => {
    return filePath.split(/[/\\]/).pop() || filePath;
  };

  useEffect(() => {
    window.electron.listenOnScreenCmdPress((res) => { //get temp response
      setAgentOutput(res);
      setFilePaths(() => []);
    })
    window.electron.listenScreenShare((res) => { //get output
      setAgentOutput(res.output);
      setFilePaths(res.filePaths);
    });
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, filePath: string) => {
    e.preventDefault();
    window.electron.startFileDrag(filePath);
  };

  const handleOpenFile = (filePath: string) => {
    window.electron.openWithDefault(filePath);
  }

  return (
    <div className="flex flex-col bg-black/80 h-screen rounded-xl relative">
      <div className="navbar fixed top-0 left-0 right-0 h-10 flex items-center pt-1 px-4 justify-between rounded-t-xl z-20">
        <div className='flex gap-3 items-center'>
          <h1 className="text-white font-semibold">FileAI Screen Share </h1>
          <div className="flex items-center gap-2 bg-red-500/30 border-2 border-red-500 px-3 py-1 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-red-400 font-bold text-xs tracking-wide">LIVE</span>
          </div>
        </div>

        <div className="noDrag space-x-2 flex items-center">
          <button
            onClick={onClose}
            className="cursor-pointer hover:opacity-55 transition-all"
          >
            <img src={closeButton} className="w-4" />
          </button>
        </div>
      </div>

      <div className="mt-10 flex-shrink-0 h-1/3 mx-4 mb-2 overflow-y-auto hide-scrollbar">
        <div className="text-white break-words whitespace-normal">
          <p className='text-white font-light'>{agentOutput}</p>
        </div>

      </div>
      <div className='border-b-white/40 border-b-1 mx-4 mt-1' />
      {/* Files */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-4">
        <div className="grid grid-cols-3 gap-3 mt-2 content-start">
          {filePaths.length > 0 ? (
            filePaths.map((filePath, i) => {
              const fileName = getFileName(filePath);
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => handleDragStart(e, filePath)}
                  onClick={() => handleOpenFile(filePath)}
                  className="bg-white/10 backdrop-blur-md border select-none border-white/20 text-white text-sm rounded-xl inline-flex items-center py-2 px-4 hover:bg-white/20 transition-all cursor-pointer overflow-hidden"
                >
                  {fileName.length > 14 ? fileName.slice(0, 14) + "..." : fileName}
                </div>
              );
            })
          ) : (
            <p className="text-white/50 text-sm col-span-3 text-center">
              No files found yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
