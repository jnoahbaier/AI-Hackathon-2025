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
        this.journalContent = document.getElementById('journalContent');

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
        await this.loadDreams();
    }

    closeJournal() {
        console.log('📚 Closing journal...');
        this.journalModal.classList.remove('show');
    }

    async loadDreams() {
        try {
            console.log('📖 Loading dreams from journal...');
            
            // Show loading state
            this.journalContent.innerHTML = `
                <div class="journal-loading">
                    <div class="loading"></div>
                    <div>Loading your dreams...</div>
                </div>
            `;

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
            const completedDreams = result.dreams.filter(dream => 
                dream.transcription && 
                dream.processedData && 
                dream.comicImages && 
                dream.comicImages.images && 
                dream.comicImages.images.length > 0
            );

            if (completedDreams.length === 0) {
                this.displayEmptyJournal();
                return;
            }

            this.displayDreams(completedDreams);

        } catch (error) {
            console.error('❌ Error loading dreams:', error);
            this.journalContent.innerHTML = `
                <div class="journal-empty">
                    <div class="journal-empty-icon">❌</div>
                    <h3>Error Loading Dreams</h3>
                    <p>Failed to load your dream journal. Please try again later.</p>
                </div>
            `;
        }
    }

    displayEmptyJournal() {
        this.journalContent.innerHTML = `
            <div class="journal-empty">
                <div class="journal-empty-icon">📖</div>
                <h3>Your Dream Journal is Empty</h3>
                <p>Start recording your dreams to see them appear here as beautiful comic strips!</p>
            </div>
        `;
    }

    displayDreams(dreams) {
        console.log('📚 Displaying dreams in journal:', dreams.length);
        
        // Sort dreams by creation date (newest first)
        dreams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.journalContent.innerHTML = dreams.map(dream => this.createDreamEntry(dream)).join('');
    }

    createDreamEntry(dream) {
        const date = new Date(dream.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const title = dream.title || dream.processedData?.title || 'Untitled Dream';
        const summary = dream.processedData?.summary || 'A mysterious dream...';
        
        // Create comic panels HTML
        const comicPanels = dream.comicImages.images
            .filter(img => !img.failed)
            .map((img, index) => {
                const sceneNumber = img.scene_sequence || index + 1;
                const imagePath = `/images/dream_${dream.id}_scene_${sceneNumber}.png`;
                return `
                    <div class="journal-comic-panel">
                        <img src="${imagePath}" alt="Scene ${sceneNumber}" onerror="this.parentElement.style.display='none'">
                        <div class="journal-panel-info">Scene ${sceneNumber}</div>
                    </div>
                `;
            }).join('');

        return `
            <div class="dream-entry">
                <div class="dream-entry-header">
                    <div class="dream-title">${title}</div>
                    <div class="dream-date">${date}</div>
                </div>
                <div class="dream-summary-text">"${summary}"</div>
                <div class="dream-comics">
                    ${comicPanels}
                </div>
            </div>
        `;
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