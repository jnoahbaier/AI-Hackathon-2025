require('dotenv').config();

const dreamService = require('./services/DreamService');
const dreamProcessingService = require('./services/DreamProcessingService');

/**
 * Generate a better title using Gemini AI
 * @param {Object} dream - Dream object with processed data
 * @returns {Promise<string>} - Generated title
 */
async function generateBetterTitle(dream) {
  try {
    if (!dreamProcessingService.isConfigured()) {
      throw new Error('Gemini API not configured');
    }

    // Use the summary for better title generation
    const summary = dream.processedData?.summary || dream.transcription || '';
    const themes = dream.processedData?.themes || [];
    const mood = dream.processedData?.mood || '';
    
    if (!summary || summary.length < 10) {
      throw new Error('No content available for title generation');
    }
    
    // Create a more sophisticated prompt
    const titlePrompt = `Generate a creative, evocative title (3-8 words) for this dream. Make it poetic and memorable, capturing the essence and emotion:

DREAM SUMMARY: "${summary}"
MOOD: ${mood}
THEMES: ${themes.join(', ')}

Examples of good dream titles:
- "The Glass Forest Journey"
- "Racing Through Time"
- "Billionaire's Malibu Awakening"
- "Dancing with Smoke Spirits"
- "Echoes of Childhood Home"

Return ONLY the title, no quotes or additional text.`;

    const model = dreamProcessingService.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(titlePrompt);
    
    if (result?.response) {
      const generatedTitle = result.response.text().trim().replace(/^["']|["']$/g, '');
      return generatedTitle.length > 0 && generatedTitle.length <= 60 ? generatedTitle : null;
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️ AI title generation failed for dream ${dream.id}:`, error.message);
    return null;
  }
}

/**
 * Main regeneration function
 */
async function regenerateAITitles() {
  console.log('🔄 Starting AI title regeneration for processed dreams...');
  
  try {
    // Check if dream processing service is configured
    if (!dreamProcessingService.isConfigured()) {
      console.error('❌ Gemini API not configured. Please check your GEMINI_API_KEY in .env file');
      process.exit(1);
    }
    
    // Wait for DreamService to load dreams from file
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get dreams that have processed data (summaries)
    const dreams = dreamService.getAllDreams();
    console.log(`📚 Found ${dreams.length} total dreams`);
    
    // Filter dreams that have processed data and could benefit from better titles
    const dreamsWithProcessedData = dreams.filter(dream => 
      dream.processedData && 
      dream.processedData.summary && 
      dream.processedData.summary.length > 20
    );
    
    console.log(`🎯 ${dreamsWithProcessedData.length} dreams have processed data for AI title generation`);
    
    if (dreamsWithProcessedData.length === 0) {
      console.log('✅ No dreams with processed data found. Process some dreams first!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dream of dreamsWithProcessedData) {
      try {
        console.log(`\n🔄 Processing dream ${dream.id}...`);
        console.log(`📝 Current title: "${dream.title}"`);
        console.log(`📖 Summary: "${dream.processedData.summary.substring(0, 100)}..."`);
        
        const newTitle = await generateBetterTitle(dream);
        
        if (newTitle && newTitle !== dream.title) {
          // Update the dream
          await dreamService.updateDream(dream.id, { title: newTitle });
          console.log(`✅ Updated dream ${dream.id} with AI title: "${newTitle}"`);
          successCount++;
        } else {
          console.log(`⚠️ Keeping existing title for dream ${dream.id}`);
        }
        
        // Add delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to update dream ${dream.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 AI title regeneration completed!`);
    console.log(`✅ Successfully updated: ${successCount} dreams`);
    console.log(`⚠️ Kept existing titles: ${dreamsWithProcessedData.length - successCount - errorCount} dreams`);
    console.log(`❌ Failed to update: ${errorCount} dreams`);
    
  } catch (error) {
    console.error('❌ Regeneration failed:', error.message);
    process.exit(1);
  }
}

// Run the regeneration if this script is called directly
if (require.main === module) {
  regenerateAITitles()
    .then(() => {
      console.log('🏁 AI title regeneration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 AI title regeneration script failed:', error);
      process.exit(1);
    });
}

module.exports = { regenerateAITitles, generateBetterTitle }; 