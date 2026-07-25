const domain = window.location.hostname;
let overlayDiv = null;
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let timerInterval = null;
// Entrée de blockedSites correspondant à cette page : sert aussi de clé de déblocage.
let matchedSite = null;

// Écouteurs de déplacement attachés au document UNE SEULE FOIS (évite l'empilement
// si l'overlay est recréé après un basculement de showOverlay).
document.addEventListener('mousemove', (e) => {
    if (!isDragging || !overlayDiv) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    overlayDiv.style.left = `${x}px`;
    overlayDiv.style.top = `${y}px`;
});

document.addEventListener('mouseup', () => {
    if (!isDragging || !overlayDiv) return;
    isDragging = false;
    overlayDiv.classList.remove('is-dragging');
    chrome.storage.local.set({
        overlayPos: { left: overlayDiv.style.left, top: overlayDiv.style.top }
    });
});

function createOverlay() {
    overlayDiv = document.createElement('div');
    overlayDiv.id = 'focus-timer-overlay';
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
        overlayDiv.classList.add('is-dragging');
        offsetX = e.clientX - overlayDiv.getBoundingClientRect().left;
        offsetY = e.clientY - overlayDiv.getBoundingClientRect().top;
        e.preventDefault();
    });
}

// On vérifie une fois si le site est concerné ; sinon on n'installe aucune boucle.
chrome.storage.local.get(['blockedSites'], (result) => {
    if (chrome.runtime.lastError) return;

    matchedSite = matchBlockedSite(domain, result.blockedSites);
    if (!matchedSite) return;

    verifierTempsEtAfficher();
    timerInterval = setInterval(verifierTempsEtAfficher, 1000);
});

function verifierTempsEtAfficher() {
    chrome.storage.local.get([matchedSite, 'showOverlay'], (result) => {
        if (chrome.runtime.lastError) return;

        const expirationTime = result[matchedSite];
        const currentTime = Date.now();

        if (!expirationTime || currentTime >= expirationTime) {
            clearInterval(timerInterval);
            const blockPageUrl = chrome.runtime.getURL("timer.html")
                + `?target=${encodeURIComponent(window.location.href)}&expired=true`;
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

            // Pulsation rouge dans les 30 dernières secondes (styles dans content.css).
            overlayDiv.classList.toggle('is-urgent', timeLeft <= 30);
        } else {
            if (overlayDiv) {
                overlayDiv.remove();
                overlayDiv = null;
            }
        }
    });
}
