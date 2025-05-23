// js/global_player.js
document.addEventListener('DOMContentLoaded', () => {
    const globalPlayerContainer = document.getElementById('global-audio-player-container');
    if (!globalPlayerContainer) {
        return; 
    }

    const audioElement = document.getElementById('audio-player-element');
    const globalPlayerReciterImg = document.getElementById('global-player-reciter-img');
    const globalPlayerSurahNameEl = document.getElementById('global-player-surah-name');
    const globalPlayerReciterNameEl = document.getElementById('global-player-reciter-name');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const repeatBtn = document.getElementById('repeat-btn');
    const repeatIconImg = document.getElementById('repeat-icon-img');
    const downloadBtn = document.getElementById('download-btn');
    const closePlayerBtn = document.getElementById('close-player-btn');

    let currentGlobalReciterData = null;
    let currentGlobalSurahIndex = -1;
    let currentGlobalSurahList = [];
    let isPlaying = false;
    let repeatMode = 'none';
    let volumeBeforeMute = 1;

    const GLOBAL_PLAYER_STATE_KEY = 'quranGlobalPlayerState_v5';

    function masterPlayerInit() {
        if (!audioElement) { 
            console.error("Audio element (#audio-player-element) not found for global player.");
            return;
        }
        loadGlobalPlayerState();
        addGlobalPlayerEventListeners();
        updateAllUIComponents();
        
        if (currentGlobalReciterData && currentGlobalSurahIndex !== -1 && currentGlobalSurahList.length > 0 && currentGlobalSurahList[currentGlobalSurahIndex] ) {
            showGlobalPlayer();
        } else {
            hideGlobalPlayer();
        }
    }

    function showGlobalPlayer() {
        if (globalPlayerContainer) {
            globalPlayerContainer.style.display = 'block';
            document.dispatchEvent(new CustomEvent('playerVisibilityChanged', { detail: { visible: true } }));
        }
    }

    function hideGlobalPlayer() {
        if (globalPlayerContainer) {
            globalPlayerContainer.style.display = 'none';
            document.dispatchEvent(new CustomEvent('playerVisibilityChanged', { detail: { visible: false } }));
        }
    }
    
    function updateAllUIComponents() {
        if (currentGlobalReciterData && currentGlobalSurahIndex !== -1 && currentGlobalSurahList.length > currentGlobalSurahIndex && currentGlobalSurahList[currentGlobalSurahIndex]) {
            updateGlobalPlayerUI(currentGlobalReciterData, currentGlobalSurahList[currentGlobalSurahIndex]);
        } else {
            updateGlobalPlayerUI(null, null);
        }
        updatePlayPauseButton();
        updateVolumeIcon();
        updateRepeatButtonIcon();
        updateProgressBar(); 
    }

    function updateGlobalPlayerUI(reciter, surah) {
        if (!globalPlayerReciterImg || !globalPlayerSurahNameEl || !globalPlayerReciterNameEl) return;

        if (!reciter || !surah) {
            globalPlayerSurahNameEl.textContent = "No track selected";
            globalPlayerReciterNameEl.textContent = "Reciter";
            globalPlayerReciterImg.src = 'images/default-reciter.png';
            return;
        }
        globalPlayerReciterImg.src = reciter.image || 'images/default-reciter.png';
        globalPlayerSurahNameEl.textContent = surah.name;
        globalPlayerReciterNameEl.textContent = reciter.name;
    }

    window.loadReciterIntoGlobalPlayer = function(reciterToLoad, surahListToUse, surahIndexToPlay) {
        if (!audioElement || !reciterToLoad || !surahListToUse || surahIndexToPlay < 0 || surahIndexToPlay >= surahListToUse.length) {
            console.error("Invalid parameters for loadReciterIntoGlobalPlayer or audio element missing."); return;
        }
        currentGlobalReciterData = reciterToLoad;
        currentGlobalSurahList = surahListToUse; 
        currentGlobalSurahIndex = surahIndexToPlay;
        const surah = currentGlobalSurahList[surahIndexToPlay];
        if (!surah) { 
            console.error("Surah data not found for index:", surahIndexToPlay);
            return;
        }
        const surahFilename = `${String(surah.id).padStart(3, '0')}.mp3`;

        audioElement.src = `${currentGlobalReciterData.audioBasePath}${surahFilename}`;
        updateGlobalPlayerUI(currentGlobalReciterData, surah);
        showGlobalPlayer();
        audioElement.play().catch(e => console.error("Play error on loadReciter: ", e));
        saveGlobalPlayerState();
        document.dispatchEvent(new CustomEvent('globalPlayerTrackChanged', { detail: { reciterId: reciterToLoad.id, surahIndex: surahIndexToPlay } }));
    };

    function saveGlobalPlayerState() {
        if (typeof localStorage === 'undefined' || !audioElement) return;
        const state = {
            reciterId: currentGlobalReciterData ? currentGlobalReciterData.id : null,
            surahIndex: currentGlobalSurahIndex,
            currentTime: audioElement.currentTime || 0,
            volume: audioElement.volume, muted: audioElement.muted,
            repeatMode: repeatMode, isPlaying: isPlaying && !audioElement.paused && !!audioElement.src,
            volumeBeforeMute: volumeBeforeMute
        };
        localStorage.setItem(GLOBAL_PLAYER_STATE_KEY, JSON.stringify(state));
    }

    function loadGlobalPlayerState() {
        if (typeof localStorage === 'undefined' || !audioElement) return;
        const savedStateJSON = localStorage.getItem(GLOBAL_PLAYER_STATE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                audioElement.volume = savedState.volume !== undefined ? savedState.volume : 1;
                audioElement.muted = savedState.muted !== undefined ? savedState.muted : false;
                if(volumeSlider) volumeSlider.value = audioElement.muted ? 0 : audioElement.volume;
                repeatMode = savedState.repeatMode || 'none';
                volumeBeforeMute = savedState.volumeBeforeMute !== undefined ? savedState.volumeBeforeMute : 1;

                const reciter = recitersData.find(r => r.id === savedState.reciterId);
                if (reciter && typeof surahData !== 'undefined' && typeof savedState.surahIndex === 'number' && savedState.surahIndex !== -1 && savedState.surahIndex < surahData.length) {
                    currentGlobalReciterData = reciter;
                    currentGlobalSurahList = surahData; 
                    currentGlobalSurahIndex = savedState.surahIndex;
                    const surah = currentGlobalSurahList[currentGlobalSurahIndex];
                     if (!surah) {
                        clearGlobalPlayerStateAndUI();
                        return;
                    }
                    const surahFilename = `${String(surah.id).padStart(3, '0')}.mp3`;
                    audioElement.src = `${currentGlobalReciterData.audioBasePath}${surahFilename}`;
                                        
                    audioElement.onloadedmetadata = () => { 
                        audioElement.currentTime = savedState.currentTime || 0;
                        updateAllUIComponents(); 
                        audioElement.onloadedmetadata = null; 
                    };
                }
            } catch (e) { console.error("Error parsing global player state:", e); localStorage.removeItem(GLOBAL_PLAYER_STATE_KEY); }
        }
    }
    
    function clearGlobalPlayerStateAndUI() {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(GLOBAL_PLAYER_STATE_KEY);
        currentGlobalReciterData = null; currentGlobalSurahIndex = -1; currentGlobalSurahList = [];
        if(audioElement) { audioElement.pause(); audioElement.src = ''; }
        isPlaying = false;
        updateAllUIComponents();
        hideGlobalPlayer();
        document.dispatchEvent(new CustomEvent('globalPlayerTrackChanged', { detail: { reciterId: null, surahIndex: -1 } }));
    }

    // MODIFIED: formatTime to include hours
    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) return "--:--";
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;

        if (hours > 0) {
            return `${hours}:${paddedMinutes}:${paddedSeconds}`;
        } else {
            return `${minutes}:${paddedSeconds}`;
        }
    }

    function globalPlayPause() {
        if (!audioElement) return;
        if (!audioElement.src || audioElement.src === window.location.href || audioElement.currentSrc === "") {
            if (currentGlobalReciterData && currentGlobalSurahIndex !== -1) {
                 audioElement.play().catch(e => console.error("Play error (no src but state exists):", e));
            } else if (typeof window.initiatePlayFromReciterPage === "function") {
                 window.initiatePlayFromReciterPage();
            } else { console.warn("No audio source loaded to play."); }
            return;
        }
        if (audioElement.paused) audioElement.play().catch(e=>console.error("Play error (src exists):",e));
        else audioElement.pause();
    }
    function globalNext() {
        if (!currentGlobalReciterData || !currentGlobalSurahList || currentGlobalSurahList.length === 0) return;
        let nextIndex = currentGlobalSurahIndex + 1;
        if (nextIndex >= currentGlobalSurahList.length) {
            if (repeatMode === 'all') nextIndex = 0;
            else { isPlaying = false; updatePlayPauseButton(); return; }
        }
        if (typeof window.loadReciterIntoGlobalPlayer === "function") {
            window.loadReciterIntoGlobalPlayer(currentGlobalReciterData, currentGlobalSurahList, nextIndex);
        }
    }
    function globalPrev() {
        if (!currentGlobalReciterData || !currentGlobalSurahList || currentGlobalSurahList.length === 0) return;
        let prevIndex = currentGlobalSurahIndex - 1;
        if (prevIndex < 0) {
            if (repeatMode === 'all') prevIndex = currentGlobalSurahList.length - 1;
            else return;
        }
        if (typeof window.loadReciterIntoGlobalPlayer === "function") {
            window.loadReciterIntoGlobalPlayer(currentGlobalReciterData, currentGlobalSurahList, prevIndex);
        }
    }
    function updateProgressBar() {
        if (!audioElement || !progressBar || !currentTimeEl || !totalTimeEl) return;
        const { duration, currentTime } = audioElement;
        if (isFinite(duration) && duration > 0) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            currentTimeEl.textContent = formatTime(currentTime); // Uses updated formatTime
            totalTimeEl.textContent = formatTime(duration);   // Uses updated formatTime
        } else {
            progressBar.style.width = `0%`;
            currentTimeEl.textContent = formatTime(0);
            totalTimeEl.textContent = "--:--";
        }
    }
    function setProgress(e) {
        if (!audioElement || !this.clientWidth || !isFinite(audioElement.duration) || audioElement.duration === 0) return;
        audioElement.currentTime = (e.offsetX / this.clientWidth) * audioElement.duration;
    }
    function toggleVolume() {
        if (!audioElement) return;
        if (audioElement.muted) {
            audioElement.muted = false;
            audioElement.volume = (volumeBeforeMute > 0.01) ? volumeBeforeMute : 0.01; 
            if (volumeSlider) volumeSlider.value = audioElement.volume;
        } else {
            volumeBeforeMute = audioElement.volume;
            audioElement.muted = true;
        }
    }
    function setVolume() {
        if(audioElement && volumeSlider) {
            const newVolume = parseFloat(volumeSlider.value);
            audioElement.volume = newVolume;
            audioElement.muted = newVolume === 0;
            if (newVolume > 0) volumeBeforeMute = newVolume;
        }
    }
    function updateVolumeIcon() {
        if (!volumeIcon || !audioElement || !volumeSlider) return;
        if (audioElement.muted || audioElement.volume === 0) {
            volumeIcon.src = 'images/volume-mute-icon.svg'; volumeIcon.alt = 'Unmute';
            volumeSlider.value = 0; 
        } else {
            volumeSlider.value = audioElement.volume;
            if (audioElement.volume > 0 && audioElement.volume <= 0.6) {
                volumeIcon.src = 'images/volume-medium-icon.svg'; volumeIcon.alt = 'Volume Medium';
            } else { 
                volumeIcon.src = 'images/volume-high-icon.svg'; volumeIcon.alt = 'Volume High / Mute';
            }
        }
    }
    function updatePlayPauseButton() {
        if (!playPauseBtn || !playPauseIcon || !audioElement) return;
        if (isPlaying && !audioElement.paused) {
            playPauseBtn.classList.remove('play'); playPauseBtn.classList.add('pause');
            playPauseIcon.src = 'images/pause-icon.svg'; playPauseIcon.alt = 'Pause';
        } else {
            playPauseBtn.classList.remove('pause'); playPauseBtn.classList.add('play');
            playPauseIcon.src = 'images/play-icon.svg'; playPauseIcon.alt = 'Play';
        }
    }
    function toggleRepeat() {
        if (!repeatBtn || !repeatIconImg) return;
        if (repeatMode === 'none') repeatMode = 'all';
        else if (repeatMode === 'all') repeatMode = 'one';
        else repeatMode = 'none';
        updateRepeatButtonIcon(); saveGlobalPlayerState();
    }
    function updateRepeatButtonIcon() {
        if (!repeatIconImg || !repeatBtn) return;
        if (repeatMode === 'one') {
            repeatIconImg.src = 'images/repeat-one-icon.svg'; repeatBtn.title = 'Repeat One'; repeatIconImg.style.opacity = 1;
        } else if (repeatMode === 'all') {
            repeatIconImg.src = 'images/repeat-icon.svg'; repeatBtn.title = 'Repeat All'; repeatIconImg.style.opacity = 1;
        } else {
            repeatIconImg.src = 'images/repeat-icon.svg'; repeatBtn.title = 'No Repeat'; repeatIconImg.style.opacity = 0.5;
        }
    }
    
    window.downloadCurrentGlobalTrack = function() {
        if (currentGlobalSurahIndex === -1 || !currentGlobalSurahList || !currentGlobalReciterData || !currentGlobalSurahList[currentGlobalSurahIndex]) {
            alert("No Surah selected to download from player."); return;
        }
        const surah = currentGlobalSurahList[currentGlobalSurahIndex];
        const reciter = currentGlobalReciterData;
        const surahFilename = `${String(surah.id).padStart(3, '0')}.mp3`;
        const audioSrc = `${reciter.audioBasePath}${surahFilename}`;
        const link = document.createElement('a'); link.href = audioSrc;
        link.download = `${reciter.name.replace(/\s+/g, '_')}_-_${surah.name.replace(/\s+/g, '_')}_${surahFilename}`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    function handleAudioEnd() {
        if (repeatMode === 'one') {
            if (currentGlobalReciterData && currentGlobalSurahIndex !== -1) {
                audioElement.currentTime = 0; audioElement.play().catch(e=>console.error("Replay error",e));
            }
        } else { globalNext(); }
    }

    function addGlobalPlayerEventListeners() {
        if(playPauseBtn) playPauseBtn.addEventListener('click', globalPlayPause);
        if(prevBtn) prevBtn.addEventListener('click', globalPrev);
        if(nextBtn) nextBtn.addEventListener('click', globalNext);
        if(audioElement) {
            audioElement.addEventListener('timeupdate', updateProgressBar);
            audioElement.addEventListener('loadedmetadata', () => { 
                updateAllUIComponents(); 
            }); 
            audioElement.addEventListener('ended', handleAudioEnd);
            audioElement.addEventListener('play', () => { isPlaying = true; updatePlayPauseButton(); showGlobalPlayer(); saveGlobalPlayerState(); });
            audioElement.addEventListener('pause', () => { isPlaying = false; updatePlayPauseButton(); saveGlobalPlayerState(); });
            audioElement.addEventListener('volumechange', () => { updateVolumeIcon(); saveGlobalPlayerState(); });
            audioElement.addEventListener('error', (e) => {
                console.error("Audio Element Playback Error:", audioElement.error);
                if (globalPlayerSurahNameEl) globalPlayerSurahNameEl.textContent = "Error: Track unavailable";
                isPlaying = false; updatePlayPauseButton(); updateProgressBar(); 
            });
        }
        if(progressContainer) progressContainer.addEventListener('click', setProgress);
        if(volumeBtn) volumeBtn.addEventListener('click', toggleVolume);
        if(volumeSlider) volumeSlider.addEventListener('input', setVolume);
        if(repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);
        if(downloadBtn) downloadBtn.addEventListener('click', window.downloadCurrentGlobalTrack);
        if(closePlayerBtn) closePlayerBtn.addEventListener('click', clearGlobalPlayerStateAndUI);
        window.addEventListener('beforeunload', saveGlobalPlayerState);
    }

    masterPlayerInit();
});