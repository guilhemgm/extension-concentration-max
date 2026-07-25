// 1. Initialisation de l'URL cible
const urlParams = new URLSearchParams(window.location.search);
const targetUrl = urlParams.get('target') || "un site bloqué";
const urlObj = new URL(targetUrl);
const bypassDomain = urlObj.hostname; 
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

presetPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
        intendedTimeInput.value = e.target.getAttribute('data-time');
    });
});

function unlockAccess() {
    stepFocus.style.display = "none";
    stepFriction.style.display = "none";
    stepLimit.style.display = "block";
    
    const taxNotice = document.getElementById('tax-notice');

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

    btnFinalAccess.addEventListener('click', () => {
        let minutesAutorisees = parseInt(intendedTimeInput.value, 10) || 5;
        
        if (hasBypassed && minutesAutorisees > 5) {
            intendedTimeInput.value = 5; 
            minutesAutorisees = 5;
            taxNotice.style.animation = 'none';
            taxNotice.offsetHeight; 
            taxNotice.style.animation = 'shake 0.3s ease-in-out';
            return; 
        }

        const expirationTime = Date.now() + (minutesAutorisees * 60 * 1000);
        const domain = urlObj.hostname;

        chrome.storage.local.set({ [domain]: expirationTime }, () => {
            window.location.href = targetUrl;
        });
    });
}

// 5. Démarrage
chrome.storage.local.get(['timerDuration', 'deepworkEnabled', 'deepworkStart', 'deepworkEnd'], (result) => {
    
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
        
        // NOUVEAU : On affiche le GIF uniquement ici
        document.getElementById('deepwork-gif-container').style.display = "block";
    } else {
        if (result.timerDuration) {
            timeLeft = result.timerDuration;
        }
        updateDisplay();
        startTimer();
    }
});