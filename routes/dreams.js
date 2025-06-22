const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const dreamService = require('../services/DreamService');
const geminiTranscriptionService = require('../services/GeminiTranscriptionService');
const dreamProcessingService = require('../services/DreamProcessingService');
const ImageGenerationService = require('../services/ImageGenerationService');

// Initialize the image generation service
const imageGenerationService = new ImageGenerationService();

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'dream-audio-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50000000, // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedMimeTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
    ];

    if (
      file.mimetype.startsWith('audio/') ||
      allowedMimeTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only audio files are allowed. Supported formats: MP3, WAV, WebM, OGG, M4A'
        ),
        false
      );
    }
  },
});

// Validation middleware
const validateDream = [
  body('title').optional().isLength({ min: 1, max: 200 }).trim(),
  body('tags').optional().isArray(),
  body('mood')
    .optional()
    .isIn([
      'happy',
      'sad',
      'scary',
      'weird',
      'exciting',
      'peaceful',
      'confusing',
      'romantic',
    ]),
  body('userId').optional().isUUID(),
];

const validateDreamUpdate = [
  body('title').optional().isLength({ min: 1, max: 200 }).trim(),
  body('tags').optional().isArray(),
  body('mood')
    .optional()
    .isIn([
      'happy',
      'sad',
      'scary',
      'weird',
      'exciting',
      'peaceful',
      'confusing',
      'romantic',
    ]),
  body('transcription').optional().isString(),
  body('comicImages').optional().isArray(),
];

// GET /api/dreams - Get all dreams with optional filtering
router.get(
  '/',
  [
    query('mood')
      .optional()
      .isIn([
        'happy',
        'sad',
        'scary',
        'weird',
        'exciting',
        'peaceful',
        'confusing',
        'romantic',
      ]),
    query('status')
      .optional()
      .isIn([
        'uploaded',
        'transcribing',
        'transcribed',
        'generating_images',
        'completed',
        'error',
      ]),
    query('tag').optional().isString(),
    query('userId').optional().isUUID(),
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const filters = {
        mood: req.query.mood,
        status: req.query.status,
        tag: req.query.tag,
        userId: req.query.userId,
      };

      const dreams = dreamService.getAllDreams(filters);
      res.json({
        success: true,
        count: dreams.length,
        dreams: dreams.map((dream) => dream.toJSON()),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// GET /api/dreams/:id/image/:scene - Find and serve image for specific dream and scene
router.get('/:id/image/:scene', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const dreamId = req.params.id;
    const sceneNumber = parseInt(req.params.scene);
    
    if (isNaN(sceneNumber) || sceneNumber < 1 || sceneNumber > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scene number. Must be between 1 and 10.',
      });
    }
    
    // First try to get the dream to check if it exists and has metadata
    const dream = dreamService.getDreamById(dreamId);
    
    // Check if we have saved files metadata (only if dream exists)
    if (dream && dream.comicImages && dream.comicImages.generation_metadata && dream.comicImages.generation_metadata.saved_files) {
      const savedFile = dream.comicImages.generation_metadata.saved_files.find(
        file => file.scene_sequence === sceneNumber
      );
      if (savedFile) {
        const imagePath = path.join(__dirname, '..', 'generated_images', savedFile.filename);
        if (fs.existsSync(imagePath)) {
          return res.sendFile(imagePath);
        }
      }
    }
    
    // Fallback: Search for any file matching the dream ID and scene pattern
    const generatedImagesDir = path.join(__dirname, '..', 'generated_images');
    if (fs.existsSync(generatedImagesDir)) {
      const files = fs.readdirSync(generatedImagesDir);
      
      // Look for files that match the pattern: dream_*_scene_X.png
      const scenePattern = new RegExp(`dream_.*_scene_${sceneNumber}\\.png$`);
      const matchingFile = files.find(filename => scenePattern.test(filename));
      
      if (matchingFile) {
        const imagePath = path.join(generatedImagesDir, matchingFile);
        console.log(`📸 Found fallback image for dream ${dreamId} scene ${sceneNumber}: ${matchingFile}`);
        return res.sendFile(imagePath);
      }
    }
    
    // No image found
    res.status(404).json({
      success: false,
      error: `Image not found for dream ${dreamId} scene ${sceneNumber}`,
    });
    
  } catch (error) {
    console.error('❌ Image lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// GET /api/dreams/:id - Get specific dream
router.get('/:id', (req, res) => {
  try {
    const dream = dreamService.getDreamById(req.params.id);
    if (!dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found',
      });
    }

    res.json({
      success: true,
      dream: dream.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/dreams/upload - Upload audio and create new dream
router.post(
  '/upload',
  upload.single('audio'),
  validateDream,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required',
        });
      }

      const dreamData = {
        title: req.body.title || `Dream ${new Date().toLocaleDateString()}`,
        audioFilePath: req.file.path,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        mood: req.body.mood,
        userId: req.body.userId,
      };

      const dream = await dreamService.createDream(dreamData);

      res.status(201).json({
        success: true,
        message: 'Dream uploaded successfully',
        dream: dream.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/dreams - Create dream without audio (for testing)
router.post('/', validateDream, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dreamData = {
      title: req.body.title || `Dream ${new Date().toLocaleDateString()}`,
      tags: req.body.tags || [],
      mood: req.body.mood,
      userId: req.body.userId,
      transcription: req.body.transcription, // Allow manual transcription for testing
    };

    const dream = await dreamService.createDream(dreamData);

    res.status(201).json({
      success: true,
      message: 'Dream created successfully',
      dream: dream.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/dreams/:id - Update dream
router.put('/:id', validateDreamUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dream = await dreamService.updateDream(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Dream updated successfully',
      dream: dream.toJSON(),
    });
  } catch (error) {
    if (error.message === 'Dream not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/dreams/:id - Delete dream
router.delete('/:id', async (req, res) => {
  try {
    const dream = await dreamService.deleteDream(req.params.id);

    res.json({
      success: true,
      message: 'Dream deleted successfully',
      dream: dream.toJSON(),
    });
  } catch (error) {
    if (error.message === 'Dream not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/dreams/:id/transcribe - Transcribe audio using OpenAI Whisper
router.post('/:id/transcribe', async (req, res) => {
  try {
    const dream = dreamService.getDreamById(req.params.id);
    if (!dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found',
      });
    }

    if (!dream.audioFilePath) {
      return res.status(400).json({
        success: false,
        error: 'No audio file found for this dream',
      });
    }

    // Check if transcription service is configured
    if (!geminiTranscriptionService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini transcription service not configured. Please check your GEMINI_API_KEY.',
      });
    }

    // Update status to transcribing
    await dreamService.updateDream(req.params.id, { status: 'transcribing' });

    try {
      // Perform transcription with metadata
      const result = await geminiTranscriptionService.transcribeWithMetadata(
        dream.audioFilePath
      );

      // Update dream with transcription
      const updatedDream = await dreamService.updateDream(req.params.id, {
        transcription: result.text,
        status: 'transcribed',
      });

      res.json({
        success: true,
        message: 'Transcription completed successfully',
        dream_id: req.params.id,
        transcription: result.text,
        metadata: result.metadata,
        dream: updatedDream.toJSON(),
      });
    } catch (transcriptionError) {
      // Update dream status to error
      await dreamService.updateDream(req.params.id, { status: 'error' });

      res.status(500).json({
        success: false,
        error: 'Transcription failed',
        details: transcriptionError.message,
        dream_id: req.params.id,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/dreams/:id/process - Process transcribed dream into scenes for comic generation
router.post('/:id/process', async (req, res) => {
  try {
    const dream = dreamService.getDreamById(req.params.id);
    if (!dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found',
      });
    }

    if (!dream.transcription) {
      return res.status(400).json({
        success: false,
        error: 'Dream must be transcribed before processing',
      });
    }

    // Check if processing service is configured
    if (!dreamProcessingService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error:
          'Dream processing service not configured. Please check your GEMINI_API_KEY.',
      });
    }

    // Update status to processing
    await dreamService.updateDream(req.params.id, { status: 'processing' });

    try {
      // Extract processing options from request body
      const {
        sceneCount = 6,
        includeEmotions = true,
        includeCharacters = true,
      } = req.body;

      // Process the dream transcription
      const processedData = await dreamProcessingService.processDream(
        dream.transcription,
        {
          sceneCount,
          includeEmotions,
          includeCharacters,
        }
      );

      // Update dream with processed data
      const updatedDream = await dreamService.updateDream(req.params.id, {
        processedData: processedData,
        title: processedData.title || 'Untitled Dream', // Save the generated title
        status: 'processed',
      });

      // Get processing statistics
      const stats = dreamProcessingService.getProcessingStats(processedData);

      res.json({
        success: true,
        message: 'Dream processing completed successfully',
        dream_id: req.params.id,
        processedData: processedData,
        stats: stats,
        dream: updatedDream.toJSON(),
      });
    } catch (processingError) {
      // Update dream status to error
      await dreamService.updateDream(req.params.id, { status: 'error' });

      res.status(500).json({
        success: false,
        error: 'Dream processing failed',
        details: processingError.message,
        dream_id: req.params.id,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/dreams/:id/generate-images - Generate watercolor comic images from processed dream
router.post('/:id/generate-images', async (req, res) => {
  try {
    const dream = dreamService.getDreamById(req.params.id);
    if (!dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found',
      });
    }

    if (!dream.processedData) {
      return res.status(400).json({
        success: false,
        error:
          'Dream must be processed before generating images. Call /process endpoint first.',
      });
    }

    // Check if image generation service is configured
    if (!imageGenerationService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini image generation service not configured. Please check your GEMINI_API_KEY.',
      });
    }

    const {
      style = 'watercolor',
      concurrent = false,
      delay = 2000,
      saveToFile = true,
    } = req.body;

    // Update status to generating images
    await dreamService.updateDream(req.params.id, {
      status: 'generating_images',
    });

    console.log(
      `🎨 Starting image generation for dream ${req.params.id} with ${dream.processedData.scenes.length} scenes`
    );

    const startTime = Date.now();

    try {
      // Generate all images for the dream
      const imageResults = await imageGenerationService.generateDreamImages(
        dream.processedData,
        {
          style,
          concurrent,
          delay,
        }
      );

      // Save images to disk if requested
      let savedFiles = [];
      if (saveToFile && imageResults.images.length > 0) {
        savedFiles = await imageGenerationService.saveImages(
          imageResults.images,
          req.params.id
        );
      }

      const totalTime = Date.now() - startTime;

      // Update dream with generated images
      const imageData = {
        images: imageResults.images.map((img) => ({
          scene_sequence: img.scene_sequence,
          scene_description: img.scene_description,
          styled_prompt: img.styled_prompt,
          response_text: img.response_text,
          generation_time: img.generation_time,
          model: img.model,
          failed: img.failed || false,
          error: img.error || null,
        })),
        generation_metadata: {
          ...imageResults.generation_metadata,
          total_time: totalTime,
          style,
          saved_files: savedFiles,
        },
      };

      await dreamService.updateDream(req.params.id, {
        status: 'completed',
        comicImages: imageData,
      });

      console.log(
        `✅ Image generation completed for dream ${req.params.id} in ${totalTime}ms`
      );
      console.log(
        `🎨 Generated ${imageResults.successful_images}/${imageResults.total_scenes} images successfully`
      );

      res.json({
        success: true,
        message: `Generated ${imageResults.successful_images}/${imageResults.total_scenes} images successfully`,
        dream_id: req.params.id,
        summary: imageResults.dream_summary,
        total_scenes: imageResults.total_scenes,
        successful_images: imageResults.successful_images,
        failed_images: imageResults.failed_images,
        total_time: totalTime,
        images: imageResults.images,
        saved_files: savedFiles,
        generation_metadata: imageResults.generation_metadata,
      });
    } catch (error) {
      console.error(
        `❌ Image generation failed for dream ${req.params.id}:`,
        error
      );

      await dreamService.updateDream(req.params.id, {
        status: 'error',
        error: `Image generation failed: ${error.message}`,
      });

      res.status(500).json({
        success: false,
        error: 'Image generation failed',
        details: error.message,
        dream_id: req.params.id,
      });
    }
  } catch (error) {
    console.error('❌ Generate images endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// GET /api/dreams/stats - Get dream statistics
router.get('/stats/overview', (req, res) => {
  try {
    const stats = dreamService.getStatistics();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/dreams/transcription/info - Get transcription service info
router.get('/transcription/info', (req, res) => {
  try {
    res.json({
      success: true,
      transcriptionService: {
        configured: geminiTranscriptionService.isConfigured(),
        supportedFormats: geminiTranscriptionService.getSupportedFormats(),
        maxFileSize: '20MB',
        model: 'gemini-1.5-pro',
        provider: 'Gemini',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
