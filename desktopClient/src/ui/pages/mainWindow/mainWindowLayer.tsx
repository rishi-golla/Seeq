import { useState } from 'react';
import closeButton from '../../icons/closeButton.svg';
import fullSize from '../../icons/fullsize.svg';
import minimize from '../../icons/minimize.svg'
import AiAgent from './AiAgent';

export default function MainWindowLayer() {
  const onClose = () => {
    window.electron.onClose();
  }

  const onSetfull = () => {
    window.electron.onFullScreen();
  }

  const onMinimize = () => {
    window.electron.onMinimize();
  }

  const [activeTab, setActiveTab] = useState("AIAgent");

  function tabRender() {
    switch (activeTab) {
      case "AIAgent":
        return <AiAgent />
      default:
        return <AiAgent />
    }
  }

  return (
    <>
      <div className="flex flex-col h-screen rounded-xl backdrop-blur-3xl">
        <nav className='no-highlight h-10 items-center navbar px-4 bg-[#0F203E] border-b-1 border-gray-500/50 flex justify-between flex-shrink-0'>
          <h1 className='text-white font-semibold'>Filechemy</h1>
          <div className='flex noDrag gap-4'>
            <button onClick={onMinimize} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={minimize} className='w-5' /></button>
            <button onClick={onSetfull} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={fullSize} className='w-5' /></button>
            <button onClick={onClose} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={closeButton} className='w-4' /></button>
          </div>
        </nav>
        <div className='flex-1 flex bg-[#0A192F] overflow-hidden'>
          {/* Sidebar */}
          <div className='w-60 bg-[#0F203E] px-2 py-4'>
            <div className=''>
              <p className='text-[#B4C8DC] pl-2 text-xs'>Menu</p>
              <div className='flex-1 mt-2 flex-col flex gap-1'>
                <button
                  onClick={() => setActiveTab("AIAgent")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "AIAgent"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "AIAgent" && "opacity-60"}`} />
                  <p>File Intellisense</p>
                </button>
                <button
                  onClick={() => setActiveTab("FileSystem")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "FileSystem"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "FileSystem" && "opacity-60"}`} />
                  <p>File System</p>
                </button>
                <button
                  onClick={() => setActiveTab("History")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "History"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "History" && "opacity-60"}`} />
                  <p>Operation History</p>
                </button>
                <button
                  onClick={() => setActiveTab("Settings")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "Settings"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "Settings" && "opacity-60"}`} />
                  <p>Settings</p>
                </button>
              </div>
            </div>
          </div>
          {/* Render View */}
          <div className='flex-1 flex text-white border-l-1 border-gray-500/50 overflow-hidden'>
            {tabRender()}
          </div>
        </div>
      </div>
    </>
  )
}