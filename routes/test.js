const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const geminiTranscriptionService = require('../services/GeminiTranscriptionService');
const dreamProcessingService = require('../services/DreamProcessingService');
const ImageGenerationService = require('../services/ImageGenerationService');

// Initialize the image generation service
const imageGenerationService = new ImageGenerationService();

// Test route to verify OpenAI connection
router.get('/openai', async (req, res) => {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('🧪 Testing OpenAI connection...');
    
    // Simple test - list models
    const models = await openai.models.list();
    
    res.json({
      success: true,
      message: 'OpenAI connection successful',
      modelCount: models.data.length,
      apiKeyValid: true
    });
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Test route for a simple text completion
router.post('/openai-text', async (req, res) => {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('🧪 Testing OpenAI text completion...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'OpenAI is working!'" }],
      max_tokens: 10
    });
    
    res.json({
      success: true,
      message: 'OpenAI text completion successful',
      response: completion.choices[0].message.content
    });
    
  } catch (error) {
    console.error('❌ OpenAI text test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Test route to verify Gemini connection
router.get('/gemini', async (req, res) => {
  try {
    console.log('🧪 Testing Gemini connection...');
    
    const result = await geminiTranscriptionService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        response: result.response,
        configured: geminiTranscriptionService.isConfigured()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        configured: geminiTranscriptionService.isConfigured()
      });
    }
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
      configured: geminiTranscriptionService.isConfigured()
    });
  }
});

// Test route for Gemini service info
router.get('/gemini-info', (req, res) => {
  try {
    res.json({
      success: true,
      geminiService: {
        configured: geminiTranscriptionService.isConfigured(),
        supportedFormats: geminiTranscriptionService.getSupportedFormats(),
        maxFileSize: '20MB',
        model: 'gemini-1.5-pro',
        provider: 'Gemini',
        hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test route for dream processing
router.post('/dream-processing', async (req, res) => {
  try {
    const { transcription } = req.body;
    
    if (!transcription) {
      return res.status(400).json({
        success: false,
        error: 'Transcription text is required in request body'
      });
    }

    console.log('🧪 Testing dream processing...');
    
    const result = await dreamProcessingService.processDream(transcription, {
      sceneCount: 4, // Smaller for testing
      includeEmotions: true,
      includeCharacters: true
    });
    
    const stats = dreamProcessingService.getProcessingStats(result);
    
    res.json({
      success: true,
      message: 'Dream processing test successful',
      result: result,
      stats: stats,
      configured: dreamProcessingService.isConfigured()
    });
    
  } catch (error) {
    console.error('❌ Dream processing test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
      configured: dreamProcessingService.isConfigured()
    });
  }
});

// Test route for image generation
router.post('/image-generation', async (req, res) => {
  try {
    const { scenes, style = 'watercolor', testMode = true } = req.body;
    
    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({
        success: false,
        error: 'Scenes array is required in request body'
      });
    }

    console.log('🧪 Testing image generation...');
    
    // Create a mock processed dream for testing
    const mockProcessedDream = {
      summary: "Test dream for image generation",
      scenes: scenes
    };

    const options = {
      style: style,
      concurrent: false,
      delay: 2000 // Increased delay for Gemini API
    };

    if (testMode) {
      // In test mode, just generate one image
      const testScene = scenes[0];
      const image = await imageGenerationService.generateSceneImage(testScene, options);
      
      res.json({
        success: true,
        message: 'Gemini image generation test successful',
        test_mode: true,
        scene: testScene,
        image: {
          scene_sequence: image.scene_sequence,
          styled_prompt: image.styled_prompt,
          response_text: image.response_text,
          generation_time: image.generation_time,
          model: image.model,
          has_image: !!image.b64_json
        },
        configured: imageGenerationService.isConfigured(),
        stats: imageGenerationService.getStats()
      });
    } else {
      // Generate all images
      const result = await imageGenerationService.generateDreamImages(mockProcessedDream, options);
      
      res.json({
        success: true,
        message: 'Full Gemini image generation test successful',
        test_mode: false,
        result: {
          ...result,
          images: result.images.map(img => ({
            ...img,
            b64_json: img.b64_json ? '[BASE64_DATA]' : null // Don't send full image data in test
          }))
        },
        configured: imageGenerationService.isConfigured(),
        stats: imageGenerationService.getStats()
      });
    }
    
  } catch (error) {
    console.error('❌ Image generation test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
      configured: imageGenerationService.isConfigured()
    });
  }
});

// Test route for image generation service info
router.get('/image-generation-info', (req, res) => {
  try {
    const stats = imageGenerationService.getStats();
    
    res.json({
      success: true,
      message: 'Gemini image generation service info',
      ...stats
    });
    
  } catch (error) {
    console.error('❌ Image generation info failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      configured: false
    });
  }
});

// Test route for Gemini image generation capability
router.get('/gemini-image-test', async (req, res) => {
  try {
    console.log('🧪 Testing Gemini image generation...');
    
    const result = await imageGenerationService.testImageGeneration();
    
    res.json({
      success: true,
      message: 'Gemini image generation test successful',
      ...result,
      configured: imageGenerationService.isConfigured(),
      stats: imageGenerationService.getStats()
    });
    
  } catch (error) {
    console.error('❌ Gemini image generation test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
      configured: imageGenerationService.isConfigured()
    });
  }
});

module.exports = router; 