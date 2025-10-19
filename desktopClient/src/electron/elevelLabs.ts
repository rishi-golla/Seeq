import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import WebSocket from 'ws';
import path from 'path';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';
const MODEL = 'eleven_flash_v2_5';

/**
 * Converts text to speech using ElevenLabs WebSocket API.
 * Always overwrites the same file in outputDir/output.mp3.
 *
 * @param text The text to convert to speech.
 * @param outputDir Directory where output.mp3 will be written.
 * @returns Promise<string> Path to the generated audio file.
 */
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
      writeStream.end();
      resolve(filePath);
    });

    websocket.on('error', (err) => {
      writeStream.end();
      reject(err);
    });
  });
}