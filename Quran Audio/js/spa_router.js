// js/main_script.js
document.addEventListener('DOMContentLoaded', () => {
    const globalPlayerContainer = document.getElementById('global-audio-player-container');
    const mainContentElement = document.getElementById('main-content');
    const headerElement = document.querySelector('header');

    function populateHomepageReciters() {
        const hafsGrid = document.querySelector('#reciters-hafs .reciter-grid');
        const nonHafsGrid = document.querySelector('#reciters-non-hafs .reciter-grid');
        if (hafsGrid && nonHafsGrid) {
            if (typeof recitersData !== 'undefined' && recitersData.length > 0) {
                recitersData.forEach(reciter => {
                    const reciterCard = `
                        <a href="reciter.html?reciter=${reciter.id}" class="reciter-card">
                            <img src="${reciter.image || 'images/default-reciter.png'}" alt="${reciter.name}">
                            <h3>${reciter.name}</h3>
                            <p>${reciter.riwaya}</p>
                        </a>`;
                    if (reciter.category === "Hafs") hafsGrid.innerHTML += reciterCard;
                    else if (reciter.category === "Non-Hafs") nonHafsGrid.innerHTML += reciterCard;
                });
            } else {
                if(hafsGrid) hafsGrid.innerHTML = "<p>No Hafs reciters found.</p>";
                if(nonHafsGrid) nonHafsGrid.innerHTML = "<p>No Non-Hafs reciters found.</p>";
            }
        }
    }

    let currentReciterForPage = null;
    let surahLiElementsReciterPage = [];
    let tempAudioForPageDurationsMap = new Map();

    function reciterIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('reciter');
    }
    
    // MODIFIED: formatTime to include hours (consistent with global_player.js)
    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) return "--:--";
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        // const paddedHours = hours < 10 ? `0${hours}` : hours; // If you want leading zero for hours

        if (hours > 0) {
            return `${hours}:${paddedMinutes}:${paddedSeconds}`;
        } else {
            return `${minutes}:${paddedSeconds}`;
        }
    }


    function initReciterPage() {
        const reciterPageImageEl = document.getElementById('reciter-page-image');
        const reciterPageNameTitleEl = document.getElementById('reciter-page-name-title');
        const reciterPageRiwayaEl = document.getElementById('reciter-page-riwaya');
        const surahListEl = document.getElementById('surah-list'); 
        const surahSearchInputEl = document.getElementById('surah-search-input');
        const currentSurahDisplayEl = document.getElementById('current-surah-display-reciter-page');
        const reciterBioContentEl = document.getElementById('reciter-page-bio-content');

        const reciterId = reciterIdFromUrl();
        currentReciterForPage = recitersData.find(r => r.id === reciterId); 

        if (!currentReciterForPage) {
            if(reciterPageNameTitleEl) reciterPageNameTitleEl.textContent = "Reciter not found";
            if(reciterBioContentEl && reciterBioContentEl.parentElement.id === 'reciter-bio-section') {
                 reciterBioContentEl.parentElement.style.display = 'none';
            } else if (reciterBioContentEl) {
                 reciterBioContentEl.innerHTML = ""; 
            }
            const reciterInfoHeader = document.querySelector('.reciter-info-header');
            const surahListSectionHtmlEl = document.querySelector('.surah-list-section');
            if(reciterInfoHeader) reciterInfoHeader.style.display = 'none';
            if(surahListSectionHtmlEl) surahListSectionHtmlEl.style.display = 'none';
            return;
        }

        document.title = `${currentReciterForPage.name} - Quran Audio Hub`;
        if(reciterPageImageEl) reciterPageImageEl.src = currentReciterForPage.image || 'images/default-reciter.png';
        if(reciterPageNameTitleEl) reciterPageNameTitleEl.textContent = currentReciterForPage.name;
        if(reciterPageRiwayaEl) reciterPageRiwayaEl.textContent = currentReciterForPage.riwaya;

        if (currentReciterForPage.bio && reciterBioContentEl) {
            reciterBioContentEl.innerHTML = currentReciterForPage.bio;
        } else if (reciterBioContentEl) {
            reciterBioContentEl.innerHTML = ""; 
            reciterBioContentEl.style.display = 'none'; 
        }
        
        if(currentSurahDisplayEl) currentSurahDisplayEl.textContent = "Surah List";


        if(surahListEl) {
            populateSurahListForThisPage(currentReciterForPage, surahData, surahListEl);
            fetchAndDisplayPageSurahDurations(currentReciterForPage, surahData); 
             if (surahSearchInputEl) {
                surahSearchInputEl.addEventListener('input', () => {
                    filterSurahListOnThisPage(surahData, surahListEl, surahSearchInputEl);
                });
            }
        } else {
            console.error("Surah list element (#surah-list) not found on reciter page.");
        }
        
        document.addEventListener('globalPlayerTrackChanged', (e) => {
            const { reciterId: playerReciterId, surahIndex: playerSurahIndex } = e.detail;
            if (currentReciterForPage && currentReciterForPage.id === playerReciterId) {
                updateActiveSurahOnThisPageList(playerSurahIndex, surahListEl);
                if(currentSurahDisplayEl && playerSurahIndex !== -1 && typeof surahData !== 'undefined' && surahData[playerSurahIndex]) {
                     currentSurahDisplayEl.textContent = `Now Playing: ${surahData[playerSurahIndex].name}`;
                } else if (currentSurahDisplayEl) {
                    currentSurahDisplayEl.textContent = `Surah List`;
                }
            } else if (currentReciterForPage) {
                updateActiveSurahOnThisPageList(-1, surahListEl);
                 if(currentSurahDisplayEl) currentSurahDisplayEl.textContent = `Surah List`;
            }
        });
        
        const initialPlayerStateRaw = localStorage.getItem(GLOBAL_PLAYER_STATE_KEY); 
        if(initialPlayerStateRaw) {
            try {
                const initialPlayerState = JSON.parse(initialPlayerStateRaw);
                if (currentReciterForPage && initialPlayerState.reciterId === currentReciterForPage.id && typeof initialPlayerState.surahIndex === 'number') {
                    updateActiveSurahOnThisPageList(initialPlayerState.surahIndex, surahListEl);
                    if(currentSurahDisplayEl && initialPlayerState.surahIndex !== -1 && typeof surahData !== 'undefined' && surahData[initialPlayerState.surahIndex]) {
                        currentSurahDisplayEl.textContent = `Now Playing: ${surahData[initialPlayerState.surahIndex].name}`;
                    }
                }
            } catch(e) { console.error("Error parsing initial player state for reciter page UI:", e); }
        }
    }
    
    window.initiatePlayFromReciterPage = function() {
        const reciterId = reciterIdFromUrl();
        const reciter = recitersData.find(r => r.id === reciterId);
        if (reciter && typeof surahData !== 'undefined' && surahData.length > 0) {
            if (typeof window.loadReciterIntoGlobalPlayer === "function") {
                window.loadReciterIntoGlobalPlayer(reciter, surahData, 0);
            }
        }
    };

    function populateSurahListForThisPage(currentReciterPopulate, fullSurahDataPopulate, listElementPopulate) {
        if (!listElementPopulate || !currentReciterPopulate || !fullSurahDataPopulate) {
            return;
        }
        
        surahLiElementsReciterPage = []; 
        listElementPopulate.innerHTML = '';

        fullSurahDataPopulate.forEach((surah, index) => {
            const li = document.createElement('li');
            li.dataset.surahIndexOriginal = index; 
            li.dataset.searchNameEn = surah.name.toLowerCase();
            li.dataset.searchNameAr = surah.arabic; 
            li.dataset.searchAyahs = String(surah.ayahs);
            li.dataset.searchNumber = String(surah.id);
            
            li.innerHTML = `
                <div class="surah-item-main-info">
                    <div class="surah-item-primary">
                        <span class="surah-number">${String(surah.id).padStart(3, '0')}.</span>
                        <span class="surah-name-en">${surah.name}</span>
                    </div>
                    <div class="surah-item-details">
                        <span class="surah-ayahs">Ayahs: ${surah.ayahs}</span>
                        <span class="surah-duration-display loading" id="page-duration-idx-${index}">--:--</span>
                    </div>
                </div>
                <span class="surah-name-ar">${surah.arabic}</span>
                <div class="surah-item-actions">
                    <button class="control-btn surah-download-btn" aria-label="Download ${surah.name}">
                        <img src="images/download-icon.svg" alt="Download">
                    </button>
                </div>`;
            
            li.querySelector('.surah-item-main-info').addEventListener('click', () => {
                if (typeof window.loadReciterIntoGlobalPlayer === "function") {
                    window.loadReciterIntoGlobalPlayer(currentReciterPopulate, fullSurahDataPopulate, index);
                }
            });
            
            li.querySelector('.surah-download-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                downloadSpecificSurahFromList(currentReciterPopulate, surah);
            });

            listElementPopulate.appendChild(li);
            surahLiElementsReciterPage.push(li);
        });
    }
    
    function downloadSpecificSurahFromList(reciter, surah) {
        const surahFilename = `${String(surah.id).padStart(3, '0')}.mp3`;
        const audioSrc = `${reciter.audioBasePath}${surahFilename}`;
        const link = document.createElement('a'); link.href = audioSrc;
        link.download = `${reciter.name.replace(/\s+/g, '_')}_-_${surah.name.replace(/\s+/g, '_')}_${surahFilename}`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    async function fetchAndDisplayPageSurahDurations(currentReciterFetch, fullSurahDataFetch) {
        const listEl = document.getElementById('surah-list'); 
        if (!listEl || !currentReciterFetch || !fullSurahDataFetch) return;

        tempAudioForPageDurationsMap.forEach(audioData => {
            if (audioData && audioData.audio) {
                audioData.audio.src = ''; audioData.audio.onloadedmetadata = null;
                audioData.audio.onerror = null; audioData.audio.oncanplaythrough = null;
            }
        });
        tempAudioForPageDurationsMap.clear();

        const CHUNK_SIZE = 5;
        for (let i = 0; i < fullSurahDataFetch.length; i += CHUNK_SIZE) {
            const chunk = fullSurahDataFetch.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map((surah, chunkIndex) => {
                const originalIndex = i + chunkIndex;
                return new Promise((resolve) => {
                    const durationSpanId = `page-duration-idx-${originalIndex}`;
                    const durationSpan = document.getElementById(durationSpanId);
                    if (!durationSpan) { resolve(); return; }
                    durationSpan.textContent = "--:--"; durationSpan.classList.add('loading');

                    const surahFilename = `${String(surah.id).padStart(3, '0')}.mp3`;
                    const audioSrc = `${currentReciterFetch.audioBasePath}${surahFilename}`;
                    const tempAudio = new Audio(); tempAudio.preload = "metadata";
                    tempAudioForPageDurationsMap.set(audioSrc, { audio: tempAudio, span: durationSpan, src: audioSrc });

                    let resolved = false; let timeoutId = null;

                    const cleanupAndResolveLocal = (statusText) => {
                        if (resolved) return; resolved = true;
                        if (durationSpan) {
                           durationSpan.textContent = statusText;
                           durationSpan.classList.remove('loading');
                        }
                        const audioData = tempAudioForPageDurationsMap.get(audioSrc);
                        if (audioData) {
                            audioData.audio.src = ''; audioData.audio.onloadedmetadata = null;
                            audioData.audio.onerror = null; audioData.audio.oncanplaythrough = null;
                            tempAudioForPageDurationsMap.delete(audioSrc);
                        }
                        clearTimeout(timeoutId); resolve();
                    };
                    const handleSuccessLocal = () => {
                        if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                            cleanupAndResolveLocal(formatTime(tempAudio.duration)); // Uses updated formatTime
                        } else if (!resolved) { cleanupAndResolveLocal("N/A"); }
                    };
                    const handleErrorLocal = (errorType = "Error") => { cleanupAndResolveLocal(errorType); };
                    
                    tempAudio.onloadedmetadata = handleSuccessLocal;
                    tempAudio.oncanplaythrough = handleSuccessLocal;
                    tempAudio.onerror = () => {
                        let errorMsg = "Error";
                        if (tempAudio.error) {
                            switch (tempAudio.error.code) {
                                case 1: errorMsg = 'Aborted'; break; case 2: errorMsg = 'Network'; break;
                                case 3: errorMsg = 'Decode'; break; case 4: errorMsg = 'Unsupported'; break;
                                default: errorMsg = 'Unknown';
                            }
                        }
                        handleErrorLocal(errorMsg);
                    };
                    timeoutId = setTimeout(() => {
                        if (tempAudio.readyState >= 2 && tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) { handleSuccessLocal(); } 
                        else if (!resolved) { handleErrorLocal("Timeout"); }
                    }, 7000); 
                    tempAudio.src = audioSrc;
                });
            });
            await Promise.all(chunkPromises);
        }
    }

    function filterSurahListOnThisPage(fullSurahDataFilter, listElementFilter, searchInputFilter) {
        if (!searchInputFilter || !listElementFilter || !fullSurahDataFilter || !surahLiElementsReciterPage.length) return;
        const searchTerm = searchInputFilter.value.toLowerCase().trim();
        let visibleCount = 0;
        const noSurahMsgEl = listElementFilter.parentElement.querySelector('#no-surah-found');
        surahLiElementsReciterPage.forEach(liElement => {
            const nameEn = liElement.dataset.searchNameEn || "";
            const nameAr = liElement.dataset.searchNameAr || "";
            const ayahs = liElement.dataset.searchAyahs || "";
            const number = liElement.dataset.searchNumber || "";
            if (nameEn.includes(searchTerm) || nameAr.includes(searchTerm) || number.includes(searchTerm) || ayahs.includes(searchTerm) ) {
                liElement.classList.remove('hidden-by-search'); visibleCount++;
            } else { liElement.classList.add('hidden-by-search'); }
        });
        if (noSurahMsgEl) noSurahMsgEl.style.display = visibleCount === 0 && searchTerm.length > 0 ? 'block' : 'none';
    }

    function updateActiveSurahOnThisPageList(surahIdxToActivate, listElementUpdate) {
        if (!listElementUpdate || !surahLiElementsReciterPage || surahLiElementsReciterPage.length === 0) return;
        surahLiElementsReciterPage.forEach(li => { 
            const originalSurahIndexFromLi = parseInt(li.dataset.surahIndexOriginal);
            if (originalSurahIndexFromLi === surahIdxToActivate) {
                li.classList.add('active-surah');
                if (!li.classList.contains('hidden-by-search')) {
                    li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else { li.classList.remove('active-surah'); }
        });
    }

    function highlightActiveNav() {
        const navLinks = document.querySelectorAll('header nav ul li a');
        const currentPathname = window.location.pathname;
        const currentFullUrl = window.location.href;

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.href === currentFullUrl) {
                link.classList.add('active');
            } 
            else if ((link.pathname.endsWith('index.html') || link.pathname === '/' || link.pathname.endsWith('/quran-audio-site/')) && 
                     (currentPathname.endsWith('index.html') || currentPathname === '/' || currentPathname.endsWith('/quran-audio-site/'))) {
                link.classList.add('active');
            }
            else if (link.pathname !== '/' && !link.pathname.endsWith('index.html') && currentPathname.includes(link.pathname.substring(link.pathname.lastIndexOf('/') + 1))) {
                 if(currentPathname.substring(currentPathname.lastIndexOf('/') + 1) === link.pathname.substring(link.pathname.lastIndexOf('/') + 1) ){
                    link.classList.add('active');
                 }
            }
        });
    }
    
    function adjustPageLayoutForStickyElements() {
        document.body.style.paddingTop = '0'; 
        if (!headerElement) {
            if(mainContentElement) mainContentElement.style.paddingTop = '20px';
            return;
        }
        let headerActualHeight = headerElement.offsetHeight;
        let playerActualHeight = 0;
        if (globalPlayerContainer && globalPlayerContainer.style.display !== 'none' && globalPlayerContainer.offsetHeight > 0) {
            playerActualHeight = globalPlayerContainer.offsetHeight;
        }
        if (mainContentElement) {
            const totalStickyElementsHeight = headerActualHeight + playerActualHeight;
            mainContentElement.style.paddingTop = `${totalStickyElementsHeight}px`;
        }
    }

    if (document.getElementById('reciters-hafs')) populateHomepageReciters();
    if (document.querySelector('.reciter-page-main')) initReciterPage();
    highlightActiveNav(); 

    if (headerElement) {
        const observerCallback = () => requestAnimationFrame(adjustPageLayoutForStickyElements);
        if (globalPlayerContainer) {
            new MutationObserver(observerCallback).observe(globalPlayerContainer, { attributes: true, attributeFilter: ['style'] });
            new ResizeObserver(observerCallback).observe(globalPlayerContainer);
        }
        new ResizeObserver(observerCallback).observe(headerElement);
        requestAnimationFrame(adjustPageLayoutForStickyElements);
        setTimeout(() => requestAnimationFrame(adjustPageLayoutForStickyElements), 50);
        setTimeout(() => requestAnimationFrame(adjustPageLayoutForStickyElements), 150);
        window.addEventListener('resize', () => requestAnimationFrame(adjustPageLayoutForStickyElements));
        document.addEventListener('playerVisibilityChanged', () => requestAnimationFrame(adjustPageLayoutForStickyElements));
    } else {
        if(mainContentElement) mainContentElement.style.paddingTop = '20px';
    }
});