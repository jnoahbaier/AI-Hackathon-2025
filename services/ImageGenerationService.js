const { GoogleGenAI, Modality } = require('@google/genai');
const fs = require('fs');
const path = require('path');

class ImageGenerationService {
  constructor() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('⚠️ GEMINI_API_KEY not set. Image generation will not work.');
      this.client = null;
    } else {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.client !== null;
  }

  /**
   * Generate a single watercolor comic image from a dream scene using Gemini
   * @param {Object} scene - Dream scene object with description and image_prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated image data
   */
  async generateSceneImage(scene, options = {}) {
    if (!this.client) {
      throw new Error('Gemini client not configured. Please check your GEMINI_API_KEY.');
    }

    const {
      style = "watercolor"
    } = options;

    // Create the enhanced prompt with watercolor comic style
    const stylePrompt = this.createStyledPrompt(scene.image_prompt, style);

    console.log(`🎨 Generating image for scene ${scene.sequence}: "${scene.description.substring(0, 50)}..."`);

    try {
      const startTime = Date.now();
      
      const response = await this.client.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: stylePrompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const elapsed = Date.now() - startTime;

      // Extract image data from response
      let imageData = null;
      let responseText = null;

      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          responseText = part.text;
        } else if (part.inlineData) {
          imageData = part.inlineData.data; // This is base64 encoded
        }
      }

      if (!imageData) {
        throw new Error('No image data received from Gemini');
      }

      console.log(`✅ Image generated for scene ${scene.sequence} in ${elapsed}ms`);

      return {
        scene_sequence: scene.sequence,
        scene_description: scene.description,
        original_prompt: scene.image_prompt,
        styled_prompt: stylePrompt,
        b64_json: imageData,
        response_text: responseText,
        generation_time: elapsed,
        model: "gemini-2.0-flash-preview-image-generation"
      };

    } catch (error) {
      console.error(`❌ Image generation failed for scene ${scene.sequence}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate images for all scenes in a processed dream
   * @param {Object} processedDream - Dream with processed scenes
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} - Array of generated images
   */
  async generateDreamImages(processedDream, options = {}) {
    if (!this.client) {
      throw new Error('Gemini client not configured. Please check your GEMINI_API_KEY.');
    }

    const { scenes } = processedDream;
    const { 
      concurrent = false,
      delay = 2000, // Increased delay for Gemini API
      ...imageOptions 
    } = options;

    console.log(`🎬 Generating ${scenes.length} images for dream: "${processedDream.summary.substring(0, 50)}..."`);

    const images = [];

    if (concurrent) {
      // Generate all images concurrently (faster but may hit rate limits)
      const promises = scenes.map(scene => 
        this.generateSceneImage(scene, imageOptions)
      );
      
      try {
        const results = await Promise.all(promises);
        images.push(...results);
      } catch (error) {
        console.error('❌ Concurrent image generation failed:', error.message);
        throw error;
      }
    } else {
      // Generate images sequentially (slower but more reliable)
      for (const scene of scenes) {
        try {
          const image = await this.generateSceneImage(scene, imageOptions);
          images.push(image);
          
          // Add delay between requests to avoid rate limits
          if (delay > 0 && scene !== scenes[scenes.length - 1]) {
            console.log(`⏳ Waiting ${delay}ms before next image generation...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error(`❌ Failed to generate image for scene ${scene.sequence}:`, error.message);
          // Continue with other scenes even if one fails
          images.push({
            scene_sequence: scene.sequence,
            error: error.message,
            failed: true
          });
        }
      }
    }

    console.log(`🎨 Generated ${images.filter(img => !img.failed).length}/${scenes.length} images successfully`);

    return {
      dream_summary: processedDream.summary,
      total_scenes: scenes.length,
      successful_images: images.filter(img => !img.failed).length,
      failed_images: images.filter(img => img.failed).length,
      images: images,
      generation_metadata: {
        concurrent: concurrent,
        delay: delay,
        total_time: Date.now(),
        model: "gemini-2.0-flash-preview-image-generation",
        ...imageOptions
      }
    };
  }

  /**
   * Create a styled prompt for watercolor comic generation
   * @param {string} basePrompt - The base image prompt from scene
   * @param {string} style - Style type (watercolor, etc.)
   * @returns {string} - Enhanced prompt with style
   */
  createStyledPrompt(basePrompt, style = "watercolor") {
    const styleMap = {
      watercolor: `Create a dreamy watercolor-style illustration in a PERFECT SQUARE format (1024x1024 pixels, 1:1 aspect ratio). The image MUST be exactly square with equal width and height - no rectangular dimensions allowed. The scene should be surreal, soft, and slightly abstract — as if taken from a vivid dream. Use muted pastel tones and fluid brushstrokes. The composition should be perfectly centered and balanced within the square frame, filling the entire square canvas completely, evoking emotion and wonder. CRITICAL: Generate a perfectly square image only. Scene: ${basePrompt}`,
      
      vintage: `Create a vintage comic book style illustration in a PERFECT SQUARE format (1024x1024 pixels, 1:1 aspect ratio). The image MUST be exactly square with equal width and height - no rectangular dimensions allowed. The scene should have a nostalgic, dream-like quality with soft, faded colors and gentle linework. The composition should be perfectly centered within the square frame with subtle textures, filling the entire square canvas completely. CRITICAL: Generate a perfectly square image only. Scene: ${basePrompt}`,
      
      minimal: `Create a minimalist illustration in a PERFECT SQUARE format (1024x1024 pixels, 1:1 aspect ratio). The image MUST be exactly square with equal width and height - no rectangular dimensions allowed. The scene should be simple yet evocative, with clean lines and soft colors, capturing the essence of a dream within the square composition. The image should fill the entire square canvas perfectly. CRITICAL: Generate a perfectly square image only. Scene: ${basePrompt}`,

      comic: `Create a comic book style illustration in a PERFECT SQUARE format (1024x1024 pixels, 1:1 aspect ratio). The image MUST be exactly square with equal width and height - no rectangular dimensions allowed. The scene should capture the dream-like narrative with vibrant colors and clear composition, perfectly balanced within the square frame, filling the entire square canvas completely. CRITICAL: Generate a perfectly square image only. Scene: ${basePrompt}`
    };

    return styleMap[style] || styleMap.watercolor;
  }

  /**
   * Save generated images to disk
   * @param {Array} images - Array of generated image objects
   * @param {string} dreamId - Dream ID for file naming
   * @param {string} outputDir - Output directory (default: 'generated_images')
   * @returns {Promise<Array>} - Array of saved file paths
   */
  async saveImages(images, dreamId, outputDir = 'generated_images') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const savedFiles = [];

    for (const image of images) {
      if (image.failed || !image.b64_json) continue;

      try {
        const filename = `dream_${dreamId}_scene_${image.scene_sequence}.png`;
        const filepath = path.join(outputDir, filename);
        
        const imageBuffer = Buffer.from(image.b64_json, 'base64');
        fs.writeFileSync(filepath, imageBuffer);
        
        savedFiles.push({
          scene_sequence: image.scene_sequence,
          filename: filename,
          filepath: filepath,
          size: imageBuffer.length
        });

        console.log(`💾 Saved image: ${filename} (${Math.round(imageBuffer.length / 1024)}KB)`);
      } catch (error) {
        console.error(`❌ Failed to save image for scene ${image.scene_sequence}:`, error.message);
      }
    }

    return savedFiles;
  }

  /**
   * Get service statistics and configuration info
   * @returns {Object} - Service stats
   */
  getStats() {
    return {
      service: 'Gemini Image Generation',
      model: 'gemini-2.0-flash-preview-image-generation',
      configured: this.isConfigured(),
      api_key_set: !!process.env.GEMINI_API_KEY,
      supported_styles: ['watercolor', 'vintage', 'minimal', 'comic']
    };
  }

  /**
   * Test the Gemini image generation service
   * @returns {Promise<Object>} - Test result
   */
  async testImageGeneration() {
    if (!this.client) {
      throw new Error('Gemini client not configured');
    }

    const testPrompt = "A dreamer stands in a magical forest with glowing fireflies, watercolor style, dreamy and surreal";
    
    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: testPrompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      let hasImage = false;
      let hasText = false;

      for (const part of response.candidates[0].content.parts) {
        if (part.text) hasText = true;
        if (part.inlineData) hasImage = true;
      }

      return {
        success: hasImage,
        model: "gemini-2.0-flash-preview-image-generation",
        test_prompt: testPrompt,
        response_has_image: hasImage,
        response_has_text: hasText
      };
    } catch (error) {
      throw new Error(`Gemini image generation test failed: ${error.message}`);
    }
  }
}

module.exports = ImageGenerationService; 