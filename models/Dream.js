const { v4: uuidv4 } = require('uuid');

class Dream {
  constructor({
    id = uuidv4(), // ✅ preserve existing ID
    title = '',
    audioFilePath = null,
    transcription = null,
    processedData = null,
    comicImages = [],
    tags = [],
    mood = null,
    createdAt = new Date(),
    userId = null,
  } = {}) {
    this.id = id;
    this.title = title;
    this.audioFilePath = audioFilePath;
    this.transcription = transcription;
    this.processedData = processedData;
    this.comicImages = comicImages;
    this.tags = tags;
    this.mood = mood;
    this.createdAt = new Date(createdAt);
    this.updatedAt = new Date();
    this.userId = userId;
    this.status = 'uploaded';
  }

  // Update dream status
  updateStatus(status) {
    this.status = status;
    this.updatedAt = new Date();
  }

  // Add transcription
  setTranscription(transcription) {
    this.transcription = transcription;
    this.status = 'transcribed';
    this.updatedAt = new Date();
  }

  // Set processed dream data
  setProcessedData(processedData) {
    this.processedData = processedData;
    this.status = 'processed';
    this.updatedAt = new Date();
  }

  // Add comic images
  setComicImages(images) {
    this.comicImages = images;
    this.status = 'completed';
    this.updatedAt = new Date();
  }

  // Add tags
  addTags(tags) {
    this.tags = [...new Set([...this.tags, ...tags])]; // Remove duplicates
    this.updatedAt = new Date();
  }

  // Set mood
  setMood(mood) {
    this.mood = mood;
    this.updatedAt = new Date();
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      audioFilePath: this.audioFilePath,
      transcription: this.transcription,
      processedData: this.processedData,
      comicImages: this.comicImages,
      tags: this.tags,
      mood: this.mood,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userId: this.userId,
      status: this.status,
    };
  }
}

module.exports = Dream;
