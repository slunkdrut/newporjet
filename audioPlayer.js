// Standalone Audio Player
// This script runs independently of React and manages audio playback
// It's loaded directly in the HTML and persists across page navigations

(function() {
  // Create a global audio player namespace
  window.SolanoAudioPlayer = {
    initialized: false,
    audioElement: null,
    isMuted: false,
    isPlaying: true,
    
    // Initialize the audio player
    init: function() {
      if (this.initialized) return;
      
      console.log('Initializing standalone audio player');
      
      // Try to load preferences from localStorage
      try {
        const savedMuted = localStorage.getItem('app_audio_muted');
        if (savedMuted !== null) {
          this.isMuted = savedMuted === 'true';
        }
      } catch (e) {
        console.error('Error loading audio preferences:', e);
      }
      
      // Create audio element
      this.audioElement = new Audio('/audio/arcade-theme.mp3');
      this.audioElement.id = 'background-music-player';
      this.audioElement.loop = true;
      this.audioElement.volume = 0.3;
      this.audioElement.preload = 'auto';
      
      // Add to document to ensure it persists
      document.body.appendChild(this.audioElement);
      
      // Hide the element
      this.audioElement.style.display = 'none';
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Try to play immediately
      this.play();
      
      this.initialized = true;
      
      // Expose control methods to window for React components to use
      window.toggleAudioMute = this.toggleMute.bind(this);
      window.getAudioMuteState = this.getMuteState.bind(this);
    },
    
    // Set up event listeners for the audio element
    setupEventListeners: function() {
      // Handle tab visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.isMuted && this.isPlaying && this.audioElement.paused) {
            this.play();
          }
        }
      });
      
      // Handle window focus
      window.addEventListener('focus', () => {
        if (!this.isMuted && this.isPlaying && this.audioElement.paused) {
          this.play();
        }
      });
      
      // Handle audio errors
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        // Try to recover
        setTimeout(() => {
          if (!this.isMuted && this.isPlaying) {
            this.play();
          }
        }, 1000);
      });
      
      // Handle audio ended (shouldn't happen with loop=true, but just in case)
      this.audioElement.addEventListener('ended', () => {
        if (!this.isMuted && this.isPlaying) {
          this.audioElement.currentTime = 0;
          this.play();
        }
      });
    },
    
    // Play the audio
    play: function() {
      if (this.isMuted || !this.isPlaying) return;
      
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Autoplay prevented by browser. Setting up interaction listeners.');
          this.setupAutoplayFix();
        });
      }
    },
    
    // Set up autoplay fix for browsers that block autoplay
    setupAutoplayFix: function() {
      const unlockAudio = () => {
        if (!this.isMuted && this.isPlaying) {
          const playPromise = this.audioElement.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('Audio unlocked and playing');
              // Remove event listeners once we've successfully started playback
              this.removeAutoplayFixListeners(unlockAudio);
            }).catch(e => {
              console.error('Still cannot play audio:', e);
            });
          }
        }
      };
      
      // Add event listeners for user interactions
      const interactionEvents = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'scroll'];
      interactionEvents.forEach(event => {
        document.addEventListener(event, unlockAudio);
      });
      
      // Store the function reference for later removal
      this._unlockAudioFunction = unlockAudio;
    },
    
    // Remove autoplay fix listeners
    removeAutoplayFixListeners: function(listenerFn) {
      const interactionEvents = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'scroll'];
      interactionEvents.forEach(event => {
        document.removeEventListener(event, listenerFn || this._unlockAudioFunction);
      });
    },
    
    // Pause the audio
    pause: function() {
      this.audioElement.pause();
    },
    
    // Toggle mute state
    toggleMute: function() {
      this.isMuted = !this.isMuted;
      
      try {
        localStorage.setItem('app_audio_muted', String(this.isMuted));
      } catch (e) {
        console.error('Error saving mute state:', e);
      }
      
      if (this.isMuted) {
        this.pause();
      } else {
        this.play();
      }
      
      // Notify any React components that might be listening
      const event = new CustomEvent('audioMuteChanged', { detail: { isMuted: this.isMuted } });
      document.dispatchEvent(event);
      
      return this.isMuted;
    },
    
    // Get current mute state
    getMuteState: function() {
      return this.isMuted;
    }
  };
  
  // Initialize the player when the DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.SolanoAudioPlayer.init();
    });
  } else {
    window.SolanoAudioPlayer.init();
  }
})(); 