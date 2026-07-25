// 1. Initialisation de l'URL cible
const urlParams = new URLSearchParams(window.location.search);
const targetUrl = urlParams.get('target');

// Parsing sécurisé : sans paramètre `target` (ou URL invalide), on n'affiche
// pas de cible et on désactive la navigation finale plutôt que de planter.
let bypassDomain = "un site bloqué";
let validTarget = false;
if (targetUrl) {
    try {
        bypassDomain = new URL(targetUrl).hostname;
        validTarget = true;
    } catch (e) {
        bypassDomain = targetUrl;
    }
}
document.getElementById('target-url').textContent = bypassDomain;

// Changement du titre si on s'est fait expulser
const isExpired = urlParams.get('expired') === 'true';
if (isExpired) {
    document.getElementById('focus-title').textContent = "C'est fini.";
    document.getElementById('focus-subtitle').textContent = "Retourne bosser maintenant, ou patiente à nouveau.";
}

// 2. Variables d'état
let timeLeft = 120;
let timerInterval;
let hasBypassed = false;
let isDeepworkMode = false;

const timerFocus = document.getElementById('timer-focus');
const timerFriction = document.getElementById('timer-friction');

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Formatage avec le '0' devant si besoin
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');

    // Injection des spans pour verrouiller le design au pixel près
    const timeHTML = `<span class="digits">${minStr}</span><span class="colon">:</span><span class="digits">${secStr}</span>`;

    timerFocus.innerHTML = timeHTML;
    timerFriction.innerHTML = timeHTML;
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (!document.hidden) {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                unlockAccess();
            }
        }
    }, 1000);
}

// 3. Logique du Bypass
const btnShowBypass = document.getElementById('btn-show-bypass');
const stepFocus = document.getElementById('step-focus');
const stepFriction = document.getElementById('step-friction');
const targetTextElement = document.getElementById('target-text');
const userInput = document.getElementById('user-input');
const btnValidateBypass = document.getElementById('btn-validate-bypass');
const bypassError = document.getElementById('bypass-error');

// --- GÉNÉRATEUR DE PHRASE DYNAMIQUE ---
const adverbs = ["totalement", "parfaitement", "absolument", "pleinement"];
let dynamicSentence = "";

function getFormattedTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}h${m}`;
}
// ----------------------------------------

btnShowBypass.addEventListener('click', () => {
    stepFocus.style.display = "none";
    stepFriction.style.display = "block";

    const randomAdverb = adverbs[Math.floor(Math.random() * adverbs.length)];
    const timeString = getFormattedTime();

    // NOUVELLE PHRASE RACCOURCIE
    dynamicSentence = `Il est ${timeString} et je suis ${randomAdverb} conscient que j'ai des choses plus intéressantes à faire, mais je choisis d'aller sur ${bypassDomain}.`;

    targetTextElement.textContent = dynamicSentence;
    userInput.focus();
});

userInput.addEventListener('input', () => {
    bypassError.style.display = "none";
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnValidateBypass.click();
    }
});

btnValidateBypass.addEventListener('click', () => {
    if (userInput.value.trim() === dynamicSentence) {
        clearInterval(timerInterval);
        hasBypassed = true;
        unlockAccess(); // On a supprimé la sauvegarde du compteur ici !
    } else {
        bypassError.style.display = "block";
        bypassError.style.animation = 'none';
        bypassError.offsetHeight;
        bypassError.style.animation = null;
    }
});

// 4. Déblocage final
const stepLimit = document.getElementById('step-limit');
const btnFinalAccess = document.getElementById('btn-final-access');
const intendedTimeInput = document.getElementById('intended-time');
const presetPills = document.querySelectorAll('.preset-pill');
const taxNotice = document.getElementById('tax-notice');

presetPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
        intendedTimeInput.value = e.target.getAttribute('data-time');
    });
});

// Affiche l'étape « limite » ; applique la taxe (plafond 5 min) si bypass utilisé.
function unlockAccess() {
    stepFocus.style.display = "none";
    stepFriction.style.display = "none";
    stepLimit.style.display = "block";

    if (hasBypassed) {
        intendedTimeInput.value = 5;
        taxNotice.style.display = "block";

        presetPills.forEach(pill => {
            const timeVal = parseInt(pill.getAttribute('data-time'), 10);
            if (timeVal > 5) {
                pill.style.opacity = "0.3";
                pill.style.cursor = "not-allowed";
                pill.disabled = true;
            }
        });
    }
}

// Écouteur attaché une seule fois (lit hasBypassed au moment du clic).
btnFinalAccess.addEventListener('click', () => {
    // Clamp sur les bornes du champ (1 à 120 min).
    let minutesAutorisees = parseInt(intendedTimeInput.value, 10) || 5;
    minutesAutorisees = Math.min(Math.max(minutesAutorisees, 1), 120);

    if (hasBypassed && minutesAutorisees > 5) {
        intendedTimeInput.value = 5;
        taxNotice.style.animation = 'none';
        taxNotice.offsetHeight;
        taxNotice.style.animation = 'shake 0.3s ease-in-out';
        return;
    }

    // Sans cible valide, il n'y a rien à débloquer.
    if (!validTarget) return;

    const expirationTime = Date.now() + (minutesAutorisees * 60 * 1000);

    // La clé de déblocage est l'entrée de blockedSites qui correspond (cohérence
    // avec background.js et content.js), pas le hostname brut.
    chrome.storage.local.get(['blockedSites'], (res) => {
        if (chrome.runtime.lastError) return;
        const key = matchBlockedSite(bypassDomain, res.blockedSites) || bypassDomain;
        chrome.storage.local.set({ [key]: expirationTime }, () => {
            if (chrome.runtime.lastError) return;
            window.location.href = targetUrl;
        });
    });
});

// 5. Démarrage
chrome.storage.local.get(['timerDuration', 'deepworkEnabled', 'deepworkStart', 'deepworkEnd'], (result) => {
    if (chrome.runtime.lastError) return;

    if (result.deepworkEnabled) {
        const startStr = result.deepworkStart || '09:00';
        const endStr = result.deepworkEnd || '18:00';

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        if (startMins <= endMins) {
            isDeepworkMode = currentMins >= startMins && currentMins < endMins;
        } else {
            isDeepworkMode = currentMins >= startMins || currentMins < endMins;
        }
    }

    if (isDeepworkMode) {
        document.getElementById('focus-title').textContent = "Tu n'es pas censé être là !";
        document.getElementById('focus-subtitle').textContent = "Retourne vite travailler au lieu de procrastiner.";
        document.getElementById('deepwork-badge').style.display = "block";

        document.getElementById('timer-focus').style.display = "none";
        document.getElementById('btn-show-bypass').style.display = "none";
        document.getElementById('target-url').style.display = "none";

        // On affiche le GIF uniquement ici
        document.getElementById('deepwork-gif-container').style.display = "block";
    } else {
        if (result.timerDuration) {
            timeLeft = result.timerDuration;
        }
        updateDisplay();
        startTimer();
    }
});
