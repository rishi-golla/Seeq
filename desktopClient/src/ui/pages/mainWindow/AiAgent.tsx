import { useEffect, useState } from 'react';
import send from '../../icons/aiAgent/send.svg'
import mainIcon from '../../icons/aiAgent/SeeqFaded.png'

interface Props {
    toggleMenu: boolean;
}

export default function AiAgent({ toggleMenu }: Props) {
    const [inputValue, setInputValue] = useState<string>("");
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai', content: string }>>([
    ]);
    const [menuStatus, setMenuStatus] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const showMessages = messages.length > 0;

    const handleSubmit = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue("");
        setIsLoading(true);
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

        try {
            const response = await window.electron.aiQuery(userMessage);
            setMessages(prev => [...prev, { type: 'ai', content: response }]);
        } catch (error) {
            console.error('Error calling AI agent:', error);
            setMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMenuStatus(!menuStatus)
    }, [toggleMenu])

    return (
        <div className="flex-1 flex">
            {
                menuStatus &&
                <div className="flex flex-col min-w-60 bg-[#1A1B1F]">
                    <h1 className="px-4 pt-2 font-semibold">File Intellisense</h1>
                    <p className="text-xs px-4 text-[#7A7B82]">Complete agent operations record</p>
                </div>
            }

            <div className='flex-1 flex justify-center'>
                <div className="flex flex-col gap-6 w-160 max-h-full">
                    <div className="flex-1 flex px-2 py-4 flex-col min-h-0 overflow-hidden">
                        {showMessages ? (
                            <>
                                <div className='flex flex-col overflow-y-auto my-scroll space-y-4 mt-2 min-h-0'>
                                    {messages.map((message, index) => (
                                        <div key={index}
                                            className={`max-w-[80%] ${message.type === 'user'
                                                ? 'self-end'
                                                : ''
                                                }`}>
                                            <div className={`flex items-center gap-2 mb-2 ${message.type === "user" ? "justify-end" : ""}`}>
                                                {
                                                    message.type === "ai" && (
                                                        <p className='text-sm text-white/60'>9:18 PM</p>
                                                    )
                                                }
                                                <div className={`px-4 py-0.5 text-xs rounded-xl ${message.type === "user" ? "bg-[#1E5EFF]/46 border-2 border-[#7CB3FF]" : "bg-[#00C853]/46 border-2 border-[#8CF4B3]"}`}>{message.type === "user" ? "You" : "Seeq"}</div>
                                                {
                                                    message.type === "user" && (
                                                        <p className='text-sm text-white/60'>9:18 PM</p>
                                                    )
                                                }
                                            </div>
                                            <div
                                                className={`text-white px-3 py-2 rounded-lg w-fit break-words whitespace-pre-wrap ${message.type === 'user'
                                                    ? 'bg-[#212226] self-end'
                                                    : 'bg-[#212226]'
                                                    }`}
                                            >
                                                {message.content}
                                            </div>
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
                                    <img src={mainIcon} className='w-100 no-highlight' />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="px-2 mb-6 flex-shrink-0 w-full">
                        <div className="bg-[#282A2F] rounded-lg flex flex-col px-6 py-4 w-full">
                            {/* Top half — Input field */}
                            <div className="flex-1 flex items-center border-b border-gray-600 pb-2">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="Ask FileAI Something..."
                                    className="text-gray-200 flex-1 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-0"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Bottom half — Buttons */}
                            <div className="flex justify-between items-center pt-2">
                                <div className='flex gap-2'>
                                    <button
                                        onClick={() => setInputValue('')}
                                        className="bg-[#4E5057] px-4 py-1 rounded-xl text-white font-medium hover:bg-gray-600 transition-all"
                                    >
                                        <p className='text-sm'>Clear</p>
                                    </button>
                                    <p className='bg-[#4E5057] px-4 py-1 rounded-xl text-sm text-white/80'>Requests are destructive, be advised</p>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !inputValue.trim()}
                                    className="bg-[#4E5057] p-2 rounded-xl text-white font-medium hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <img src={send} className='w-4' />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
