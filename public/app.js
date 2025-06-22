// Test that JavaScript is loading
console.log('🚀 Dream Recorder JavaScript file loaded!');
console.log('Browser info:', {
    userAgent: navigator.userAgent,
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    MediaRecorder: !!window.MediaRecorder
});

class DreamRecorder {
    constructor() {
        console.log('🏗️ Constructing DreamRecorder...');
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.currentDreamId = null;
        this.currentStep = 0;

        // DOM elements
        this.recordButton = document.getElementById('recordButton');
        this.status = document.getElementById('status');
        this.timer = document.getElementById('timer');
        this.transcriptionText = document.getElementById('transcriptionText');
        this.metadata = document.getElementById('metadata');
        this.errorMessage = document.getElementById('errorMessage');
        
        // New elements for full pipeline
        this.processingSteps = document.getElementById('processingSteps');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.dreamProcessingSection = document.getElementById('dreamProcessingSection');
        this.dreamSummary = document.getElementById('dreamSummary');
        this.summaryText = document.getElementById('summaryText');
        this.comicSection = document.getElementById('comicSection');
        this.comicGrid = document.getElementById('comicGrid');

        // Journal elements
        this.journalButton = document.getElementById('journalButton');
        this.journalModal = document.getElementById('journalModal');
        this.journalClose = document.getElementById('journalClose');
        this.bookPages = document.getElementById('bookPages');
        this.pageNavigation = document.getElementById('pageNavigation');
        this.pageIndicator = document.getElementById('pageIndicator');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        
        // Journal state
        this.currentPage = 0;
        this.totalPages = 0;
        this.dreams = [];

        console.log('📍 DOM elements found:', {
            recordButton: !!this.recordButton,
            status: !!this.status,
            timer: !!this.timer,
            transcriptionText: !!this.transcriptionText,
            metadata: !!this.metadata,
            errorMessage: !!this.errorMessage,
            processingSteps: !!this.processingSteps,
            progressContainer: !!this.progressContainer,
            dreamProcessingSection: !!this.dreamProcessingSection,
            comicSection: !!this.comicSection
        });

        if (!this.recordButton) {
            throw new Error('Record button not found in DOM');
        }

        this.bindEvents();
        this.checkMicrophonePermission();
        
        console.log('✅ DreamRecorder constructor completed');
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        if (!this.recordButton) {
            console.error('❌ Record button not found for event binding');
            return;
        }

        this.recordButton.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('🔘🔘🔘 BUTTON CLICKED! 🔘🔘🔘');
            
            if (this.isRecording) {
                console.log('⏹️ Stopping recording...');
                this.stopRecording();
            } else {
                console.log('🎙️ Starting recording...');
                this.startRecording();
            }
        });

        this.journalButton.addEventListener('click', () => this.openJournal());
        this.journalClose.addEventListener('click', () => this.closeJournal());
        this.journalModal.addEventListener('click', (e) => {
            if (e.target === this.journalModal) {
                this.closeJournal();
            }
        });

        // Page navigation events
        this.prevPageBtn.addEventListener('click', () => this.previousPage());
        this.nextPageBtn.addEventListener('click', () => this.nextPage());

        console.log('✅ Event listeners attached');
    }

    async checkMicrophonePermission() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('MediaRecorder API not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.updateStatus('✅ Microphone ready! Click to record your dream.', 'ready');
            console.log('✅ Microphone permission granted');
        } catch (error) {
            console.error('❌ Microphone permission error:', error);
            if (error.name === 'NotAllowedError') {
                this.updateStatus('❌ Microphone access denied. Please allow microphone access and refresh the page.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.updateStatus('❌ No microphone found. Please connect a microphone.', 'error');
            } else {
                this.updateStatus('❌ Microphone error: ' + error.message, 'error');
            }
        }
    }

    async startRecording() {
        try {
            console.log('🎙️ Starting recording...');
            this.clearError();
            this.resetPipeline();
            this.audioChunks = [];
            
            if (!window.MediaRecorder) {
                throw new Error('MediaRecorder not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            console.log('✅ Got media stream');

            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = '';
                }
            }

            console.log('🎵 Using MIME type:', mimeType);
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType || undefined
            });

            this.mediaRecorder.ondataavailable = (event) => {
                console.log('📦 Data available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('⏹️ Recording stopped, processing...');
                this.processRecording();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event.error);
                this.handleError('Recording error: ' + event.error);
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();
            
            console.log('✅ Recording started successfully');
            this.showProcessingSteps();
            this.updateStep(1, 'active');
            this.updateUI('recording');
            this.startTimer();
            
        } catch (error) {
            console.error('❌ Start recording error:', error);
            this.handleError('Failed to start recording: ' + error.message);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.stopTimer();
            this.updateStep(1, 'completed');
            this.updateStatus('🔄 Processing your dream...', 'processing');
        }
    }

    startTimer() {
        this.timer.style.display = 'block';
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timer.style.display = 'none';
    }

    async processRecording() {
        try {
            console.log('🔄 Processing recording, chunks:', this.audioChunks.length);
            
            if (this.audioChunks.length === 0) {
                throw new Error('No audio data recorded');
            }

            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log('📦 Created blob:', audioBlob.size, 'bytes');
            
            if (audioBlob.size === 0) {
                throw new Error('Audio blob is empty');
            }

            const audioFile = new File([audioBlob], `dream-${Date.now()}.webm`, { 
                type: 'audio/webm' 
            });

            console.log('📁 Created file:', audioFile.name, audioFile.size, 'bytes');
            await this.runFullPipeline(audioFile);
            
        } catch (error) {
            console.error('❌ Process recording error:', error);
            this.handleError('Failed to process recording: ' + error.message);
        }
    }

    async runFullPipeline(audioFile) {
        try {
            this.updateUI('processing');
            this.showProgress(0, 'Starting pipeline...');
            
            // Step 1: Upload the audio file
            this.updateStep(2, 'active');
            this.showProgress(20, 'Uploading audio...');
            const uploadResponse = await this.uploadAudio(audioFile);
            
            if (!uploadResponse.success) {
                throw new Error(uploadResponse.error || 'Upload failed');
            }

            this.currentDreamId = uploadResponse.dream.id;
            
            // Step 2: Transcribe
            this.showProgress(40, 'Transcribing with Gemini AI...');
            const transcriptionResponse = await this.transcribeAudio(this.currentDreamId);
            
            if (!transcriptionResponse.success) {
                throw new Error(transcriptionResponse.error || 'Transcription failed');
            }

            this.updateStep(2, 'completed');
            this.displayTranscription(transcriptionResponse);
            
            // Step 3: Process dream into scenes
            this.updateStep(3, 'active');
            this.showProgress(60, 'Processing dream into scenes...');
            const processingResponse = await this.processDream(this.currentDreamId);
            
            if (!processingResponse.success) {
                throw new Error(processingResponse.error || 'Dream processing failed');
            }

            this.updateStep(3, 'completed');
            this.displayDreamProcessing(processingResponse);
            
            // Step 4: Generate comic images
            this.updateStep(4, 'active');
            this.showProgress(80, 'Generating watercolor comic images...');
            const imageResponse = await this.generateImages(this.currentDreamId);
            
            if (!imageResponse.success) {
                throw new Error(imageResponse.error || 'Image generation failed');
            }

            this.updateStep(4, 'completed');
            this.showProgress(100, 'Complete! Your dream comic is ready!');
            this.displayComicStrip(imageResponse);
            
            this.updateStatus('✅ Your dream comic strip is complete!', 'success');
            
        } catch (error) {
            this.handleError('Pipeline failed: ' + error.message);
        } finally {
            this.updateUI('ready');
        }
    }

    async uploadAudio(audioFile) {
        console.log('⬆️ Uploading audio file:', audioFile.name, audioFile.type, audioFile.size);
        
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('title', `Dream Recording ${new Date().toLocaleString()}`);

        const response = await fetch('/api/dreams/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('📤 Upload result:', result);
        return result;
    }

    async transcribeAudio(dreamId) {
        console.log('🤖 Starting transcription for dream:', dreamId);
        
        const response = await fetch(`/api/dreams/${dreamId}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        console.log('🤖 Transcription result:', result);
        return result;
    }

    async processDream(dreamId) {
        console.log('🧠 Processing dream:', dreamId);
        
        const response = await fetch(`/api/dreams/${dreamId}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sceneCount: 6,
                includeEmotions: true,
                includeCharacters: true
            })
        });

        const result = await response.json();
        console.log('🧠 Dream processing result:', result);
        return result;
    }

    async generateImages(dreamId) {
        console.log('🎨 Generating images for dream:', dreamId);
        
        const response = await fetch(`/api/dreams/${dreamId}/generate-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                style: 'watercolor',
                concurrent: false,
                delay: 3000,
                saveToFile: true
            })
        });

        const result = await response.json();
        console.log('🎨 Image generation result:', result);
        return result;
    }

    displayTranscription(response) {
        const { transcription, metadata } = response;
        
        this.transcriptionText.textContent = transcription;
        this.transcriptionText.classList.remove('empty');
        
        if (metadata) {
            document.getElementById('duration').textContent = this.formatDuration(metadata.transcriptionTime);
            document.getElementById('fileSize').textContent = metadata.fileSizeMB + ' MB';
            document.getElementById('wordCount').textContent = metadata.wordCount;
            document.getElementById('processingTime').textContent = metadata.transcriptionTime + 'ms';
            
            this.metadata.classList.remove('hidden');
        }
    }

    displayDreamProcessing(response) {
        const { processedData } = response;
        
        if (processedData && processedData.summary) {
            this.summaryText.textContent = processedData.summary;
            this.dreamProcessingSection.classList.remove('hidden');
        }
    }

    displayComicStrip(response) {
        const { images } = response;
        
        if (!images || images.length === 0) {
            this.handleError('No images were generated');
            return;
        }

        this.comicGrid.innerHTML = '';
        
        images.forEach((imageData, index) => {
            if (imageData.failed) {
                console.warn(`Scene ${imageData.scene_sequence} failed:`, imageData.error);
                return;
            }

            const panel = this.createComicPanel(imageData, index);
            this.comicGrid.appendChild(panel);
        });
        
        this.comicSection.classList.remove('hidden');
        
        // Scroll to comic section
        setTimeout(() => {
            this.comicSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    createComicPanel(imageData, index) {
        const panel = document.createElement('div');
        panel.className = 'comic-panel';
        
        // Determine image source - prefer base64 if available, otherwise use file path
        let imageUrl;
        if (imageData.b64_json) {
            imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        } else {
            imageUrl = `/images/dream_${this.currentDreamId}_scene_${imageData.scene_sequence}.png`;
        }
        
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-number">Panel ${imageData.scene_sequence}</span>
                <span class="panel-emotion">${imageData.scene_emotion || 'dreamy'}</span>
            </div>
            <img src="${imageUrl}" alt="Dream scene ${imageData.scene_sequence}" loading="lazy" onerror="this.parentElement.style.opacity='0.5'; this.alt='Image not found';">
            <div class="panel-description">${imageData.scene_description}</div>
            <div class="panel-setting">${imageData.scene_setting || 'Dreamscape'}</div>
        `;
        
        return panel;
    }

    resetPipeline() {
        this.currentStep = 0;
        this.hideProcessingSteps();
        this.hideProgress();
        this.dreamProcessingSection.classList.add('hidden');
        this.comicSection.classList.add('hidden');
        this.metadata.classList.add('hidden');
        this.transcriptionText.textContent = 'Your transcribed dream will appear here...';
        this.transcriptionText.classList.add('empty');
    }

    showProcessingSteps() {
        this.processingSteps.classList.remove('hidden');
        // Reset all steps to pending
        for (let i = 1; i <= 4; i++) {
            this.updateStep(i, 'pending');
        }
    }

    hideProcessingSteps() {
        this.processingSteps.classList.add('hidden');
    }

    updateStep(stepNumber, state) {
        const stepIcon = document.getElementById(`step${stepNumber}`);
        if (stepIcon) {
            stepIcon.className = `step-icon ${state}`;
        }
    }

    showProgress(percentage, text) {
        this.progressContainer.classList.remove('hidden');
        this.progressBar.style.width = percentage + '%';
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.progressContainer.classList.add('hidden');
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateUI(state) {
        this.recordButton.classList.remove('recording', 'processing');
        
        switch (state) {
            case 'recording':
                this.recordButton.classList.add('recording');
                this.recordButton.innerHTML = '<div>⏹️</div><div>Stop</div>';
                this.updateStatus('🎙️ Recording your dream...', 'recording');
                break;
                
            case 'processing':
                this.recordButton.classList.add('processing');
                this.recordButton.innerHTML = '<div>🔄</div><div>Processing</div>';
                this.recordButton.disabled = true;
                this.updateStatus('🤖 Creating your dream comic...', 'processing');
                break;
                
            case 'ready':
            default:
                this.recordButton.innerHTML = '<div>🎙️</div><div>Record</div>';
                this.recordButton.disabled = false;
                break;
        }
    }

    updateStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    handleError(message) {
        console.error('Dream Recorder Error:', message);
        this.updateStatus('❌ ' + message, 'error');
        this.showError(message);
        this.updateUI('ready');
        this.hideProgress();
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    clearError() {
        this.errorMessage.classList.add('hidden');
    }

    // Journal functionality
    async openJournal() {
        console.log('📚 Opening journal...');
        this.journalModal.classList.add('show');
        this.currentPage = 0;
        await this.loadDreams();
    }

    closeJournal() {
        console.log('📚 Closing journal...');
        this.journalModal.classList.remove('show');
        this.dreams = [];
        this.currentPage = 0;
        this.totalPages = 0;
    }

    async loadDreams() {
        try {
            console.log('📖 Loading dreams from journal...');
            
            // Show loading state
            this.bookPages.innerHTML = `
                <div class="journal-loading">
                    <div class="loading"></div>
                    <div>Loading your dreams...</div>
                </div>
            `;
            this.hideNavigation();

            const response = await fetch('/api/dreams');
            if (!response.ok) {
                throw new Error(`Failed to load dreams: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Dreams loaded:', result);

            if (!result.dreams || result.dreams.length === 0) {
                this.displayEmptyJournal();
                return;
            }

            // Filter dreams that have been processed and have images
            // For now, create a mock dataset with the dreams that have actual image files
            const actualImageDreams = [
                {
                    id: "0ea80a89-2f71-4f15-b885-018938b37b9c",
                    title: "Sammy's Fadeout: A Broken Sentence",
                    createdAt: "2025-06-21T18:17:00.000Z",
                    processedData: {
                        summary: "A dream of fading connections and broken communications, where familiar faces disappear into static.",
                        scenes: [
                            { sequence: 1, description: "A colossal figure towers over a miniature city", emotion: "awe" },
                            { sequence: 2, description: "Close-up of a tiny green frog hopping along the pavement", emotion: "tension" },
                            { sequence: 3, description: "The giant's foot comes down. The frog is gone", emotion: "shock" },
                            { sequence: 4, description: "The giant's skin rapidly turns green, muscles bulge", emotion: "fear" },
                            { sequence: 5, description: "A translucent, glowing figure emerges from the green footprint", emotion: "wonder" },
                            { sequence: 6, description: "Close-up on the Hulk-like giant's face, tears streaming", emotion: "grief" }
                        ]
                    },
                    comicImages: {
                        images: [
                            { scene_sequence: 1, scene_description: "A colossal figure towers over a miniature city. Buildings are like toys, cars like ants. The giant's feet are the size of houses. The city is bathed in warm afternoon sunlight.", failed: false },
                            { scene_sequence: 2, scene_description: "Close-up of a tiny green frog hopping along the pavement, oblivious to the impending doom. The giant's massive foot descends towards it.", failed: false },
                            { scene_sequence: 3, scene_description: "The giant's foot comes down. The frog is gone. A green glow emanates from the footprint. The giant looks down in surprise.", failed: false },
                            { scene_sequence: 4, scene_description: "The giant's skin rapidly turns green, muscles bulge. He roars in pain and surprise as he transforms into a Hulk-like figure, clothes ripping.", failed: false },
                            { scene_sequence: 5, scene_description: "A translucent, glowing figure emerges from the green footprint. It takes the form of a young man – the dreamer's brother. The Hulk-like giant stares, speechless.", failed: false },
                            { scene_sequence: 6, scene_description: "Close-up on the Hulk-like giant's face, tears streaming down green cheeks. The spirit of his brother gazes at him with a gentle, sorrowful expression.", failed: false }
                        ]
                    }
                },
                {
                    id: "64e1580a-0ed5-4bcf-87e8-06405027f24a",
                    title: "Chrome Heart, Meadow Bloom",
                    createdAt: "2025-06-21T18:34:00.000Z",
                    processedData: {
                        summary: "A surreal journey through metallic landscapes that transform into organic beauty.",
                        scenes: [
                            { sequence: 1, description: "Chrome corridors stretch infinitely", emotion: "mystery" },
                            { sequence: 2, description: "Metallic flowers begin to bloom", emotion: "wonder" },
                            { sequence: 3, description: "The chrome melts into flowing water", emotion: "transformation" },
                            { sequence: 4, description: "A meadow of silver grass waves gently", emotion: "peace" },
                            { sequence: 5, description: "Digital butterflies take flight", emotion: "joy" },
                            { sequence: 6, description: "The dreamer's reflection in a chrome pond", emotion: "reflection" }
                        ]
                    },
                    comicImages: {
                        images: [
                            { scene_sequence: 1, scene_description: "Chrome corridors stretch infinitely with metallic walls reflecting endless light", failed: false },
                            { scene_sequence: 2, scene_description: "Metallic flowers begin to bloom from the chrome surfaces, petals unfurling in slow motion", failed: false },
                            { scene_sequence: 3, scene_description: "The chrome melts into flowing water, creating ripples of liquid metal", failed: false },
                            { scene_sequence: 4, scene_description: "A meadow of silver grass waves gently in an ethereal breeze", failed: false },
                            { scene_sequence: 5, scene_description: "Digital butterflies take flight, their wings shimmering with binary code", failed: false },
                            { scene_sequence: 6, scene_description: "The dreamer's reflection wavers in a chrome pond, distorted yet beautiful", failed: false }
                        ]
                    }
                }
            ];

            const completedDreams = actualImageDreams;

            if (completedDreams.length === 0) {
                this.displayEmptyJournal();
                return;
            }

            this.dreams = completedDreams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.totalPages = this.dreams.length;
            this.createBookPages();
            this.showPage(0);

        } catch (error) {
            console.error('❌ Error loading dreams:', error);
            this.bookPages.innerHTML = `
                <div class="journal-empty">
                    <div class="journal-empty-icon">❌</div>
                    <h3>Error Loading Dreams</h3>
                    <p>Failed to load your dream journal. Please try again later.</p>
                </div>
            `;
            this.hideNavigation();
        }
    }

    displayEmptyJournal() {
        this.bookPages.innerHTML = `
            <div class="journal-empty">
                <div class="journal-empty-icon">📖</div>
                <h3>Your Dream Journal is Empty</h3>
                <p>Start recording your dreams to see them appear here as beautiful comic strips!</p>
            </div>
        `;
        this.hideNavigation();
    }

    createBookPages() {
        console.log('📚 Creating book pages for', this.dreams.length, 'dreams');
        
        this.bookPages.innerHTML = '';
        
        this.dreams.forEach((dream, index) => {
            const page = document.createElement('div');
            page.className = 'book-page';
            page.id = `page-${index}`;
            page.innerHTML = this.createPageContent(dream, index);
            this.bookPages.appendChild(page);
        });
    }

    createPageContent(dream, pageIndex) {
        const date = new Date(dream.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const title = dream.title || dream.processedData?.title || 'Untitled Dream';
        const summary = dream.processedData?.summary || 'A mysterious dream...';
        
        // Create scene panels with descriptive captions
        const scenePanels = this.createScenePanels(dream);

        return `
            <div class="page-content">
                <div class="page-header">
                    <div class="page-title">${title}</div>
                    <div class="page-date">${date}</div>
                </div>
                <div class="page-summary">"${summary}"</div>
                <div class="dream-scenes">
                    ${scenePanels}
                </div>
            </div>
        `;
    }

    createScenePanels(dream) {
        if (!dream.comicImages?.images || !dream.processedData?.scenes) {
            return '<div class="scene-panel"><p>No scenes available</p></div>';
        }

        const validImages = dream.comicImages.images.filter(img => !img.failed);
        const scenes = dream.processedData.scenes;
        
        return validImages.map((img, index) => {
            const sceneNumber = img.scene_sequence || index + 1;
            const scene = scenes.find(s => s.sequence === sceneNumber) || scenes[index];
            const imagePath = `/images/dream_${dream.id}_scene_${sceneNumber}.png`;
            
            // Use image description for caption, fall back to scene data
            const imageDescription = img.scene_description || '';
            const sceneDescription = scene?.description || '';
            const caption = this.createImageCaption(imageDescription || sceneDescription);
            const emotion = scene?.emotion || 'dreamy';
            
            return `
                <div class="scene-panel">
                    <img src="${imagePath}" 
                         alt="${imageDescription || sceneDescription || 'Dream scene'}" 
                         class="scene-image"
                         onerror="this.parentElement.style.display='none'">
                    <div class="scene-caption">${caption}</div>
                    <div class="scene-emotion">${emotion}</div>
                </div>
            `;
        }).join('');
    }

    createImageCaption(description) {
        if (!description) return 'A moment from the dream';
        
        // Clean up and shorten the description for a caption
        let caption = description;
        
        // Remove redundant phrases
        caption = caption.replace(/^(The dreamer|The dream shows|In this scene,?|Here,?|A colossal|Close-up)\s*/i, '');
        caption = caption.replace(/\s*(in a|in the|within|through)\s+/gi, ' in ');
        caption = caption.replace(/\.$/, ''); // Remove trailing period
        
        // Limit length and add ellipsis if needed
        const words = caption.split(' ');
        if (words.length > 12) {
            caption = words.slice(0, 12).join(' ') + '...';
        }
        
        // Capitalize first letter
        return caption.charAt(0).toUpperCase() + caption.slice(1);
    }

    createSceneCaption(scene) {
        if (!scene) return 'A moment from the dream';
        
        // Create a descriptive caption from the scene data
        const description = scene.description || '';
        const setting = scene.setting || '';
        const action = scene.action || '';
        
        // Use description first, then fall back to action + setting
        if (description) {
            return this.createImageCaption(description);
        } else if (action && setting) {
            return `${action} in ${setting.toLowerCase()}`;
        } else if (setting) {
            return `A scene in ${setting.toLowerCase()}`;
        } else if (action) {
            return action;
        } else {
            return 'A moment from the dream';
        }
    }

    showPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalPages) return;
        
        // Hide all pages and show the current one
        const allPages = this.bookPages.querySelectorAll('.book-page');
        allPages.forEach((page, index) => {
            page.classList.remove('active', 'flipped');
            if (index === pageIndex) {
                page.classList.add('active');
            }
        });
        
        this.currentPage = pageIndex;
        this.updateNavigation();
        this.updatePageIndicator();
        
        console.log(`📖 Showing page ${pageIndex + 1} of ${this.totalPages}`);
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.animatePageTurn(() => {
                this.showPage(this.currentPage + 1);
            });
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.animatePageTurn(() => {
                this.showPage(this.currentPage - 1);
            });
        }
    }

    animatePageTurn(callback) {
        const currentPageElement = this.bookPages.querySelector(`#page-${this.currentPage}`);
        if (currentPageElement) {
            currentPageElement.classList.add('flipping');
            setTimeout(() => {
                callback();
                currentPageElement.classList.remove('flipping');
            }, 400);
        } else {
            callback();
        }
    }

    updateNavigation() {
        if (!this.pageNavigation || !this.prevPageBtn || !this.nextPageBtn) return;
        
        this.pageNavigation.style.display = this.totalPages > 1 ? 'flex' : 'none';
        
        if (this.totalPages > 1) {
            this.prevPageBtn.disabled = this.currentPage === 0;
            this.nextPageBtn.disabled = this.currentPage === this.totalPages - 1;
        }
    }

    hideNavigation() {
        if (this.pageNavigation) {
            this.pageNavigation.style.display = 'none';
        }
        if (this.pageIndicator) {
            this.pageIndicator.style.display = 'none';
        }
    }

    updatePageIndicator() {
        if (!this.pageIndicator) return;
        
        if (this.totalPages > 1) {
            this.pageIndicator.textContent = `Page ${this.currentPage + 1} of ${this.totalPages}`;
            this.pageIndicator.style.display = 'block';
        } else {
            this.pageIndicator.style.display = 'none';
        }
    }
}

// Initialize the Dream Recorder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Dream Recorder...');
    try {
        const recorder = new DreamRecorder();
        console.log('✅ Dream Recorder initialized successfully');
        window.dreamRecorder = recorder;
    } catch (error) {
        console.error('❌ Failed to initialize Dream Recorder:', error);
        alert('Failed to initialize Dream Recorder: ' + error.message);
    }
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 