const { GoogleGenerativeAI } = require('@google/generative-ai');

class DreamProcessingService {
  constructor() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('⚠️ GEMINI_API_KEY not set. Dream processing will not work.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Process a dream transcription into summary and visual scenes
   * @param {string} transcription - The dream transcription text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed dream data
   */
  async processDream(transcription, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured. Please check your GEMINI_API_KEY in .env file');
    }

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Transcription text is required');
    }

    const {
      sceneCount = 6,
      maxRetries = 3,
      includeEmotions = true,
      includeCharacters = true
    } = options;

    console.log(`🧠 Processing dream transcription (${transcription.length} chars) into ${sceneCount} scenes...`);

    try {
      // Use Gemini 1.5 Pro for better reasoning
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const prompt = this.buildDreamProcessingPrompt(transcription, {
        sceneCount,
        includeEmotions,
        includeCharacters
      });

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dream processing timeout after 60 seconds')), 60000)
        )
      ]);

      const response = await result.response;
      const processedText = response.text().trim();

      // Parse the structured response
      const dreamData = this.parseDreamResponse(processedText);

      console.log(`✅ Dream processing completed:`);
      console.log(`📋 Summary: "${dreamData.summary.substring(0, 100)}..."`);
      console.log(`🎬 Generated ${dreamData.scenes.length} visual scenes`);

      return {
        ...dreamData,
        metadata: {
          originalLength: transcription.length,
          processedAt: new Date().toISOString(),
          model: "gemini-1.5-pro",
          sceneCount: dreamData.scenes.length,
          processingTime: Date.now()
        }
      };

    } catch (error) {
      console.error('❌ Dream processing error:', error.message);
      
      // Handle specific Gemini errors
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded. Please check your billing');
      } else if (error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Permission denied. Please check your Gemini API key permissions');
      }
      
      throw new Error(`Dream processing failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt for dream processing
   * @param {string} transcription - Dream transcription
   * @param {Object} options - Processing options
   * @returns {string} - Formatted prompt
   */
  buildDreamProcessingPrompt(transcription, options) {
    const { sceneCount, includeEmotions, includeCharacters } = options;

    return `You are a dream analyst and visual storyteller. Your task is to process this dream transcription and create a structured output for comic strip generation.

DREAM TRANSCRIPTION:
"${transcription}"

Please analyze this dream and provide a structured response in the following JSON format:

{
  "title": "A catchy, descriptive title for this dream (3-8 words, evocative and memorable)",
  "summary": "A concise 2-3 sentence summary of the overall dream",
  "mood": "primary emotional tone (happy, mysterious, scary, surreal, peaceful, chaotic, etc.)",
  "themes": ["theme1", "theme2", "theme3"],
  ${includeCharacters ? '"characters": ["character1", "character2"],\n  ' : ''}"scenes": [
    {
      "sequence": 1,
      "description": "Detailed visual description of this scene (50-80 words)",
      "action": "What is happening in this scene",
      "setting": "Where this scene takes place",
      ${includeEmotions ? '"emotion": "emotional tone of this specific scene",\n      ' : ''}"visual_style": "suggested art style or mood (realistic, surreal, dark, bright, etc.)",
      "image_prompt": "Optimized prompt for AI image generation (30-50 words, vivid and specific)"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Create exactly ${sceneCount} scenes that tell the dream story chronologically
2. Each scene should be visually distinct and interesting for comic panels
3. Focus on the most vivid, memorable, or significant moments
4. Make image prompts specific and visual (avoid abstract concepts)
5. Ensure scenes flow logically from one to the next
6. Include visual details like lighting, colors, atmosphere
7. Keep descriptions engaging but concise
8. Make sure the JSON is valid and properly formatted

Return ONLY the JSON response, no additional text or formatting.`;
  }

  /**
   * Parse the Gemini response into structured dream data
   * @param {string} responseText - Raw response from Gemini
   * @returns {Object} - Parsed dream data
   */
  parseDreamResponse(responseText) {
    try {
      // Clean up the response (remove any markdown formatting)
      let cleanResponse = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const dreamData = JSON.parse(cleanResponse);

      // Validate required fields
      if (!dreamData.summary || !dreamData.scenes || !Array.isArray(dreamData.scenes)) {
        throw new Error('Invalid dream data structure');
      }

      // Ensure scenes have required fields
      dreamData.scenes = dreamData.scenes.map((scene, index) => ({
        sequence: scene.sequence || index + 1,
        description: scene.description || 'Scene description missing',
        action: scene.action || 'Action not specified',
        setting: scene.setting || 'Setting not specified',
        emotion: scene.emotion || 'neutral',
        visual_style: scene.visual_style || 'realistic',
        image_prompt: scene.image_prompt || scene.description || 'Visual scene'
      }));

      // Set defaults for optional fields
      dreamData.title = dreamData.title || 'Untitled Dream';
      dreamData.mood = dreamData.mood || 'neutral';
      dreamData.themes = dreamData.themes || [];
      dreamData.characters = dreamData.characters || [];

      return dreamData;

    } catch (error) {
      console.error('❌ Failed to parse dream response:', error.message);
      console.error('Raw response:', responseText.substring(0, 500) + '...');
      
      // Return a fallback structure
      return {
        summary: 'Dream processing completed but formatting failed. Please try again.',
        mood: 'unknown',
        themes: [],
        characters: [],
        scenes: [
          {
            sequence: 1,
            description: 'Dream scene could not be processed properly',
            action: 'Processing error occurred',
            setting: 'Unknown',
            emotion: 'neutral',
            visual_style: 'realistic',
            image_prompt: 'Dream scene visualization'
          }
        ]
      };
    }
  }

  /**
   * Process multiple dreams in batch
   * @param {Array<string>} transcriptions - Array of dream transcriptions
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of processed dreams
   */
  async processDreamsBatch(transcriptions, options = {}) {
    const { concurrent = 3 } = options;
    
    console.log(`🔄 Processing ${transcriptions.length} dreams in batches of ${concurrent}...`);
    
    const results = [];
    
    for (let i = 0; i < transcriptions.length; i += concurrent) {
      const batch = transcriptions.slice(i, i + concurrent);
      const batchPromises = batch.map((transcription, index) => 
        this.processDream(transcription, { ...options, batchIndex: i + index })
          .catch(error => ({
            error: error.message,
            transcription: transcription.substring(0, 100) + '...'
          }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect API limits
      if (i + concurrent < transcriptions.length) {
        console.log(`⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Batch processing completed: ${results.filter(r => !r.error).length}/${transcriptions.length} successful`);
    return results;
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} - Whether the service can be used
   */
  isConfigured() {
    return !!this.genAI && !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  }

  /**
   * Get processing statistics
   * @param {Object} dreamData - Processed dream data
   * @returns {Object} - Processing statistics
   */
  getProcessingStats(dreamData) {
    if (!dreamData || !dreamData.scenes) {
      return { error: 'Invalid dream data' };
    }

    return {
      sceneCount: dreamData.scenes.length,
      averageSceneLength: Math.round(
        dreamData.scenes.reduce((sum, scene) => sum + scene.description.length, 0) / dreamData.scenes.length
      ),
      totalWords: dreamData.scenes.reduce((sum, scene) => 
        sum + scene.description.split(' ').length + scene.image_prompt.split(' ').length, 0
      ),
      themes: dreamData.themes?.length || 0,
      characters: dreamData.characters?.length || 0,
      mood: dreamData.mood,
      hasMetadata: !!dreamData.metadata
    };
  }
}

module.exports = new DreamProcessingService(); 