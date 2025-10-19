import { useEffect, useState, useRef } from 'react';
import send from '../../icons/aiAgent/send.svg';
import mainIcon from '../../icons/SeeqMouthOpenTranslucent.png';
import voiceAgent from '../../icons/aiAgent/voiceMode.svg'
import seeqTalkingGif from '../../icons/SeeqTalking.gif';
import seeqMouthClosed from '../../icons/SeeqMouthClosed.png';
import seeqThinking from '../../icons/SeeqThinking.png';

interface Props {
    toggleMenu: boolean;
}

export default function AiAgent({ toggleMenu }: Props) {
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai'; content: string }>>([]);
    const [menuStatus, setMenuStatus] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const showMessages = messages.length > 0;
    const [voiceMode, setVoiceMode] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [responseAudioPath, setResponseAudioPath] = useState<string | null>(null);
    const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
    
    // Audio recording references
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const silenceDetectionRef = useRef<{
        timer: NodeJS.Timeout | null;
        counter: number;
        threshold: number;
        maxSilence: number;
    }>({
        timer: null,
        counter: 0,
        threshold: -50, // dB threshold for silence
        maxSilence: 8, // Stop after 4 seconds of silence (8 * 500ms)
    });

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSubmit = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        
        setIsLoading(true);
        setMessages((prev) => [...prev, { type: 'user', content: userMessage }]);

        try {
            const response = await window.electron.aiQuery(userMessage);
            setMessages((prev) => [...prev, { type: 'ai', content: response }]);
        } catch (error) {
            console.error('Error calling AI agent:', error);
            setMessages((prev) => [
                ...prev,
                { type: 'ai', content: 'Sorry, I encountered an error processing your request.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to detect silence in audio
    const detectSilence = () => {
        if (!analyserRef.current || !isRecording) return;
        
        const dataArray = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const amplitude of dataArray) {
            sum += Math.abs(amplitude - 128);
        }
        const average = sum / dataArray.length;
        const dB = 20 * Math.log10(average / 128);
        if (dB < silenceDetectionRef.current.threshold) {
            silenceDetectionRef.current.counter++;
            console.log(`Silence detected: ${silenceDetectionRef.current.counter} / ${silenceDetectionRef.current.maxSilence}`);
            if (silenceDetectionRef.current.counter >= silenceDetectionRef.current.maxSilence) {
                console.log('Extended silence detected, stopping recording');
                stopRecording();
            }
        } else {
            silenceDetectionRef.current.counter = 0;
        }
    };
    
    const startRecording = async () => {
        try {
            setIsRecording(true);
            silenceDetectionRef.current.counter = 0;
            await window.electron.startVoiceRecording();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            
            const analyser = audioContext.createAnalyser();
            analyserRef.current = analyser;
            analyser.fftSize = 1024;
            
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.start(500);
            
            silenceDetectionRef.current.timer = setInterval(detectSilence, 500);
            
            console.log('Recording started with silence detection');
        } catch (error) {
            console.error('Error starting recording:', error);
            setIsRecording(false);
            
            if (silenceDetectionRef.current.timer) {
                clearInterval(silenceDetectionRef.current.timer);
                silenceDetectionRef.current.timer = null;
            }
        }
    };

    const stopRecording = async () => {
        try {
            if (silenceDetectionRef.current.timer) {
                clearInterval(silenceDetectionRef.current.timer);
                silenceDetectionRef.current.timer = null;
            }
            
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                console.log('No active recording to stop');
                setIsRecording(false);
                return;
            }
            
            mediaRecorderRef.current.stop();
            
            const recordingStopped = new Promise<void>((resolve) => {
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.onstop = () => {
                        resolve();
                    };
                } else {
                    resolve();
                }
            });
            
            await recordingStopped;
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            
            if (audioContextRef.current) {
                await audioContextRef.current.close();
                audioContextRef.current = null;
                analyserRef.current = null;
            }
        
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            setIsRecording(false);
            setIsProcessing(true); // Show processing state (red dot)
            setHasPlayedAudio(false); // Reset the flag for new recording
            
            console.log('Sending audio data to main process...');
            await window.electron.sendAudioData(base64Audio);
            await window.electron.stopVoiceRecording();
            
            console.log('Audio data sent, waiting for processing to complete...');
            
            // Start polling for the output.mp3 file
            const startPolling = async () => {
                console.log('Starting to poll for output.mp3 file...');
                
                // We'll use the fetch API to check if the file exists and has content
                const checkFile = async (): Promise<boolean> => {
                    try {
                        // Try multiple paths that might work
                        const pathsToCheck = [
                            'output/output.mp3',
                            '../../output/output.mp3',
                            './output/output.mp3'
                        ];
                        
                        for (const path of pathsToCheck) {
                            try {
                                // Add cache busting to prevent getting cached responses
                                const response = await fetch(`${path}?cb=${Date.now()}`, { 
                                    method: 'HEAD',
                                    cache: 'no-store'
                                });
                                
                                if (response.ok) {
                                    // Check if the file has content
                                    const contentLength = response.headers.get('content-length');
                                    const hasContent = contentLength && parseInt(contentLength) > 0;
                                    
                                    if (hasContent) {
                                        console.log(`Found valid output.mp3 at ${path} with size ${contentLength} bytes`);
                                        return true;
                                    }
                                }
                            } catch (e) {
                                console.log(`Error checking ${path}:`, e);
                                // Continue to next path
                            }
                        }
                        
                        // If we get here, none of the paths worked
                        return false;
                    } catch (error) {
                        console.error('Error checking for output.mp3:', error);
                        return false;
                    }
                };
                
                // Poll until file exists or timeout
                let attempts = 0;
                const maxAttempts = 20; // Try for about 10 seconds (20 * 500ms)
                
                const poll = async () => {
                    if (attempts >= maxAttempts) {
                        console.log('Polling timed out, file not found');
                        // Fall back to the IPC event
                        return;
                    }
                    
                    attempts++;
                    console.log(`Polling attempt ${attempts}/${maxAttempts}`);
                    
                    const exists = await checkFile();
                    if (exists && !hasPlayedAudio) {
                        console.log('Output file found via polling!');
                        setHasPlayedAudio(true); // Mark that we're about to play audio
                        
                        // File exists, play it
                        const timestamp = Date.now();
                        const audioPath = `../../output/output.mp3?t=${timestamp}`;
                        
                        // Clean up previous audio element
                        if (audioPlayerRef.current) {
                            audioPlayerRef.current.pause();
                            audioPlayerRef.current.src = '';
                            audioPlayerRef.current.load();
                            audioPlayerRef.current = null;
                        }
                        
                        setResponseAudioPath(audioPath);
                        setIsProcessing(false);
                        
                        setTimeout(() => {
                            playResponseAudio();
                        }, 300);
                        
                        return;
                    }
                    
                    // Try again after a delay
                    setTimeout(poll, 500);
                };
                
                // Start polling
                poll();
            };
            
            // Start polling after a short delay to allow processing to begin
            setTimeout(startPolling, 1000);
            
        } catch (error) {
            console.error('Error stopping recording:', error);
            setIsRecording(false);
            
            if (silenceDetectionRef.current.timer) {
                clearInterval(silenceDetectionRef.current.timer);
                silenceDetectionRef.current.timer = null;
            }
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            
            if (audioContextRef.current) {
                try {
                    await audioContextRef.current.close();
                } catch (e) {
                    console.error('Error closing audio context:', e);
                }
                audioContextRef.current = null;
                analyserRef.current = null;
            }
        }
    };

    // Handle audio playback
    const playResponseAudio = () => {
        if (!responseAudioPath) {
            console.error('No audio path available for playback');
            return;
        }
        
        // Always create a new audio element to avoid caching issues
        if (audioPlayerRef.current) {
            // Clean up previous audio element
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = '';
            audioPlayerRef.current.load();
            audioPlayerRef.current = null;
        }
        
        // Create a fresh audio element
        audioPlayerRef.current = new Audio();
        
        // Set up event listeners
        audioPlayerRef.current.onplay = () => {
            console.log('Audio playback started');
            setIsPlaying(true);
        };
        audioPlayerRef.current.onended = () => {
            console.log('Audio playback ended');
            setIsPlaying(false);
            setHasPlayedAudio(false); // Reset the flag for next recording
            // Allow recording again after audio finishes playing
            setVoiceMode(true);
            
            // Clean up to prevent memory leaks
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = '';
                audioPlayerRef.current.load();
            }
        };
        audioPlayerRef.current.onerror = (e) => {
            console.error('Error playing audio:', e);
            setIsPlaying(false);
            setHasPlayedAudio(false); // Reset the flag on error
            setVoiceMode(true);
        };
        
        // Try multiple audio path formats to ensure playback works
        const tryPlayAudio = async () => {
            // First, check if we need to wait for the file to be fully written
            if (responseAudioPath && responseAudioPath.startsWith('file://')) {
                console.log('Waiting to ensure audio file is fully written...');
                // Add a small delay to ensure the file is fully written
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Add a timestamp to prevent caching
            const timestamp = Date.now();
            console.log(`Using cache-busting timestamp: ${timestamp}`);
            
            // Helper function to add cache busting to a path
            const addCacheBusting = (path: string): string => {
                // Only add cache busting to non-file:// URLs
                if (!path.startsWith('file://')) {
                    const separator = path.includes('?') ? '&' : '?';
                    return `${path}${separator}t=${timestamp}`;
                }
                return path;
            };
            
            const pathsToTry = [
                // 1. Direct path from main process (absolute path)
                responseAudioPath ? addCacheBusting(responseAudioPath) : null,
                
                // 2. Absolute path with file protocol
                responseAudioPath?.startsWith('file://') 
                    ? responseAudioPath 
                    : responseAudioPath ? `file://${responseAudioPath.replace(/\\/g, '/')}` : null,
                
                // 3. Relative path from renderer with cache busting
                addCacheBusting("../../output/output.mp3"),
                
                // 4. File protocol with relative path
                `file://${window.location.origin}/output/output.mp3`,
                
                // 5. Direct output folder path with cache busting
                addCacheBusting("output/output.mp3"),
            ].filter(Boolean);
            
            console.log('Will try these audio paths:', pathsToTry);
            
            // Function to check if an audio file is valid
            const validateAudioFile = (path: string): Promise<boolean> => {
                return new Promise((resolve) => {
                    console.log(`Validating audio file: ${path}`);
                    
                    // First try fetch to check if file exists and has content
                    if (!path.startsWith('file://')) {
                        fetch(path, { method: 'HEAD', cache: 'no-store' })
                            .then(response => {
                                if (response.ok) {
                                    const contentLength = response.headers.get('content-length');
                                    const hasContent = contentLength && parseInt(contentLength) > 0;
                                    
                                    if (hasContent) {
                                        console.log(`Fetch validation successful: ${path} (${contentLength} bytes)`);
                                        // File exists and has content, now check if it's playable
                                        checkPlayable();
                                        return;
                                    }
                                }
                                console.log(`Fetch validation failed: ${path}`);
                                checkPlayable(); // Still try audio element validation
                            })
                            .catch(error => {
                                console.log(`Fetch validation error: ${path}`, error);
                                checkPlayable(); // Still try audio element validation
                            });
                    } else {
                        // For file:// URLs, skip fetch and go straight to audio element
                        checkPlayable();
                    }
                    
                    // Function to check if the audio is playable
                    function checkPlayable() {
                        // Create a temporary audio element to test the file
                        const tempAudio = new Audio();
                        
                        // Set up event handlers
                        tempAudio.onloadedmetadata = () => {
                            if (tempAudio.duration > 0) {
                                clearTimeout(timeout);
                                console.log(`Audio file validated (duration: ${tempAudio.duration}s): ${path}`);
                                resolve(true);
                                tempAudio.src = '';
                                tempAudio.remove();
                            } else {
                                console.log(`Audio file has zero duration: ${path}`);
                                resolve(false);
                                tempAudio.src = '';
                                tempAudio.remove();
                            }
                        };
                        
                        tempAudio.oncanplaythrough = () => {
                            clearTimeout(timeout);
                            console.log(`Audio file can play through: ${path}`);
                            resolve(true);
                            tempAudio.src = '';
                            tempAudio.remove();
                        };
                        
                        tempAudio.onerror = (e) => {
                            clearTimeout(timeout);
                            console.log(`Audio file validation failed: ${path}`, e);
                            resolve(false);
                            tempAudio.src = '';
                            tempAudio.remove();
                        };
                        
                        // Set a timeout in case the file is inaccessible
                        const timeout = setTimeout(() => {
                            console.log(`Audio file validation timed out: ${path}`);
                            resolve(false);
                            tempAudio.src = '';
                            tempAudio.remove();
                        }, 3000);
                        
                        // Start loading the file
                        console.log(`Starting to load audio file: ${path}`);
                        tempAudio.src = path;
                        tempAudio.load();
                    }
                });
            };
            
            // Try each path in sequence
            for (const pathToTry of pathsToTry) {
                // Skip null paths
                if (!pathToTry) continue;
                
                // Use a non-null path
                const path: string = pathToTry;
                
                try {
                    console.log(`Trying audio path: ${path}`);
                    
                    // For direct file access, use fetch to check if file exists
                    if (!path.startsWith('file://') && !path.includes('://')) {
                        try {
                            const response = await fetch(path, { method: 'HEAD' });
                            if (!response.ok) {
                                console.log(`Path not accessible via fetch: ${path}`);
                                continue;
                            }
                        } catch (e) {
                            console.log(`Fetch check failed for path: ${path}`);
                            // Continue anyway as the Audio API might still work
                        }
                    }
                    
                    // Validate the audio file before playing
                    const isValid = await validateAudioFile(path);
                    if (!isValid) {
                        console.log(`Skipping invalid audio file: ${path}`);
                        continue;
                    }
                    
                    // Play the audio file with cache control settings
                    audioPlayerRef.current!.src = path;
                    
                    // Set cache control attributes
                    if ('crossOrigin' in audioPlayerRef.current!) {
                        audioPlayerRef.current!.crossOrigin = 'anonymous';
                    }
                    
                    // Force reload of the audio element
                    audioPlayerRef.current!.load();
                    
                    // Play the audio
                    await audioPlayerRef.current!.play();
                    console.log(`Successfully playing audio from: ${path}`);
                    return; // Success!
                } catch (error) {
                    console.error(`Failed to play audio from path: ${path}`, error);
                    // Continue to next path
                }
            }
            
            // If we get here, all paths failed
            console.error('All audio playback attempts failed');
            setIsPlaying(false);
            setVoiceMode(true);
            
            // As a last resort, try to open the file with the default app
            try {
                window.electron.openWithDefault('output/output.mp3');
            } catch (error) {
                console.error('Failed to open audio with default app:', error);
            }
        };
        
        tryPlayAudio();
    };
    
    // Listen for audio ready events from the main process
    useEffect(() => {
        const handleAudioReady = (audioPath: string) => {
            console.log('Audio ready from main process:', audioPath);
            
            // Only proceed if we're still in processing state and haven't played audio yet
            if (!isProcessing || hasPlayedAudio) {
                console.log('Ignoring audioReady event - already processed or played audio');
                return;
            }
            
            console.log('Using audio path from main process:', audioPath);
            setHasPlayedAudio(true); // Mark that we're about to play audio
            
            // Add timestamp to force path to be seen as new
            const timestampedPath = `${audioPath}?t=${Date.now()}`;
            
            // Clear any existing audio element
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current.src = '';
                audioPlayerRef.current.load();
                audioPlayerRef.current = null;
            }
            
            setResponseAudioPath(timestampedPath);
            setIsProcessing(false); // End processing state
            
            // Ensure we play the audio immediately
            setTimeout(() => {
                playResponseAudio();
            }, 300); // Slightly longer delay to ensure file is ready
        };
        
        // Set up direct timeout fallback in case IPC fails
        const processingTimeout = setTimeout(() => {
            if (isProcessing && !hasPlayedAudio) {
                console.log('Processing timeout reached, trying direct audio playback');
                
                // Try to check if the file exists via the main process
                window.electron.openWithDefault('output/output.mp3')
                    .then(() => {
                        console.log('Audio file exists, attempting playback');
                        setHasPlayedAudio(true); // Mark that we're about to play audio
                        
                        // Add timestamp to force path to be seen as new
                        const timestamp = Date.now();
                        const directPath = `output/output.mp3?t=${timestamp}`;
                        
                        // Clear any existing audio element
                        if (audioPlayerRef.current) {
                            audioPlayerRef.current.pause();
                            audioPlayerRef.current.src = '';
                            audioPlayerRef.current.load();
                            audioPlayerRef.current = null;
                        }
                        
                        setResponseAudioPath(directPath);
                        setIsProcessing(false);
                        
                        setTimeout(() => {
                            playResponseAudio();
                        }, 300);
                    })
                    .catch(error => {
                        console.error('Could not verify audio file exists:', error);
                        // Still try to play as a last resort
                        if (!hasPlayedAudio) {
                            setHasPlayedAudio(true); // Mark that we're about to play audio
                            
                            const timestamp = Date.now();
                            const fallbackPath = `../../output/output.mp3?t=${timestamp}`;
                            
                            // Clear any existing audio element
                            if (audioPlayerRef.current) {
                                audioPlayerRef.current.pause();
                                audioPlayerRef.current.src = '';
                                audioPlayerRef.current.load();
                                audioPlayerRef.current = null;
                            }
                            
                            setResponseAudioPath(fallbackPath);
                            setIsProcessing(false);
                            
                            setTimeout(() => {
                                playResponseAudio();
                            }, 300);
                        }
                    });
            }
        }, 8000); // 8 second timeout
        
        window.electron.listenAudioReady(handleAudioReady);
        
        // Cleanup
        return () => {
            clearTimeout(processingTimeout);
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }
        };
    }, [isProcessing]);
    
    useEffect(() => {
        setMenuStatus(!menuStatus);
    }, [toggleMenu]);

    if (voiceMode) {
        return (
            <div className='flex-1 flex'>
                {menuStatus && (
                    <div className="flex flex-col min-w-60 bg-[#1A1B1F]">
                        <h1 className="px-4 pt-2 font-semibold">File Intellisense</h1>
                        <p className="text-xs px-4 text-[#7A7B82]">Complete agent operations record</p>
                    </div>
                )}
                <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#141518] via-[#1a1d24] to-[#141518] relative overflow-hidden">
                    {/* Background decorative elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={`absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
                            isRecording 
                                ? 'bg-red-500' 
                                : isProcessing
                                    ? 'bg-red-500'
                                    : isPlaying
                                        ? 'bg-green-500'
                                        : 'bg-blue-500'
                        }`} />
                        <div className={`absolute bottom-20 right-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
                            isRecording 
                                ? 'bg-orange-500' 
                                : isProcessing
                                    ? 'bg-orange-500'
                                    : isPlaying
                                        ? 'bg-emerald-500'
                                        : 'bg-indigo-500'
                        }`} />
                    </div>
                    
                    {/* Main content */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-12">
                            <img 
                                src={
                                    isPlaying 
                                        ? seeqTalkingGif 
                                        : isProcessing 
                                            ? seeqThinking 
                                            : seeqMouthClosed
                                } 
                                alt="Seeq Voice Agent" 
                                className={`w-64 h-64 rounded-full transition-all duration-300 ${
                                    isRecording 
                                        ? 'shadow-[0_0_60px_#ef4444]/50 scale-105' 
                                        : isProcessing
                                            ? 'shadow-[0_0_60px_#ef4444]/50 scale-105'
                                            : isPlaying
                                                ? 'shadow-[0_0_60px_#10b981]/60 scale-110'
                                                : 'shadow-[0_0_50px_#3b82f6]/40'
                                }`} 
                            />
                        </div>
                        
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => {
                                    // Stop any playing audio
                                    if (audioPlayerRef.current) {
                                        audioPlayerRef.current.pause();
                                        audioPlayerRef.current = null;
                                    }
                                    setVoiceMode(false);
                                }}
                                className="bg-gradient-to-r from-gray-600 to-gray-700 px-8 py-3 rounded-2xl text-white font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                            >
                                Exit Voice Mode
                            </button>
                            
                            {isRecording ? (
                                <button
                                    onClick={stopRecording}
                                    className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 rounded-2xl text-white font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-105 active:scale-95 animate-pulse"
                                >
                                    Stop Recording
                                </button>
                            ) : isProcessing ? (
                                <div className="bg-gradient-to-r from-red-600 to-orange-600 px-8 py-3 rounded-2xl text-white font-semibold shadow-lg shadow-red-500/30 animate-pulse flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processing...
                                </div>
                            ) : isPlaying ? (
                                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3 rounded-2xl text-white font-semibold shadow-lg shadow-green-500/30 animate-pulse flex items-center gap-2">
                                    Playing Response...
                                </div>
                            ) : (
                                <button
                                    onClick={startRecording}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 rounded-2xl text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 active:scale-95"
                                >
                                    {responseAudioPath ? 'Record Again' : 'Start Recording'}
                                </button>
                            )}
                        </div>
                        
                        <div className="bg-[#1A1B1F]/80 backdrop-blur-sm rounded-2xl px-8 py-4 max-w-xl border border-gray-700/50 shadow-xl">
                            <p className="text-gray-300 text-center text-base leading-relaxed">
                                {isRecording 
                                    ? "Recording... Speak clearly and I'll transcribe your message. Pauses will be detected automatically." 
                                    : isProcessing
                                        ? "Processing your request... Please wait while I analyze your message."
                                        : isPlaying
                                            ? "Playing the agent's response. When finished, you can record again."
                                            : responseAudioPath
                                                ? "Ready for your next question. Click 'Record Again' to continue."
                                                : "Welcome! Click 'Start Recording' and speak your message. I'll transcribe it and respond."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex">
            {menuStatus && (
                <div className="flex flex-col min-w-60 bg-[#1A1B1F]">
                    <h1 className="px-4 pt-2 font-semibold">File Intellisense</h1>
                    <p className="text-xs px-4 text-[#7A7B82]">Complete agent operations record</p>
                </div>
            )}

            <div className="flex-1 flex justify-center bg-gradient-to-br from-[#141518] via-[#1a1d24] to-[#141518]">
                <div className="flex flex-col gap-6 w-160 max-h-full min-h-0">
                    {/* Chat render area */}
                    <div className="flex-1 flex px-2 py-4 flex-col min-h-0 overflow-hidden">
                        {showMessages ? (
                            <div className="flex flex-col overflow-y-auto my-scroll space-y-4 mt-2 min-h-0">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`max-w-[80%] ${message.type === 'user' ? 'self-end' : ''} animate-fade-in-up`}
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <div
                                            className={`flex items-center gap-2 mb-2 ${message.type === 'user' ? 'justify-end' : ''
                                                }`}
                                        >
                                            {message.type === 'ai' && <p className="text-sm text-white/60">9:18 PM</p>}
                                            <div
                                                className={`px-4 py-0.5 text-xs rounded-xl ${message.type === 'user'
                                                    ? 'bg-gradient-to-r from-blue-600/40 to-indigo-600/40 border border-blue-500/50'
                                                    : 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 border border-green-500/50'
                                                    }`}
                                            >
                                                {message.type === 'user' ? 'You' : 'Seeq'}
                                            </div>
                                            {message.type === 'user' && <p className="text-sm text-white/60">9:18 PM</p>}
                                        </div>
                                        <div
                                            className={`text-white px-4 py-3 rounded-2xl w-fit break-words whitespace-pre-wrap shadow-lg transition-all hover:shadow-xl ${
                                                message.type === 'user' 
                                                    ? 'bg-gradient-to-br from-[#2a2d35] to-[#212226] border border-gray-700/50' 
                                                    : 'bg-gradient-to-br from-[#2a2d35] to-[#212226] border border-gray-700/50'
                                                }`}
                                        >
                                            {message.content}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm border border-blue-500/30 text-white px-5 py-3 rounded-2xl w-fit shadow-lg animate-fade-in">
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                                                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-sm"></div>
                                            </div>
                                            <span className="font-medium">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-4 items-center justify-center animate-fade-in px-4 min-h-0">
                                <img src={mainIcon} className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 no-highlight animate-float flex-shrink-0" />
                                <div className="text-center space-y-2 flex-shrink-0">
                                    <h1 className="font-semibold text-2xl sm:text-3xl text-gray-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>Hi! I am Seeq.</h1>
                                    <h2 className="font-semibold text-lg sm:text-xl text-gray-400 animate-slide-up" style={{ animationDelay: '0.2s' }}>I can help you with all your file troubles.</h2>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input area */}
                    <div className="px-2 mb-8 flex-shrink-0 w-full">
                        <div className="bg-[#282A2F] rounded-2xl flex flex-col px-6 py-4 w-full shadow-lg border border-gray-700/30 transition-all hover:border-gray-600/50 hover:shadow-xl">
                            <div className="flex-1 border-b border-gray-600 pb-3">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={handleTextareaChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                    placeholder="Ask FileAI Something..."
                                    className="text-gray-200 w-full bg-transparent placeholder-gray-400 focus:outline-none focus:ring-0 text-base resize-none overflow-y-auto max-h-32 min-h-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                                    disabled={isLoading}
                                    rows={1}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-3">
                                <div className="flex gap-3 items-center">
                                    <button
                                        onClick={() => {
                                            setInputValue('');
                                            if (textareaRef.current) {
                                                textareaRef.current.style.height = 'auto';
                                            }
                                        }}
                                        className="bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-2 rounded-xl text-white font-medium hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                    >
                                        <p className="text-sm">Clear</p>
                                    </button>
                                    <div className="bg-amber-600/20 border border-amber-600/40 px-4 py-2 rounded-xl">
                                        <p className="text-sm text-amber-200/90">Requests are destructive</p>
                                    </div>
                                </div>
                                {inputValue.trim() ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-gray-600 to-gray-700 p-3 rounded-xl text-white font-medium hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                                    >
                                        <img src={send} className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {setVoiceMode(true)}}
                                        className="bg-gradient-to-r from-gray-600 to-gray-700 p-3 rounded-xl text-white hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                    >
                                        <img src={voiceAgent} className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
