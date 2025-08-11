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

      console.log(`[Transcription] Processing audio file: ${req.file.filename}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);

      // Check if file has content
      if (req.file.size === 0) {
        // Clean up empty file
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        
        return res.status(400).json({ 
          error: 'Audio file is empty', 
          hint: 'Please ensure microphone permissions are granted and audio is being recorded properly'
        });
      }

      // Check minimum file size (at least 1KB for valid audio)
      if (req.file.size < 1024) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        
        return res.status(400).json({ 
          error: 'Audio file too small', 
          hint: 'Audio recording may have failed. Please try speaking for at least 1-2 seconds.'
        });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-fake-key-for-development') {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        
        return res.status(503).json({ 
          error: 'Transcription service not configured', 
          hint: 'OpenAI API key is required for audio transcription'
        });
      }

      // Convert file if needed (ensure proper format for Whisper)
      let audioFilePath = req.file.path;
      const originalExtension = path.extname(req.file.originalname || '').toLowerCase();
      
      console.log(`[Transcription] Original file: ${req.file.originalname}, Extension: ${originalExtension}, MIME: ${req.file.mimetype}`);
      
      // Always add proper extension for OpenAI Whisper compatibility
      if (!originalExtension) {
        let newExtension = '.webm'; // default
        
        // Try to determine extension from MIME type or filename
        if (req.file.mimetype?.includes('mp4') || req.file.originalname?.includes('mp4')) {
          newExtension = '.mp4';
        } else if (req.file.mimetype?.includes('m4a') || req.file.originalname?.includes('m4a')) {
          newExtension = '.m4a';
        } else if (req.file.mimetype?.includes('wav') || req.file.originalname?.includes('wav')) {
          newExtension = '.wav';
        } else if (req.file.mimetype?.includes('ogg') || req.file.originalname?.includes('ogg')) {
          newExtension = '.ogg';
        } else if (req.file.mimetype?.includes('webm') || req.file.originalname?.includes('webm')) {
          newExtension = '.webm';
        }
        
        const newPath = req.file.path + newExtension;
        try {
          fs.renameSync(req.file.path, newPath);
          audioFilePath = newPath;
          console.log(`[Transcription] Added extension: ${newExtension}`);
        } catch (renameError) {
          console.warn('Could not rename audio file:', renameError);
        }
      }

      // Use OpenAI Whisper to transcribe the audio
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'en', // Can be made dynamic based on user preference
        response_format: 'json',
        temperature: 0.0, // More deterministic transcription
      });

      console.log(`[Transcription] Result: "${transcription.text}"`);

      // Clean up the uploaded file(s)
      try {
        fs.unlinkSync(audioFilePath);
        // Also clean up original if we renamed it
        if (audioFilePath !== req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
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
      
      // Clean up any uploaded files if they exist
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
          // Also try to clean up renamed file
          const renamedPath = req.file.path + '.webm';
          if (fs.existsSync(renamedPath)) {
            fs.unlinkSync(renamedPath);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup audio file after error:', cleanupError);
        }
      }

      // Provide specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return res.status(503).json({ 
            error: 'OpenAI API key not configured for transcription',
            hint: 'Please ensure OPENAI_API_KEY environment variable is set'
          });
        }
        
        if (error.message.includes('Unrecognized file format') || error.message.includes('file format')) {
          return res.status(400).json({ 
            error: 'Unsupported audio format',
            hint: 'Please use a supported audio format: MP3, WAV, WebM, M4A, OGG, or FLAC'
          });
        }
        
        if (error.message.includes('file is empty') || error.message.includes('No audio')) {
          return res.status(400).json({ 
            error: 'No audio detected in file',
            hint: 'Please ensure microphone is working and try recording for a longer duration'
          });
        }
      }

      res.status(500).json({ 
        error: 'Failed to transcribe audio',
        hint: 'Please check your microphone permissions and try again',
        details: error instanceof Error ? error.message : 'Unknown transcription error'
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