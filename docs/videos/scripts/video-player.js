/**
 * TruthLens Video Player - 2025 Accessibility Standards Implementation
 *
 * Features:
 * - Accessible video player with ARIA support
 * - Automatic caption loading and sync
 * - Audio description integration
 * - Mobile-optimized touch controls
 * - Keyboard navigation
 * - Transcript integration with timestamps
 * - Analytics tracking for engagement
 */

class TruthLensVideoPlayer {
  constructor() {
    this.videoModal = document.getElementById('video-modal');
    this.videoPlayer = document.querySelector('.video-player');
    this.videoClose = document.querySelector('.video-close');
    this.videoOverlay = document.querySelector('.video-overlay');
    this.videoTitle = document.querySelector('.video-modal-title');
    this.transcriptBtn = document.querySelector('.video-transcript-btn');
    this.audioDescBtn = document.querySelector('.video-audio-desc-btn');
    this.speedBtn = document.querySelector('.video-speed-btn');
    this.transcriptSection = document.querySelector('.video-transcript');
    this.transcriptContent = document.querySelector('.transcript-content');

    // Video data structure for 2025 standards
    this.videoData = this.buildVideoDatabase();
    this.currentVideo = null;
    this.currentSpeed = 1;
    this.speeds = [0.75, 1, 1.25, 1.5, 2];
    this.transcriptVisible = false;
    this.audioDescriptionEnabled = false;
    this.lastPlayPosition = 0;

    this.init();
  }

  buildVideoDatabase() {
    // Pre-structured video data following 2025 accessibility standards
    return {
      'install-extension': {
        title: '📥 Installing TruthLens',
        duration: '0:30',
        videoUrl: './videos/install-extension.mp4',
        captionUrl: './captions/install-extension.vtt',
        audioDescUrl: './audio-descriptions/install-extension.vtt',
        transcriptUrl: './transcripts/install-extension.txt',
        description: 'Learn how to add TruthLens to your Chrome browser in 30 seconds',
        category: 'Getting Started',
        thumbnail: './thumbnails/install-extension.jpg',
        keywords: ['installation', 'chrome', 'extension', 'setup'],
        transcript: [
          { time: '00:00', text: 'Welcome! Let\'s install TruthLens in your Chrome browser.' },
          { time: '00:05', text: 'Open the Chrome Web Store and search for "TruthLens".' },
          { time: '00:12', text: 'Click "Add to Chrome" and confirm the installation.' },
          { time: '00:20', text: 'TruthLens icon appears in your toolbar. You\'re ready!' },
          { time: '00:25', text: 'Next, let\'s check your first article for credibility.' }
        ]
      },
      'first-use': {
        title: '🎯 First Fact-Check',
        duration: '0:45',
        videoUrl: './videos/first-use.mp4',
        captionUrl: './captions/first-use.vtt',
        audioDescUrl: './audio-descriptions/first-use.vtt',
        transcriptUrl: './transcripts/first-use.txt',
        description: 'Check your first article\'s credibility with TruthLens',
        category: 'Getting Started',
        thumbnail: './thumbnails/first-use.jpg',
        keywords: ['first use', 'fact check', 'credibility', 'analysis'],
        transcript: [
          { time: '00:00', text: 'Ready for your first fact-check? Let\'s go!' },
          { time: '00:05', text: 'Navigate to any news article you want to verify.' },
          { time: '00:12', text: 'TruthLens automatically analyzes the content.' },
          { time: '00:20', text: 'See the credibility score appear as a badge.' },
          { time: '00:28', text: 'Click the badge for detailed analysis.' },
          { time: '00:35', text: 'Green means trustworthy, yellow needs caution, red means questionable.' },
          { time: '00:42', text: 'You\'ve completed your first fact-check!' }
        ]
      },
      'settings-overview': {
        title: '⚙️ Quick Settings Setup',
        duration: '0:40',
        videoUrl: './videos/settings-overview.mp4',
        captionUrl: './captions/settings-overview.vtt',
        audioDescUrl: './audio-descriptions/settings-overview.vtt',
        transcriptUrl: './transcripts/settings-overview.txt',
        description: 'Customize TruthLens for your personal needs',
        category: 'Getting Started',
        thumbnail: './thumbnails/settings-overview.jpg',
        keywords: ['settings', 'configuration', 'customize', 'preferences'],
        transcript: [
          { time: '00:00', text: 'Let\'s personalize TruthLens for your needs.' },
          { time: '00:05', text: 'Click the TruthLens icon and select "Settings".' },
          { time: '00:12', text: 'Adjust sensitivity: High for strict checking, low for general use.' },
          { time: '00:20', text: 'Enable notifications to stay informed about questionable content.' },
          { time: '00:28', text: 'Choose your preferred analysis speed: instant or detailed.' },
          { time: '00:35', text: 'Save your settings. TruthLens is now customized for you!' }
        ]
      },
      'credibility-scores': {
        title: '🎯 Understanding Scores',
        duration: '0:55',
        videoUrl: './videos/credibility-scores.mp4',
        captionUrl: './captions/credibility-scores.vtt',
        audioDescUrl: './audio-descriptions/credibility-scores.vtt',
        transcriptUrl: './transcripts/credibility-scores.txt',
        description: 'Learn what credibility scores mean and how to interpret them',
        category: 'Features',
        thumbnail: './thumbnails/credibility-scores.jpg',
        keywords: ['credibility', 'scores', 'ratings', 'interpretation', 'analysis'],
        transcript: [
          { time: '00:00', text: 'Understanding credibility scores is key to smart fact-checking.' },
          { time: '00:08', text: 'Green scores (80-100) indicate highly reliable sources.' },
          { time: '00:15', text: 'Yellow scores (50-79) suggest moderate reliability - verify with other sources.' },
          { time: '00:25', text: 'Red scores (0-49) mean questionable credibility - be very cautious.' },
          { time: '00:35', text: 'Factors include source reputation, fact-checking history, and bias analysis.' },
          { time: '00:45', text: 'Always consider multiple sources for important decisions.' },
          { time: '00:52', text: 'You\'re now equipped to interpret any credibility score!' }
        ]
      },
      'bias-detection': {
        title: '⚖️ Spotting Bias',
        duration: '0:50',
        videoUrl: './videos/bias-detection.mp4',
        captionUrl: './captions/bias-detection.vtt',
        audioDescUrl: './audio-descriptions/bias-detection.vtt',
        transcriptUrl: './transcripts/bias-detection.txt',
        description: 'How TruthLens identifies media bias and perspective',
        category: 'Features',
        thumbnail: './thumbnails/bias-detection.jpg',
        keywords: ['bias', 'detection', 'perspective', 'media', 'analysis'],
        transcript: [
          { time: '00:00', text: 'Every source has perspective. Let\'s spot bias together.' },
          { time: '00:07', text: 'TruthLens analyzes language patterns for political lean.' },
          { time: '00:15', text: 'Blue indicators show left-leaning content.' },
          { time: '00:20', text: 'Red indicators show right-leaning content.' },
          { time: '00:25', text: 'Gray indicates balanced or neutral reporting.' },
          { time: '00:32', text: 'Check the detailed view for bias explanation.' },
          { time: '00:40', text: 'Remember: bias doesn\'t always mean inaccuracy.' },
          { time: '00:47', text: 'Use this info to seek diverse perspectives!' }
        ]
      },
      'social-media-checking': {
        title: '📱 Social Media Facts',
        duration: '0:45',
        videoUrl: './videos/social-media-checking.mp4',
        captionUrl: './captions/social-media-checking.vtt',
        audioDescUrl: './audio-descriptions/social-media-checking.vtt',
        transcriptUrl: './transcripts/social-media-checking.txt',
        description: 'Using TruthLens on Twitter, Facebook, and Instagram',
        category: 'Features',
        thumbnail: './thumbnails/social-media-checking.jpg',
        keywords: ['social media', 'twitter', 'facebook', 'instagram', 'posts'],
        transcript: [
          { time: '00:00', text: 'Social media needs fact-checking too. Here\'s how.' },
          { time: '00:06', text: 'On Twitter, TruthLens badges appear next to suspicious posts.' },
          { time: '00:15', text: 'Facebook posts get credibility overlays in your feed.' },
          { time: '00:23', text: 'Instagram story links are automatically checked.' },
          { time: '00:30', text: 'Click any badge for source verification and context.' },
          { time: '00:37', text: 'Share responsibly - check before you post!' },
          { time: '00:42', text: 'You\'re now a social media fact-checking pro!' }
        ]
      },
      'detailed-reports': {
        title: '📊 Detailed Analysis',
        duration: '1:00',
        videoUrl: './videos/detailed-reports.mp4',
        captionUrl: './captions/detailed-reports.vtt',
        audioDescUrl: './audio-descriptions/detailed-reports.vtt',
        transcriptUrl: './transcripts/detailed-reports.txt',
        description: 'Reading comprehensive credibility reports',
        category: 'Features',
        thumbnail: './thumbnails/detailed-reports.jpg',
        keywords: ['reports', 'analysis', 'detailed', 'comprehensive', 'breakdown'],
        transcript: [
          { time: '00:00', text: 'Deep dive into TruthLens detailed analysis reports.' },
          { time: '00:08', text: 'Click "View Details" on any credibility badge.' },
          { time: '00:15', text: 'Source Analysis shows publication history and reputation.' },
          { time: '00:25', text: 'Content Analysis reveals fact-checking and verification status.' },
          { time: '00:35', text: 'Bias Analysis explains political lean and perspective.' },
          { time: '00:45', text: 'Related Sources suggests additional reading for context.' },
          { time: '00:52', text: 'Export reports for research or share with others.' },
          { time: '00:58', text: 'Master researcher skills unlocked!' }
        ]
      },
      'bulk-checking': {
        title: '⚡ Bulk Fact-Checking',
        duration: '0:55',
        videoUrl: './videos/bulk-checking.mp4',
        captionUrl: './captions/bulk-checking.vtt',
        audioDescUrl: './audio-descriptions/bulk-checking.vtt',
        transcriptUrl: './transcripts/bulk-checking.txt',
        description: 'Check multiple articles simultaneously for research',
        category: 'Advanced',
        thumbnail: './thumbnails/bulk-checking.jpg',
        keywords: ['bulk', 'multiple', 'batch', 'research', 'efficiency'],
        transcript: [
          { time: '00:00', text: 'Need to fact-check multiple sources? Bulk mode is here!' },
          { time: '00:08', text: 'Right-click the TruthLens icon and select "Bulk Analysis".' },
          { time: '00:18', text: 'Paste multiple URLs or upload a text file with links.' },
          { time: '00:28', text: 'TruthLens processes all sources simultaneously.' },
          { time: '00:38', text: 'Results appear in a sortable table with all metrics.' },
          { time: '00:48', text: 'Export to spreadsheet for further analysis.' },
          { time: '00:52', text: 'Research efficiency level: maximum!' }
        ]
      },
      'custom-filters': {
        title: '🔧 Custom Filters',
        duration: '0:50',
        videoUrl: './videos/custom-filters.mp4',
        captionUrl: './captions/custom-filters.vtt',
        audioDescUrl: './audio-descriptions/custom-filters.vtt',
        transcriptUrl: './transcripts/custom-filters.txt',
        description: 'Set up personalized content filtering and alerts',
        category: 'Advanced',
        thumbnail: './thumbnails/custom-filters.jpg',
        keywords: ['filters', 'custom', 'personalization', 'alerts', 'settings'],
        transcript: [
          { time: '00:00', text: 'Customize TruthLens filtering for your specific needs.' },
          { time: '00:08', text: 'Go to Settings > Advanced > Custom Filters.' },
          { time: '00:16', text: 'Add keywords to automatically flag suspicious content.' },
          { time: '00:25', text: 'Set credibility thresholds for different content types.' },
          { time: '00:33', text: 'Create alerts for specific sources or topics.' },
          { time: '00:41', text: 'Save filter presets for different research projects.' },
          { time: '00:47', text: 'Your personalized fact-checking system is ready!' }
        ]
      },
      'troubleshooting': {
        title: '🔧 Troubleshooting',
        duration: '0:45',
        videoUrl: './videos/troubleshooting.mp4',
        captionUrl: './captions/troubleshooting.vtt',
        audioDescUrl: './audio-descriptions/troubleshooting.vtt',
        transcriptUrl: './transcripts/troubleshooting.txt',
        description: 'Fix common issues and get help when needed',
        category: 'Advanced',
        thumbnail: './thumbnails/troubleshooting.jpg',
        keywords: ['troubleshooting', 'problems', 'fixes', 'help', 'support'],
        transcript: [
          { time: '00:00', text: 'Having issues? Let\'s troubleshoot together!' },
          { time: '00:06', text: 'Badge not showing? Check if TruthLens is enabled for the site.' },
          { time: '00:15', text: 'Slow analysis? Try refreshing the page or clearing cache.' },
          { time: '00:24', text: 'Wrong scores? Report feedback through the extension menu.' },
          { time: '00:32', text: 'For technical issues, click "Get Help" in settings.' },
          { time: '00:38', text: 'Join our Discord community for peer support.' },
          { time: '00:42', text: 'Problem solved! Happy fact-checking!' }
        ]
      },
      'api-integration': {
        title: '⚙️ API Integration',
        duration: '1:00',
        videoUrl: './videos/api-integration.mp4',
        captionUrl: './captions/api-integration.vtt',
        audioDescUrl: './audio-descriptions/api-integration.vtt',
        transcriptUrl: './transcripts/api-integration.txt',
        description: 'Integrate TruthLens into your applications and workflow',
        category: 'Advanced',
        thumbnail: './thumbnails/api-integration.jpg',
        keywords: ['api', 'integration', 'development', 'automation', 'workflow'],
        transcript: [
          { time: '00:00', text: 'Developers, let\'s integrate TruthLens into your apps!' },
          { time: '00:08', text: 'Get your API key from the developer dashboard.' },
          { time: '00:16', text: 'Use our REST API for single URL fact-checking.' },
          { time: '00:25', text: 'Batch API handles multiple URLs efficiently.' },
          { time: '00:35', text: 'Webhook integration provides real-time analysis.' },
          { time: '00:45', text: 'Rate limits and pricing info in the documentation.' },
          { time: '00:52', text: 'Build trust into your platform with TruthLens!' },
          { time: '00:57', text: 'Happy coding!' }
        ]
      }
    };
  }

  init() {
    this.bindEvents();
    this.setupAccessibility();
    this.initVideoCards();
  }

  bindEvents() {
    // Video card clicks
    document.addEventListener('click', (e) => {
      const videoCard = e.target.closest('.video-card');
      if (videoCard) {
        const videoId = videoCard.dataset.videoId;
        this.openVideo(videoId);
      }
    });

    // Modal close events
    this.videoClose?.addEventListener('click', () => this.closeVideo());
    this.videoOverlay?.addEventListener('click', () => this.closeVideo());

    // Control button events
    this.transcriptBtn?.addEventListener('click', () => this.toggleTranscript());
    this.audioDescBtn?.addEventListener('click', () => this.toggleAudioDescription());
    this.speedBtn?.addEventListener('click', () => this.cycleSpeed());

    // Video player events
    if (this.videoPlayer) {
      this.videoPlayer.addEventListener('loadedmetadata', () => this.onVideoLoaded());
      this.videoPlayer.addEventListener('timeupdate', () => this.onTimeUpdate());
      this.videoPlayer.addEventListener('ended', () => this.onVideoEnded());
      this.videoPlayer.addEventListener('error', (e) => this.onVideoError(e));
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  setupAccessibility() {
    // Add ARIA attributes
    if (this.videoModal) {
      this.videoModal.setAttribute('role', 'dialog');
      this.videoModal.setAttribute('aria-modal', 'true');
      this.videoModal.setAttribute('aria-labelledby', 'video-modal-title');
    }

    // Setup focus trap for modal
    this.setupFocusTrap();
  }

  setupFocusTrap() {
    // Elements that can receive focus within the modal
    this.focusableElements = [
      this.videoPlayer,
      this.videoClose,
      this.transcriptBtn,
      this.audioDescBtn,
      this.speedBtn
    ].filter(Boolean);
  }

  initVideoCards() {
    // Add keyboard navigation to video cards
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => {
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const videoId = card.dataset.videoId;
          this.openVideo(videoId);
        }
      });
    });
  }

  openVideo(videoId) {
    const video = this.videoData[videoId];
    if (!video) {
      console.error(`Video ${videoId} not found`);
      return;
    }

    this.currentVideo = video;
    this.currentVideo.id = videoId;

    // Update modal content
    this.videoTitle.textContent = video.title;
    this.videoPlayer.src = video.videoUrl;

    // Setup captions
    this.setupCaptions(video);

    // Setup audio descriptions
    this.setupAudioDescriptions(video);

    // Load transcript
    this.loadTranscript(video);

    // Show modal
    this.videoModal.hidden = false;
    this.videoModal.classList.add('video-modal--open');

    // Focus management
    setTimeout(() => {
      this.videoPlayer.focus();
    }, 100);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Analytics tracking
    this.trackVideoOpen(videoId, video.title);
  }

  closeVideo() {
    if (!this.videoModal) return;

    // Pause video
    if (this.videoPlayer && !this.videoPlayer.paused) {
      this.videoPlayer.pause();
      this.lastPlayPosition = this.videoPlayer.currentTime;
    }

    // Hide modal
    this.videoModal.hidden = true;
    this.videoModal.classList.remove('video-modal--open');

    // Reset states
    this.transcriptVisible = false;
    this.transcriptSection.hidden = true;
    this.transcriptBtn.textContent = '📝 Show Transcript';

    // Restore body scroll
    document.body.style.overflow = '';

    // Return focus to trigger card
    const activeCard = document.querySelector(`[data-video-id="${this.currentVideo?.id}"]`);
    if (activeCard) {
      activeCard.focus();
    }

    // Analytics tracking
    if (this.currentVideo) {
      this.trackVideoClose(this.currentVideo.id, this.lastPlayPosition);
    }

    this.currentVideo = null;
  }

  setupCaptions(video) {
    // Clear existing tracks
    const existingTracks = this.videoPlayer.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());

    // Add caption track
    if (video.captionUrl) {
      const captionTrack = document.createElement('track');
      captionTrack.kind = 'captions';
      captionTrack.src = video.captionUrl;
      captionTrack.srclang = 'en';
      captionTrack.label = 'English';
      captionTrack.default = true;
      this.videoPlayer.appendChild(captionTrack);
    }
  }

  setupAudioDescriptions(video) {
    // Add audio description track
    if (video.audioDescUrl) {
      const audioDescTrack = document.createElement('track');
      audioDescTrack.kind = 'descriptions';
      audioDescTrack.src = video.audioDescUrl;
      audioDescTrack.srclang = 'en';
      audioDescTrack.label = 'Audio descriptions';
      this.videoPlayer.appendChild(audioDescTrack);
    }
  }

  loadTranscript(video) {
    if (!video.transcript) return;

    const transcriptHTML = video.transcript.map(entry => `
      <div class="transcript-entry">
        <span class="transcript-timestamp" data-time="${entry.time}">${entry.time}</span>
        <span class="transcript-text">${entry.text}</span>
      </div>
    `).join('');

    this.transcriptContent.innerHTML = transcriptHTML;

    // Add click handlers to timestamps
    const timestamps = this.transcriptContent.querySelectorAll('.transcript-timestamp');
    timestamps.forEach(timestamp => {
      timestamp.addEventListener('click', () => {
        const time = this.parseTimeToSeconds(timestamp.dataset.time);
        this.videoPlayer.currentTime = time;
        this.videoPlayer.play();
      });
    });
  }

  parseTimeToSeconds(timeString) {
    const parts = timeString.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  toggleTranscript() {
    this.transcriptVisible = !this.transcriptVisible;
    this.transcriptSection.hidden = !this.transcriptVisible;
    this.transcriptBtn.textContent = this.transcriptVisible ?
      '📝 Hide Transcript' : '📝 Show Transcript';

    // Announce to screen readers
    const announcement = this.transcriptVisible ?
      'Transcript shown' : 'Transcript hidden';
    this.announceToScreenReader(announcement);

    // Analytics tracking
    this.trackTranscriptToggle(this.transcriptVisible);
  }

  toggleAudioDescription() {
    this.audioDescriptionEnabled = !this.audioDescriptionEnabled;

    const tracks = this.videoPlayer.textTracks;
    for (let track of tracks) {
      if (track.kind === 'descriptions') {
        track.mode = this.audioDescriptionEnabled ? 'showing' : 'hidden';
      }
    }

    this.audioDescBtn.textContent = this.audioDescriptionEnabled ?
      '🎧 Disable Audio Desc' : '🎧 Audio Description';

    // Announce to screen readers
    const announcement = this.audioDescriptionEnabled ?
      'Audio descriptions enabled' : 'Audio descriptions disabled';
    this.announceToScreenReader(announcement);

    // Analytics tracking
    this.trackAudioDescriptionToggle(this.audioDescriptionEnabled);
  }

  cycleSpeed() {
    const currentIndex = this.speeds.indexOf(this.currentSpeed);
    const nextIndex = (currentIndex + 1) % this.speeds.length;
    this.currentSpeed = this.speeds[nextIndex];

    this.videoPlayer.playbackRate = this.currentSpeed;
    this.speedBtn.textContent = `⚡ Speed: ${this.currentSpeed}x`;

    // Announce to screen readers
    this.announceToScreenReader(`Playback speed set to ${this.currentSpeed}x`);

    // Analytics tracking
    this.trackSpeedChange(this.currentSpeed);
  }

  onVideoLoaded() {
    // Video metadata loaded successfully
    console.log('Video loaded:', this.currentVideo?.title);

    // Enable all controls
    this.transcriptBtn.disabled = false;
    this.audioDescBtn.disabled = false;
    this.speedBtn.disabled = false;

    // Analytics tracking
    this.trackVideoLoaded(this.currentVideo?.id);
  }

  onTimeUpdate() {
    if (!this.currentVideo) return;

    const currentTime = this.videoPlayer.currentTime;

    // Highlight current transcript entry
    this.highlightCurrentTranscript(currentTime);

    // Track viewing progress
    this.trackViewingProgress(currentTime);
  }

  highlightCurrentTranscript(currentTime) {
    if (!this.transcriptVisible) return;

    const entries = this.transcriptContent.querySelectorAll('.transcript-entry');
    entries.forEach(entry => {
      const timestamp = entry.querySelector('.transcript-timestamp');
      const entryTime = this.parseTimeToSeconds(timestamp.dataset.time);

      if (Math.abs(currentTime - entryTime) < 2) {
        entry.classList.add('transcript-entry--current');
      } else {
        entry.classList.remove('transcript-entry--current');
      }
    });
  }

  onVideoEnded() {
    // Video finished playing
    console.log('Video ended:', this.currentVideo?.title);

    // Analytics tracking
    this.trackVideoCompleted(this.currentVideo?.id);

    // Suggest next video or show completion message
    this.showVideoCompletion();
  }

  onVideoError(error) {
    console.error('Video error:', error);

    // Show error message to user
    this.showVideoError();

    // Analytics tracking
    this.trackVideoError(this.currentVideo?.id, error.message);
  }

  showVideoCompletion() {
    // Show completion UI or suggest next video
    this.announceToScreenReader('Video completed. Check out related videos or close to continue.');
  }

  showVideoError() {
    // Display user-friendly error message
    const errorHTML = `
      <div class="video-error">
        <h3>🔧 Video Unavailable</h3>
        <p>Sorry, this video couldn't be loaded. Try refreshing the page or check your connection.</p>
        <button onclick="location.reload()">🔄 Refresh Page</button>
      </div>
    `;

    this.transcriptContent.innerHTML = errorHTML;
    this.transcriptSection.hidden = false;
  }

  handleKeydown(e) {
    if (!this.videoModal || this.videoModal.hidden) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.closeVideo();
        break;

      case ' ':
        if (e.target === this.videoPlayer) {
          e.preventDefault();
          this.videoPlayer.paused ? this.videoPlayer.play() : this.videoPlayer.pause();
        }
        break;

      case 'f':
      case 'F':
        if (e.target === this.videoPlayer) {
          e.preventDefault();
          this.toggleFullscreen();
        }
        break;

      case 'c':
      case 'C':
        if (e.target === this.videoPlayer) {
          e.preventDefault();
          this.toggleCaptions();
        }
        break;

      case 't':
      case 'T':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleTranscript();
        }
        break;

      case 'Tab':
        this.handleTabNavigation(e);
        break;
    }
  }

  handleTabNavigation(e) {
    // Trap focus within modal
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.videoPlayer.requestFullscreen();
    }
  }

  toggleCaptions() {
    const tracks = this.videoPlayer.textTracks;
    for (let track of tracks) {
      if (track.kind === 'captions') {
        track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
        this.announceToScreenReader(
          track.mode === 'showing' ? 'Captions enabled' : 'Captions disabled'
        );
        break;
      }
    }
  }

  announceToScreenReader(message) {
    // Create or update live region for announcements
    let announcer = document.getElementById('video-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'video-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    announcer.textContent = message;
  }

  // Analytics tracking methods
  trackVideoOpen(videoId, title) {
    this.trackEvent('video_opened', {
      video_id: videoId,
      video_title: title,
      timestamp: Date.now()
    });
  }

  trackVideoClose(videoId, position) {
    this.trackEvent('video_closed', {
      video_id: videoId,
      position: Math.round(position),
      timestamp: Date.now()
    });
  }

  trackVideoLoaded(videoId) {
    this.trackEvent('video_loaded', {
      video_id: videoId,
      timestamp: Date.now()
    });
  }

  trackVideoCompleted(videoId) {
    this.trackEvent('video_completed', {
      video_id: videoId,
      timestamp: Date.now()
    });
  }

  trackVideoError(videoId, error) {
    this.trackEvent('video_error', {
      video_id: videoId,
      error: error,
      timestamp: Date.now()
    });
  }

  trackTranscriptToggle(enabled) {
    this.trackEvent('transcript_toggled', {
      video_id: this.currentVideo?.id,
      enabled: enabled,
      timestamp: Date.now()
    });
  }

  trackAudioDescriptionToggle(enabled) {
    this.trackEvent('audio_description_toggled', {
      video_id: this.currentVideo?.id,
      enabled: enabled,
      timestamp: Date.now()
    });
  }

  trackSpeedChange(speed) {
    this.trackEvent('speed_changed', {
      video_id: this.currentVideo?.id,
      speed: speed,
      timestamp: Date.now()
    });
  }

  trackViewingProgress(currentTime) {
    // Track viewing progress at 25%, 50%, 75%, 100%
    if (!this.currentVideo || !this.videoPlayer.duration) return;

    const progress = (currentTime / this.videoPlayer.duration) * 100;
    const milestones = [25, 50, 75, 90];

    milestones.forEach(milestone => {
      if (progress >= milestone && !this.currentVideo[`milestone_${milestone}`]) {
        this.currentVideo[`milestone_${milestone}`] = true;
        this.trackEvent('video_progress', {
          video_id: this.currentVideo.id,
          progress: milestone,
          timestamp: Date.now()
        });
      }
    });
  }

  trackEvent(eventName, properties = {}) {
    // Analytics tracking (placeholder for actual implementation)
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }

    // Console logging for development
    console.log(`🎬 Video Event: ${eventName}`, properties);
  }

  // Playlist functionality
  startPlaylist() {
    const videoIds = Object.keys(this.videoData);
    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex < videoIds.length) {
        this.openVideo(videoIds[currentIndex]);
        currentIndex++;

        // Auto-advance when video ends
        this.videoPlayer.addEventListener('ended', playNext, { once: true });
      }
    };

    playNext();

    this.trackEvent('playlist_started', {
      total_videos: videoIds.length,
      timestamp: Date.now()
    });
  }
}

// CSS for transcript highlighting (injected dynamically)
const videoCSS = `
.transcript-entry {
  margin-bottom: var(--space-3, 0.75rem);
  padding: var(--space-2, 0.5rem);
  border-radius: var(--radius-md, 0.5rem);
  transition: background-color var(--transition-fast, 0.15s ease);
}

.transcript-entry--current {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.transcript-entry--current .transcript-timestamp {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.transcript-text {
  display: block;
  margin-top: var(--space-1, 0.25rem);
}

.video-error {
  text-align: center;
  padding: var(--space-8, 2rem);
}

.video-error h3 {
  margin: 0 0 var(--space-4, 1rem) 0;
  color: var(--text-primary, #1f2937);
}

.video-error button {
  background: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
  cursor: pointer;
  transition: background-color var(--transition-fast, 0.15s ease);
}

.video-error button:hover {
  background: var(--color-primary-dark, #1d4ed8);
}
`;

// Inject video player styles
function injectVideoStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = videoCSS;
  document.head.appendChild(styleElement);
}

// Initialize video player when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectVideoStyles();
    new TruthLensVideoPlayer();
  });
} else {
  injectVideoStyles();
  new TruthLensVideoPlayer();
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TruthLensVideoPlayer;
}
