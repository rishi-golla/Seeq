import { useState } from 'react';
import settings from '../../icons/settings.svg'
import multiFiles from '../../icons/multiFiles.svg'
import search from '../../icons/search.svg'
import sort from '../../icons/sort.svg'

export default function AiAgent() {
    const [inputValue, setInputValue] = useState<string>("");
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai', content: string }>>([

    ]);
    const [isLoading, setIsLoading] = useState(false);
    const showMessages = messages.length > 0;

    const handleSubmit = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue("");
        setIsLoading(true);
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    };

    return (
        <div className="flex-1 flex justify-center px-2 py-4 overflow-hidden">
            <div className="flex flex-col gap-6 w-160 h-full max-h-full">
                {/* chatmessages/Prompt suggestions */}
                <div className="flex-1 flex px-2 flex-col min-h-0 overflow-hidden">
                    {showMessages ? (
                        <>
                            <div className='flex flex-col overflow-y-auto my-scroll space-y-2 mt-2 min-h-0'>
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`text-white p-3 rounded-lg w-fit break-words whitespace-pre-wrap max-w-full ${message.type === 'user'
                                            ? 'bg-gray-700 self-end'
                                            : 'bg-[#224366]'
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="bg-[#224366] text-white p-3 rounded-lg w-fit">
                                        <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </>
                    ) : (
                        <>
                            <div className="flex-1 flex flex-col gap-1 items-center pt-5">
                                <h1 className='font-semibold text-2xl text-gray-400'>Ask me anything</h1>
                                <h1 className='font-semibold text-2xl '>Can help you with all your file troubles</h1>
                            </div>
                            <div className="flex gap-5 pb-5">
                                <div className="bg-[#224366] flex-1 p-4 space-y-2 rounded-xl shadow-lg border-1 border-[#2f5175]">
                                    <img src={multiFiles} className='w-10 bg-gray-600 p-2 rounded-xl' />
                                    <h1 className="text-gray-100 font-bold">Open up multiple files</h1>
                                    <p className="text-gray-300 text-xs">Quickly open files</p>
                                </div>
                                <div className="bg-[#224366] flex-1 p-4 space-y-2 rounded-xl shadow-lg border-1 border-[#2f5175]">
                                    <img src={search} className='w-10 bg-gray-600 p-2 rounded-xl' />
                                    <h1 className="text-gray-100 font-bold">Search all your folders</h1>
                                    <p className="text-gray-300 text-xs">Find files faster</p>
                                </div>
                                <div className="bg-[#224366] flex-1 p-4 space-y-2 rounded-xl shadow-lg border-1 border-[#2f5175]">
                                    <img src={sort} className='w-10 bg-gray-600 p-2 rounded-xl' />
                                    <h1 className="text-gray-100 font-bold">Sort files automatically</h1>
                                    <p className="text-gray-300 text-xs">Organize files instantly.</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Input field toolbar */}
                <div className="flex gap-2 px-2 flex-shrink-0 w-full">
                    <button className="bg-gray-700 p-2 rounded-full cursor-pointer hover:bg-gray-600 transition-all">
                        <img src={settings} alt="settings" />
                    </button>

                    {/* Match width with cards above */}
                    <div className="flex gap-2 bg-[#224366] rounded-full pl-4 pr-1 items-center flex-1">
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Ask FileAI Something"
                            className="text-gray-200 flex-1 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-0"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-[#568ac2] px-3 py-1 rounded-full text-white font-medium cursor-pointer hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
