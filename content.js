const domain = window.location.hostname;
let overlayDiv = null;
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let timerInterval = null;

function createOverlay() {
    overlayDiv = document.createElement('div');
    overlayDiv.id = 'focus-timer-overlay';
    
    overlayDiv.style.position = 'fixed';
    overlayDiv.style.zIndex = '999999999';
    overlayDiv.style.backgroundColor = '#ffffff';
    overlayDiv.style.color = '#ff6b00';
    overlayDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    overlayDiv.style.fontSize = '24px';
    overlayDiv.style.fontWeight = '800';
    overlayDiv.style.padding = '8px 16px';
    overlayDiv.style.borderRadius = '16px';
    overlayDiv.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
    overlayDiv.style.border = '1px solid #e2e8f0';
    overlayDiv.style.cursor = 'grab';
    overlayDiv.style.userSelect = 'none';
    overlayDiv.style.fontVariantNumeric = 'tabular-nums';
    overlayDiv.style.letterSpacing = '-0.03em';
    overlayDiv.textContent = "00:00";

    chrome.storage.local.get(['overlayPos'], (data) => {
        if (data.overlayPos) {
            overlayDiv.style.left = data.overlayPos.left;
            overlayDiv.style.top = data.overlayPos.top;
        } else {
            overlayDiv.style.left = '20px';
            overlayDiv.style.top = '20px';
        }
    });

    document.body.appendChild(overlayDiv);

    overlayDiv.addEventListener('mousedown', (e) => {
        isDragging = true;
        overlayDiv.style.cursor = 'grabbing';
        offsetX = e.clientX - overlayDiv.getBoundingClientRect().left;
        offsetY = e.clientY - overlayDiv.getBoundingClientRect().top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        overlayDiv.style.left = `${x}px`;
        overlayDiv.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            overlayDiv.style.cursor = 'grab';
            chrome.storage.local.set({
                overlayPos: { left: overlayDiv.style.left, top: overlayDiv.style.top }
            });
        }
    });
}

// OPTIMISATION ICI : On vérifie une fois si le site est concerné
chrome.storage.local.get(['blockedSites'], (result) => {
    const sites = result.blockedSites || ["instagram.com"];
    const isBlocked = sites.some(site => domain.includes(site));

    // Si ce n'est pas un site bloqué, on arrête tout, pas de boucle infinie !
    if (!isBlocked) return; 

    // S'il est bloqué, on lance le chronomètre de vérification
    verifierTempsEtAfficher();
    timerInterval = setInterval(verifierTempsEtAfficher, 1000);
});

function verifierTempsEtAfficher() {
    chrome.storage.local.get([domain, 'showOverlay'], (result) => {
        const expirationTime = result[domain];
        const currentTime = Date.now();

        if (!expirationTime || currentTime >= expirationTime) {
            const extensionId = chrome.runtime.id;
            const blockPageUrl = `chrome-extension://${extensionId}/timer.html?target=${encodeURIComponent(window.location.href)}&expired=true`;
            window.location.href = blockPageUrl;
            return;
        }

        const showOverlay = result.showOverlay !== false;
        
        if (showOverlay) {
            if (!overlayDiv) createOverlay();

            const timeLeft = Math.floor((expirationTime - currentTime) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            overlayDiv.textContent = String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
            
            if (timeLeft <= 30) {
                overlayDiv.style.color = '#ef4444';
                overlayDiv.style.animation = 'pulse 1s infinite';
            }
        } else {
            if (overlayDiv) {
                overlayDiv.remove();
                overlayDiv = null;
            }
        }
    });
}