import { useState } from 'react';
import closeButton from '../../icons/closeButton.svg';
import fullSize from '../../icons/fullsize.svg';
import minimize from '../../icons/minimize.svg'
import SeeqMainIcon from '../../icons/SeeqMainIcon.png'
import menuToggle from '../../icons/sidePanel/menuToggle.svg'

import home from '../../icons/sidePanel/Home.svg'
import history from '../../icons/sidePanel/history.svg'
import chatbot from '../../icons/sidePanel/chatbot.svg'
import settings from '../../icons/sidePanel/settings.svg'


import AiAgent from './AiAgent';
import Automation from './Automation';
import Opeartions from './Operations';

export default function MainWindowLayer() {
  //Menu toggle switches
  const [menu, setMenu] = useState(false);


  const onClose = () => {
    window.electron.onClose();
  }

  const onSetfull = () => {
    window.electron.onFullScreen();
  }

  const onMinimize = () => {
    window.electron.onMinimize();
  }

  const onMenuToggle = () => {
    setMenu(!menu);
  }

  const [activeTab, setActiveTab] = useState("AIAgent");

  function tabRender() {
    switch (activeTab) {
      case "AIAgent":
        return <AiAgent toggleMenu={menu}/>
      case "chatbot":
        return <Automation/>
      case "history":
        return <Opeartions/>
      default:
        return <AiAgent toggleMenu={menu}/>
    }
  }

  return (
    <>
      <div className="flex flex-col h-screen rounded-xl backdrop-blur-3xl">
        <nav className='no-highlight h-10 items-center navbar pr-4 pl-2 bg-[#141518] border-b-1 border-white/14 flex justify-between flex-shrink-0'>
          <div className='flex noDrag gap-2 items-center'>
            <img src={SeeqMainIcon} className='w-8 object-contain' />
            <button onClick={onMenuToggle} className='cursor-pointer flex items-center justify-center hover:opacity-55 transition-all'>
              <img src={menuToggle} className='w-5 mt-1 object-contain' />
            </button>
          </div>

          <div className='flex noDrag gap-4'>
            <button onClick={onMinimize} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={minimize} className='w-5' /></button>
            <button onClick={onSetfull} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={fullSize} className='w-5' /></button>
            <button onClick={onClose} className='cursor-pointer items-center justify-center hover:opacity-55 transition-all'><img src={closeButton} className='w-4' /></button>
          </div>
        </nav>
        <div className='flex-1 flex bg-[#141518] overflow-hidden'>
          {/* Sidebar */}
          <div className='w-12 bg-[#1A1B1F] flex flex-col justify-between'>
            <div className='flex-1 flex-col flex gap-1'>
              <button
                onClick={() => setActiveTab("AIAgent")}
                className={`border-l-2 flex items-center justify-center py-3 gap-2 font-semibold text-start w-full transition-all cursor-pointer text-sm
                  ${activeTab === "AIAgent"
                    ? "border-white"
                    : "border-white/0 opacity-50"}`}
              >
                <img src={home} className={`w-8 ${activeTab !== "AIAgent" && "opacity-60"}`} />
              </button>
              <button
                onClick={() => setActiveTab("chatbot")}
                className={`border-l-2 flex items-center justify-center py-3 gap-2 font-semibold text-start w-full transition-all cursor-pointer text-sm
                  ${activeTab === "chatbot"
                    ? "border-white"
                    : "border-white/0 opacity-50"}`}
              >
                <img src={chatbot} className={`w-7 ${activeTab !== "chatbot" && "opacity-60"}`} />
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`border-l-2 flex items-center justify-center py-3 gap-2 font-semibold text-start w-full transition-all cursor-pointer text-sm
                  ${activeTab === "history"
                    ? "border-white"
                    : "border-white/0 opacity-50"}`}
              >
                <img src={history} className={`w-7 ${activeTab !== "history" && "opacity-60"}`} />
              </button>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className={`border-l-2 flex items-center justify-center py-3 gap-2 font-semibold text-start w-full transition-all cursor-pointer text-sm
                  ${activeTab === "settings"
                  ? "border-white"
                  : "border-white/0 opacity-50"}`}
            >
              <img src={settings} className={`w-7 ${activeTab !== "settings" && "opacity-60"}`} />
            </button>
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