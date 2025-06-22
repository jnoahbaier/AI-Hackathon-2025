# Dream Recorder Backend

A backend API for recording dreams via audio, transcribing them, and generating comic strip visualizations.

## Features

- 🎙️ Audio file upload and storage
- 📝 Dream transcription (placeholder endpoints)
- 🎨 Comic strip generation (placeholder endpoints)
- 📊 Dream statistics and analytics
- 🏷️ Dream tagging and mood tracking
- 🔍 Filtering and search capabilities
- 💾 Simple file-based persistence (easily replaceable with a database)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

4. **The server will run on http://localhost:3000**

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check with statistics

### Dreams
- `GET /api/dreams` - Get all dreams (with optional filters)
- `GET /api/dreams/:id` - Get specific dream
- `POST /api/dreams/upload` - Upload audio file and create dream
- `POST /api/dreams` - Create dream without audio (for testing)
- `PUT /api/dreams/:id` - Update dream
- `DELETE /api/dreams/:id` - Delete dream
- `GET /api/dreams/stats/overview` - Get dream statistics

### Processing (Placeholder endpoints)
- `POST /api/dreams/:id/transcribe` - Start transcription process
- `POST /api/dreams/:id/generate-comic` - Generate comic from transcription

## Dream Data Structure

```json
{
  "id": "uuid",
  "title": "Dream Title",
  "audioFilePath": "/path/to/audio.mp3",
  "transcription": "Transcribed dream text...",
  "comicImages": ["image1.jpg", "image2.jpg"],
  "tags": ["flying", "adventure"],
  "mood": "exciting",
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T10:05:00Z",
  "userId": "user-uuid",
  "status": "completed"
}
```

## API Usage Examples

### Upload Audio Dream
```bash
curl -X POST http://localhost:3000/api/dreams/upload \
  -F "audio=@dream.mp3" \
  -F "title=My Amazing Dream" \
  -F "mood=exciting" \
  -F "tags=[\"flying\", \"adventure\"]"
```

### Get All Dreams
```bash
curl http://localhost:3000/api/dreams
```

### Filter Dreams by Mood
```bash
curl "http://localhost:3000/api/dreams?mood=exciting"
```

### Update Dream with Transcription
```bash
curl -X PUT http://localhost:3000/api/dreams/{dream-id} \
  -H "Content-Type: application/json" \
  -d '{"transcription": "I was flying over a beautiful landscape..."}'
```

## File Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── models/
│   └── Dream.js          # Dream data model
├── services/
│   └── DreamService.js   # Business logic and data management
├── routes/
│   ├── health.js         # Health check endpoints
│   └── dreams.js         # Dream API endpoints
├── uploads/              # Audio file storage (auto-created)
└── data/
    └── dreams.json       # Simple file-based storage (auto-created)
```

## Available Moods
- happy
- sad
- scary
- weird
- exciting
- peaceful
- confusing
- romantic

## Dream Status Flow
1. `uploaded` - Audio file uploaded
2. `transcribing` - Transcription in progress
3. `transcribed` - Transcription completed
4. `generating_images` - Comic generation in progress
5. `completed` - All processing done
6. `error` - Error occurred during processing

## Adding API Integrations

The backend includes placeholder endpoints for:

1. **Transcription** (`POST /api/dreams/:id/transcribe`)
   - Add your speech-to-text API integration here
   - Popular options: OpenAI Whisper, Google Speech-to-Text, Azure Speech

2. **Image Generation** (`POST /api/dreams/:id/generate-comic`)
   - Add your text-to-image API integration here
   - Popular options: DALL-E, Midjourney, Stable Diffusion

## Future Enhancements

- [ ] Replace file-based storage with a proper database (PostgreSQL, MongoDB)
- [ ] Add user authentication and authorization
- [ ] Implement real-time notifications for processing status
- [ ] Add audio format conversion and compression
- [ ] Implement caching for frequently accessed dreams
- [ ] Add backup and restore functionality
- [ ] Implement rate limiting for API endpoints
- [ ] Add comprehensive logging and monitoring

## Development

### Running Tests
```bash
npm test
```

### Project Structure Guidelines
- **Models**: Data structures and business entities
- **Services**: Business logic and data management
- **Routes**: API endpoint definitions
- **Middleware**: Request/response processing

### Adding New Features
1. Define the data model in `/models`
2. Implement business logic in `/services`
3. Create API routes in `/routes`
4. Add appropriate validation and error handling 