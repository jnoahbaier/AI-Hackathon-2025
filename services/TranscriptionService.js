const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class TranscriptionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Transcribe audio file using OpenAI Whisper with retry logic
   * @param {string} audioFilePath - Path to the audio file
   * @param {number} retries - Number of retries (default: 3)
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioFilePath, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check if file exists
        if (!fs.existsSync(audioFilePath)) {
          throw new Error('Audio file not found');
        }

        // Get file stats to check size
        const stats = fs.statSync(audioFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        console.log(`🎙️ Transcribing audio file: ${path.basename(audioFilePath)} (${fileSizeInMB.toFixed(2)} MB) - Attempt ${attempt}/${retries}`);

        // OpenAI Whisper has a 25MB file size limit
        if (fileSizeInMB > 25) {
          throw new Error('Audio file too large for transcription (max 25MB)');
        }

        // Create a readable stream for the audio file
        const audioFile = fs.createReadStream(audioFilePath);

        // Call OpenAI Whisper API with timeout
        const transcription = await Promise.race([
          this.openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en", // You can make this configurable or auto-detect
            response_format: "text",
            temperature: 0.2 // Lower temperature for more consistent results
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
          )
        ]);

        console.log(`✅ Transcription completed for ${path.basename(audioFilePath)}`);
        
        return transcription;
      } catch (error) {
        console.error(`❌ Transcription error (attempt ${attempt}/${retries}):`, error.message);
        
        // Handle specific OpenAI errors (don't retry these)
        if (error.code === 'invalid_request_error') {
          throw new Error('Invalid audio file format or corrupted file');
        } else if (error.code === 'rate_limit_exceeded' || error.status === 429) {
          throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
        } else if (error.code === 'insufficient_quota') {
          throw new Error('OpenAI API quota exceeded. Please add credits to your account.');
        } else if (error.message && error.message.includes('quota')) {
          throw new Error('OpenAI quota exceeded. Please check your billing and add credits.');
        }
        
        // For connection errors, retry if we have attempts left
        if (attempt < retries && (
          error.message.includes('ECONNRESET') ||
          error.message.includes('Connection error') ||
          error.message.includes('timeout') ||
          error.message.includes('ENOTFOUND')
        )) {
          console.log(`🔄 Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        // If we've exhausted retries or it's a non-retryable error
        throw new Error(`Transcription failed after ${attempt} attempts: ${error.message}`);
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
          model: "whisper-1"
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
    return !!this.openai.apiKey;
  }

  /**
   * Get supported audio formats
   * @returns {Array<string>} - List of supported audio formats
   */
  getSupportedFormats() {
    return [
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'
    ];
  }
}

module.exports = new TranscriptionService(); 