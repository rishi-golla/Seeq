import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { BrowserWindow, ipcMain } from 'electron';
import axios from 'axios';
import { fileSysAgent } from "./fileSysAgent.js";
import { generateSpeechFile } from "./elevelLabs.js";

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
let isRecording = false;
let audioFilePath: string;
let pauseDetectionTimer: NodeJS.Timeout | null = null;
let silenceCounter = 0;

export async function startVoiceRecording(): Promise<void> {
  if (isRecording) {
    console.log("Recording already in progress");
    return;
  }
  
  isRecording = true;
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  audioFilePath = path.join(outputDir, `recording.wav`);
  
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.send('request-microphone-permission');
    ipcMain.once('audio-data', async (event, audioBuffer) => {
      fs.writeFileSync(audioFilePath, Buffer.from(audioBuffer));
      console.log(`Audio saved to ${audioFilePath}`);
      startPauseDetection();
    });
    
    console.log("Voice recording started");
  } catch (error) {
    console.error("Error starting voice recording:", error);
    isRecording = false;
    throw error;
  }
}

function startPauseDetection() {
  silenceCounter = 0;
  pauseDetectionTimer = setInterval(() => {
    silenceCounter++;
    
    if (silenceCounter >= 4) {
      console.log("Pause detected, stopping recording");
      if (pauseDetectionTimer) {
        clearInterval(pauseDetectionTimer);
        pauseDetectionTimer = null;
      }
      
      if (isRecording) {
        stopVoiceRecording();
      }
    }
  }, 500);
}

export async function processAudioData(data: Buffer): Promise<void> {
  try {
    console.log("Processing audio data:", data.length, "bytes");
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save audio recording
    audioFilePath = path.join(outputDir, `recording.wav`);
    fs.writeFileSync(audioFilePath, data);
    console.log(`Audio saved to ${audioFilePath}`);
    
    // Transcribe audio
    const transcript = await transcribeAudio(audioFilePath);
    
    // Save transcript
    const transcriptPath = path.join(outputDir, `transcript.txt`);
    fs.writeFileSync(transcriptPath, transcript, 'utf8');
    console.log(`Transcript saved to ${transcriptPath}`);
    
    // Process transcript with agent and generate speech response
    const result = await fileSysAgent(transcript);
    console.log("Agent response:", result);
    
    // Generate speech file from the agent's response
    const speechFilePath = await generateSpeechFile(result, './output');
    console.log("Transcript processed with agent, speech file generated at:", speechFilePath);
    
    // Verify the file exists and has content
    try {
      if (!fs.existsSync(speechFilePath)) {
        console.error(`Generated speech file does not exist at path: ${speechFilePath}`);
        throw new Error('Speech file generation failed');
      }
      
      // Check file stats to ensure it has content and is not being written to
      const stats = fs.statSync(speechFilePath);
      console.log(`Speech file size: ${stats.size} bytes, last modified: ${stats.mtime}`);
      
      if (stats.size === 0) {
        console.error('Generated speech file is empty');
        throw new Error('Speech file is empty');
      }
      
      // Add a delay to ensure file is fully written and accessible
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check file again after delay to ensure it's stable
      const statsAfterDelay = fs.statSync(speechFilePath);
      console.log(`Speech file after delay - size: ${statsAfterDelay.size} bytes, last modified: ${statsAfterDelay.mtime}`);
      
      // Get absolute path for the audio file
      const absoluteSpeechPath = path.resolve(speechFilePath);
      console.log("Absolute speech file path:", absoluteSpeechPath);
      
      // Notify frontend that audio is ready to be played
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        // Send the audio file path as the payload
        console.log("Sending audioReady event with path:", absoluteSpeechPath);
        mainWindow.webContents.send('audioReady', absoluteSpeechPath);
      } else {
        console.error("No main window found to send audioReady event");
      }
    } catch (error) {
      console.error("Error verifying speech file:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error processing audio data:", error);
  }
}

export async function stopVoiceRecording(): Promise<void> {
  if (!isRecording) {
    console.log("No recording in progress");
    return;
  }
  
  isRecording = false;
  console.log("Voice recording stopped");

  if (pauseDetectionTimer) {
    clearInterval(pauseDetectionTimer);
    pauseDetectionTimer = null;
  }
}

async function transcribeAudio(audioFilePath: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
  }

  try {
    console.log(`Transcribing audio file: ${audioFilePath}`);
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }
    const audioBuffer = fs.readFileSync(audioFilePath);
    const client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
      environment: "https://api.elevenlabs.io"
    });
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), path.basename(audioFilePath));
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', 'eng');
    
    console.log("Sending audio to ElevenLabs for transcription...");
    try {
      const result = await client.speechToText.convert({
        file: audioBuffer,
        modelId: 'scribe_v1',
        languageCode: 'eng',
      });
      const transcriptText = (result as any).text || '';
      console.log(`Transcription result: ${transcriptText}`);
      
      return transcriptText;
    } catch (apiError) {
      console.error("Error calling ElevenLabs API:", apiError);
      console.log("Falling back to direct API call...");
      
      const response = await axios.post(
        'https://api.elevenlabs.io/v1/speech-to-text',
        formData,
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      const transcriptText = response.data.text || '';
      console.log(`Transcription result from fallback: ${transcriptText}`);
      return transcriptText;
    }
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  }
}

export function setupSpeechToTextIPC() {
  ipcMain.on('audio-buffer', (event, buffer) => {
    if (isRecording && audioFilePath) {
      console.log("Received audio buffer chunk");
    }
  });
}