const Dream = require('../models/Dream');
const fs = require('fs').promises;
const path = require('path');

class DreamService {
  constructor() {
    this.dreams = new Map(); // In-memory storage (replace with database later)
    this.dataFile = path.join(__dirname, '../data/dreams.json');
    this.loadDreams();
  }

  // Load dreams from file (simple persistence)
  async loadDreams() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const dreamsData = JSON.parse(data);
      
      dreamsData.forEach(dreamData => {
        const dream = new Dream(dreamData);
        this.dreams.set(dream.id, dream);
      });
      
      console.log(`📚 Loaded ${this.dreams.size} dreams from storage`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading dreams:', error);
      }
      // Create data directory if it doesn't exist
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    }
  }

  // Save dreams to file
  async saveDreams() {
    try {
      const dreamsArray = Array.from(this.dreams.values()).map(dream => dream.toJSON());
      await fs.writeFile(this.dataFile, JSON.stringify(dreamsArray, null, 2));
    } catch (error) {
      console.error('Error saving dreams:', error);
    }
  }

  // Create a new dream
  async createDream(dreamData) {
    const dream = new Dream(dreamData);
    this.dreams.set(dream.id, dream);
    await this.saveDreams();
    return dream;
  }

  // Get dream by ID
  getDreamById(id) {
    return this.dreams.get(id);
  }

  // Get all dreams
  getAllDreams(filters = {}) {
    let dreams = Array.from(this.dreams.values());

    // Apply filters
    if (filters.mood) {
      dreams = dreams.filter(dream => dream.mood === filters.mood);
    }

    if (filters.status) {
      dreams = dreams.filter(dream => dream.status === filters.status);
    }

    if (filters.tag) {
      dreams = dreams.filter(dream => dream.tags.includes(filters.tag));
    }

    if (filters.userId) {
      dreams = dreams.filter(dream => dream.userId === filters.userId);
    }

    // Sort by creation date (newest first)
    dreams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return dreams;
  }

  // Update dream
  async updateDream(id, updates) {
    const dream = this.dreams.get(id);
    if (!dream) {
      throw new Error('Dream not found');
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'tags', 'mood', 'transcription', 'processedData', 'comicImages', 'status'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'transcription') {
          dream.setTranscription(updates[field]);
        } else if (field === 'processedData') {
          dream.setProcessedData(updates[field]);
        } else if (field === 'comicImages') {
          dream.setComicImages(updates[field]);
        } else if (field === 'mood') {
          dream.setMood(updates[field]);
        } else if (field === 'tags') {
          dream.addTags(updates[field]);
        } else {
          dream[field] = updates[field];
          dream.updatedAt = new Date();
        }
      }
    });

    await this.saveDreams();
    return dream;
  }

  // Delete dream
  async deleteDream(id) {
    const dream = this.dreams.get(id);
    if (!dream) {
      throw new Error('Dream not found');
    }

    // Delete associated audio file if it exists
    if (dream.audioFilePath) {
      try {
        await fs.unlink(dream.audioFilePath);
      } catch (error) {
        console.error('Error deleting audio file:', error);
      }
    }

    this.dreams.delete(id);
    await this.saveDreams();
    return dream;
  }

  // Get dream statistics
  getStatistics() {
    const dreams = Array.from(this.dreams.values());
    const totalDreams = dreams.length;
    
    const statusCounts = dreams.reduce((acc, dream) => {
      acc[dream.status] = (acc[dream.status] || 0) + 1;
      return acc;
    }, {});

    const moodCounts = dreams.reduce((acc, dream) => {
      if (dream.mood) {
        acc[dream.mood] = (acc[dream.mood] || 0) + 1;
      }
      return acc;
    }, {});

    const recentDreams = dreams
      .filter(dream => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(dream.createdAt) > weekAgo;
      }).length;

    return {
      totalDreams,
      recentDreams,
      statusCounts,
      moodCounts
    };
  }
}

module.exports = new DreamService(); 