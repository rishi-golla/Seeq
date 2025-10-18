import { useState } from 'react';
import closeButton from '../../icons/closeButton.svg';
import fullSize from '../../icons/fullsize.svg';
import minimize from '../../icons/minimize.svg'
import SeeqMainIcon from '../../icons/SeeqMainIcon.png'

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
        <nav className='no-highlight h-10 items-center navbar pr-4 pl-2 bg-[#141518] border-b-1 border-white/14 flex justify-between flex-shrink-0'>
          <div>
          <img src={SeeqMainIcon} className='w-8'/>
          </div>
          <div className='flex noDrag gap-4'>
            <button onClick={onMinimize} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={minimize} className='w-5' /></button>
            <button onClick={onSetfull} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={fullSize} className='w-5' /></button>
            <button onClick={onClose} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={closeButton} className='w-4' /></button>
          </div>
        </nav>
        <div className='flex-1 flex bg-[#141518] overflow-hidden'>
          {/* Sidebar */}
          <div className='w-60 bg-[#0F203E] px-2 py-4'>
            <div>
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
                </button>
                <button
                  onClick={() => setActiveTab("AIAgent")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "AIAgent"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "AIAgent" && "opacity-60"}`} />
                </button>
                <button
                  onClick={() => setActiveTab("AIAgent")}
                  className={`flex gap-2 font-semibold text-start px-4 py-2 rounded-lg w-full transition-all cursor-pointer text-sm
                  ${activeTab === "AIAgent"
                      ? "bg-[#224366] text-white shadow-2xl"
                      : "text-[#B4C8DC] hover:bg-[#1E3250] hover:text-[#E6F1FF]"}`}
                >
                  <img src={minimize} className={`w-4 ${activeTab !== "AIAgent" && "opacity-60"}`} />
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