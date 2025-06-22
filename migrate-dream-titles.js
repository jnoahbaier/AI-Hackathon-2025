require('dotenv').config();

const dreamService = require('./services/DreamService');
const dreamProcessingService = require('./services/DreamProcessingService');

/**
 * Generate a fallback title from a summary or transcription
 * @param {string} text - Summary or transcription text
 * @returns {string} - Generated title
 */
function generateFallbackTitle(text) {
  if (!text || text.length < 10) return 'Mysterious Dream';
  
  // Extract key words and themes
  const words = text.toLowerCase().split(/\s+/);
  const dreamKeywords = {
    flying: 'Flying Dream',
    falling: 'The Fall',
    chase: 'The Chase',
    water: 'Water Dreams',
    forest: 'Forest Journey',
    house: 'Dream House',
    family: 'Family Reunion',
    school: 'Back to School',
    work: 'Work Nightmare',
    animal: 'Animal Encounter',
    car: 'Road Trip',
    fire: 'Flames of Dreams',
    dark: 'Dark Visions',
    light: 'Light Dreams',
    mountain: 'Mountain Quest',
    ocean: 'Ocean Dreams',
    city: 'City Adventures',
    childhood: 'Childhood Memories',
    lost: 'Lost and Found',
    running: 'The Run',
    monster: 'Monster Encounter',
    ghost: 'Ghostly Visions',
    magic: 'Magic Dreams',
    death: 'Life and Death',
    love: 'Love Dreams',
    fear: 'Fear Unleashed',
    happy: 'Joyful Dreams',
    sad: 'Melancholy Dreams',
    strange: 'Strange Visions',
    weird: 'Weird Dreams'
  };
  
  // Check for keyword matches
  for (const [keyword, title] of Object.entries(dreamKeywords)) {
    if (words.some(word => word.includes(keyword))) {
      return title;
    }
  }
  
  // Generate title from first few meaningful words
  const meaningfulWords = words.filter(word => 
    word.length > 3 && 
    !['the', 'and', 'was', 'were', 'had', 'have', 'that', 'this', 'with', 'from', 'they', 'them', 'there', 'then'].includes(word)
  );
  
  if (meaningfulWords.length >= 2) {
    const title = meaningfulWords.slice(0, 3)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${title} Dream`;
  }
  
  // Fallback based on text characteristics
  if (text.includes('!') || text.includes('scared') || text.includes('afraid')) {
    return 'Intense Dream';
  } else if (text.includes('beautiful') || text.includes('wonderful') || text.includes('amazing')) {
    return 'Beautiful Dream';
  } else if (text.includes('strange') || text.includes('weird') || text.includes('odd')) {
    return 'Strange Dream';
  }
  
  return 'Mysterious Dream';
}

/**
 * Generate a title using Gemini AI for a single dream
 * @param {Object} dream - Dream object
 * @returns {Promise<string>} - Generated title
 */
async function generateAITitle(dream) {
  try {
    // Use the transcription or summary to generate a title
    const textToAnalyze = dream.transcription || dream.processedData?.summary || '';
    
    if (!textToAnalyze || textToAnalyze.length < 10) {
      return generateFallbackTitle(textToAnalyze);
    }
    
    // Use a simple title generation prompt with Gemini
    const titlePrompt = `Generate a catchy, descriptive title (3-8 words) for this dream. Make it evocative and memorable:

"${textToAnalyze.substring(0, 500)}"

Return ONLY the title, no quotes or additional text.`;

    const result = await dreamProcessingService.genAI?.getGenerativeModel({ model: "gemini-1.5-pro" })
      .generateContent(titlePrompt);
    
    if (result?.response) {
      const generatedTitle = result.response.text().trim().replace(/^["']|["']$/g, '');
      return generatedTitle.length > 0 && generatedTitle.length <= 50 ? generatedTitle : generateFallbackTitle(textToAnalyze);
    }
    
    return generateFallbackTitle(textToAnalyze);
  } catch (error) {
    console.warn(`⚠️ AI title generation failed for dream ${dream.id}:`, error.message);
    return generateFallbackTitle(dream.transcription || dream.processedData?.summary || '');
  }
}

/**
 * Main migration function
 */
async function migrateDreamTitles() {
  console.log('🔄 Starting dream title migration...');
  
  try {
    // Check if dream processing service is configured
    if (!dreamProcessingService.isConfigured()) {
      console.log('⚠️ Gemini API not configured, using fallback title generation only');
    }
    
    // Wait for DreamService to load dreams from file
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all dreams
    const dreams = dreamService.getAllDreams();
    console.log(`📚 Found ${dreams.length} dreams to check`);
    
    // Filter dreams that need title updates
    const dreamsNeedingTitles = dreams.filter(dream => 
      !dream.title || 
      dream.title === 'Untitled Dream' || 
      dream.title === '' ||
      dream.title.startsWith('Dream Recording') || // Generic titles like "Dream Recording 6/21/2025"
      dream.title.startsWith('Dream ') // Generic titles like "Dream 12/21/2024"
    );
    
    console.log(`🎯 ${dreamsNeedingTitles.length} dreams need title updates`);
    
    if (dreamsNeedingTitles.length === 0) {
      console.log('✅ All dreams already have meaningful titles!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dream of dreamsNeedingTitles) {
      try {
        console.log(`\n🔄 Processing dream ${dream.id}...`);
        
        let newTitle;
        
        // Try AI generation first if available
        if (dreamProcessingService.isConfigured()) {
          newTitle = await generateAITitle(dream);
          console.log(`🤖 AI generated title: "${newTitle}"`);
          
          // Add a small delay to respect API limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Use fallback generation
          const textSource = dream.transcription || dream.processedData?.summary || '';
          newTitle = generateFallbackTitle(textSource);
          console.log(`🔧 Fallback generated title: "${newTitle}"`);
        }
        
        // Update the dream
        await dreamService.updateDream(dream.id, { title: newTitle });
        console.log(`✅ Updated dream ${dream.id} with title: "${newTitle}"`);
        
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to update dream ${dream.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully updated: ${successCount} dreams`);
    console.log(`❌ Failed to update: ${errorCount} dreams`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is called directly
if (require.main === module) {
  migrateDreamTitles()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDreamTitles, generateFallbackTitle, generateAITitle }; 