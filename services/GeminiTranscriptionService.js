const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiTranscriptionService {
  constructor() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('⚠️ GEMINI_API_KEY not set. Please add your Gemini API key to .env file');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Transcribe audio file using Gemini API
   * @param {string} audioFilePath - Path to the audio file
   * @param {number} retries - Number of retries (default: 3)
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioFilePath, retries = 3) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured. Please check your GEMINI_API_KEY in .env file');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check if file exists
        if (!fs.existsSync(audioFilePath)) {
          throw new Error('Audio file not found');
        }

        // Get file stats
        const stats = fs.statSync(audioFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        console.log(`🎙️ Transcribing audio file with Gemini: ${path.basename(audioFilePath)} (${fileSizeInMB.toFixed(2)} MB) - Attempt ${attempt}/${retries}`);

        // Gemini has file size limits - check this
        if (fileSizeInMB > 20) {
          throw new Error('Audio file too large for Gemini transcription (max 20MB)');
        }

        // Read the audio file
        const audioData = fs.readFileSync(audioFilePath);
        const base64Audio = audioData.toString('base64');

        // Get the file extension to determine MIME type
        const ext = path.extname(audioFilePath).toLowerCase();
        let mimeType;
        
        switch (ext) {
          case '.mp3':
            mimeType = 'audio/mp3';
            break;
          case '.wav':
            mimeType = 'audio/wav';
            break;
          case '.webm':
            mimeType = 'audio/webm';
            break;
          case '.m4a':
            mimeType = 'audio/mp4';
            break;
          case '.ogg':
            mimeType = 'audio/ogg';
            break;
          default:
            mimeType = 'audio/webm'; // Default fallback
        }

        // Use Gemini Pro model for audio transcription
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const result = await Promise.race([
          model.generateContent([
            {
              text: "Please transcribe this audio file accurately. Only return the transcribed text, no additional commentary or formatting."
            },
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType
              }
            }
          ]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
          )
        ]);

        const response = await result.response;
        const transcription = response.text().trim();

        if (!transcription) {
          throw new Error('No transcription returned from Gemini');
        }

        console.log(`✅ Gemini transcription completed for ${path.basename(audioFilePath)}`);
        console.log(`📝 Transcription preview: "${transcription.substring(0, 100)}..."`);
        
        return transcription;

      } catch (error) {
        console.error(`❌ Gemini transcription error (attempt ${attempt}/${retries}):`, error.message);
        
        // Handle specific Gemini errors (don't retry these)
        if (error.message.includes('API key')) {
          throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file');
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('Gemini API quota exceeded. Please check your billing');
        } else if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied. Please check your Gemini API key permissions');
        }
        
        // For connection errors, retry if we have attempts left
        if (attempt < retries && (
          error.message.includes('ECONNRESET') ||
          error.message.includes('Connection error') ||
          error.message.includes('timeout') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('fetch')
        )) {
          console.log(`🔄 Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        // If we've exhausted retries or it's a non-retryable error
        throw new Error(`Gemini transcription failed after ${attempt} attempts: ${error.message}`);
      }
    }
  }

  /**
   * Transcribe with additional processing and metadata
   * @param {string} audioFilePath - Path to the audio file
   * @returns {Promise<Object>} - Transcription result with metadata
   */
  async transcribeWithMetadata(audioFilePath) {
    try {
      const startTime = Date.now();
      const transcriptionText = await this.transcribeAudio(audioFilePath);
      const endTime = Date.now();
      
      const stats = fs.statSync(audioFilePath);
      
      return {
        text: transcriptionText,
        metadata: {
          filePath: audioFilePath,
          fileName: path.basename(audioFilePath),
          fileSize: stats.size,
          fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          transcriptionTime: endTime - startTime,
          timestamp: new Date().toISOString(),
          wordCount: transcriptionText.split(/\s+/).length,
          model: "gemini-1.5-pro",
          provider: "gemini"
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} - Whether the service can be used
   */
  isConfigured() {
    return !!this.genAI && !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  }

  /**
   * Get supported audio formats
   * @returns {Array<string>} - List of supported audio formats
   */
  getSupportedFormats() {
    return [
      'mp3', 'wav', 'webm', 'm4a', 'ogg'
    ];
  }

  /**
   * Test the Gemini API connection
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      if (!this.genAI) {
        throw new Error('Gemini API not configured');
      }

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Say 'Gemini API is working!'");
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: 'Gemini API connection successful',
        response: text
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new GeminiTranscriptionService(); 