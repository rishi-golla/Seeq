import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import WebSocket from 'ws';
import path from 'path';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';
const MODEL = 'eleven_flash_v2_5';

export async function generateSpeechFile(
  text: string,
  outputDir = './output'
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ELEVENLABS_API_KEY)
      return reject('Missing ELEVENLABS_API_KEY in environment variables.');

    const uri = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL}`;
    const filePath = path.join(outputDir, 'output.mp3');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const writeStream = fs.createWriteStream(filePath, { flags: 'w' });

    const websocket = new WebSocket(uri, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    const writeToLocal = (base64str: string) => {
      const audioBuffer = Buffer.from(base64str, 'base64');
      writeStream.write(audioBuffer);
    };

    websocket.on('open', () => {
      websocket.send(
        JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            use_speaker_boost: false,
          },
          generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
        })
      );

      websocket.send(JSON.stringify({ text }));
      websocket.send(JSON.stringify({ text:'' }));
    });

    websocket.on('message', (event) => {
      const data = JSON.parse(event.toString());
      if (data.audio) writeToLocal(data.audio);
    });

    websocket.on('close', () => {
      // End the write stream and wait for 'finish' event to ensure file is completely written
      writeStream.end();
      
      writeStream.on('finish', () => {
        console.log(`Audio file write stream finished. File should be complete at: ${filePath}`);
        
        // Add a small delay to ensure filesystem has completed writing
        setTimeout(() => {
          // Verify the file exists and has content
          try {
            const stats = fs.statSync(filePath);
            console.log(`Audio file size: ${stats.size} bytes`);
            
            if (stats.size > 0) {
              resolve(filePath);
            } else {
              reject(new Error('Generated audio file is empty'));
            }
          } catch (error) {
            console.error('Error verifying audio file:', error);
            reject(error);
          }
        }, 500); // 500ms delay to ensure file is fully flushed to disk
      });
    });

    websocket.on('error', (err) => {
      writeStream.end();
      reject(err);
    });
  });
}