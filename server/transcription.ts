import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import type { Express } from 'express';

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

const upload = multer({
  dest: 'uploads/audio/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for audio
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.webm')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export function registerTranscriptionRoutes(app: Express) {
  
  // Audio transcription endpoint
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
      }

      console.log(`[Transcription] Processing audio file: ${req.file.filename}, size: ${req.file.size} bytes`);

      // Use OpenAI Whisper to transcribe the audio
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
        language: 'en', // Can be made dynamic based on user preference
        response_format: 'json',
        temperature: 0.0, // More deterministic transcription
      });

      console.log(`[Transcription] Result: "${transcription.text}"`);

      // Clean up the uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup audio file:', cleanupError);
      }

      res.json({
        transcription: transcription.text,
        duration: 0, // Duration not available in JSON response format
        sessionId
      });

    } catch (error) {
      console.error('Transcription error:', error);
      
      // Clean up the uploaded file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup audio file after error:', cleanupError);
        }
      }

      if (error instanceof Error && error.message.includes('API key')) {
        return res.status(500).json({ 
          error: 'OpenAI API key not configured for transcription',
          hint: 'Please ensure OPENAI_API_KEY environment variable is set'
        });
      }

      res.status(500).json({ 
        error: 'Failed to transcribe audio',
        hint: 'Please try again or check that the audio file is valid'
      });
    }
  });

  // Health check for transcription service
  app.get('/api/transcribe/status', (req, res) => {
    res.json({
      status: 'available',
      whisper_model: 'whisper-1',
      max_file_size: '25MB',
      supported_formats: ['webm', 'mp3', 'wav', 'mp4', 'm4a'],
      openai_configured: !!process.env.OPENAI_API_KEY
    });
  });
}