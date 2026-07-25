document.addEventListener('DOMContentLoaded', () => {
  const siteList = document.getElementById('site-list');
  const newSiteInput = document.getElementById('new-site');
  const addSiteBtn = document.getElementById('add-site');
  const timerInput = document.getElementById('timer-duration');
  const saveDurationIcon = document.getElementById('save-duration-icon');
  const toggleOverlay = document.getElementById('toggle-overlay');
  const toggleDeepwork = document.getElementById('toggle-deepwork');
  const deepworkStart = document.getElementById('deepwork-start');
  const deepworkEnd = document.getElementById('deepwork-end');

  // 1. Au démarrage, on charge toutes les données sauvegardées
  chrome.storage.local.get(['blockedSites', 'timerDuration', 'showOverlay', 'deepworkEnabled', 'deepworkStart', 'deepworkEnd'], (data) => {
    const sites = data.blockedSites || ['instagram.com'];
    timerInput.value = data.timerDuration || 120;
    toggleOverlay.checked = data.showOverlay !== false; 
    
    // NOUVEAU : Chargement du Deepwork
    toggleDeepwork.checked = data.deepworkEnabled || false;
    deepworkStart.value = data.deepworkStart || '09:00';
    deepworkEnd.value = data.deepworkEnd || '18:00';
    
    renderSites(sites);
  });

  // NOUVEAU : Sauvegarde instantanée des paramètres Deepwork
  toggleDeepwork.addEventListener('change', (e) => {
    chrome.storage.local.set({ deepworkEnabled: e.target.checked });
  });
  deepworkStart.addEventListener('change', (e) => {
    chrome.storage.local.set({ deepworkStart: e.target.value });
  });
  deepworkEnd.addEventListener('change', (e) => {
    chrome.storage.local.set({ deepworkEnd: e.target.value });
  });

  function triggerSaveDuration() {
    const duration = parseInt(timerInput.value, 10);
    if (duration > 0) {
      chrome.storage.local.set({ timerDuration: duration }, () => {
        saveDurationIcon.classList.add('saved');
        setTimeout(() => {
          saveDurationIcon.classList.remove('saved');
        }, 1500);
      });
    }
  }

  saveDurationIcon.addEventListener('click', triggerSaveDuration);
  timerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerSaveDuration();
      timerInput.blur();
    }
  });

  toggleOverlay.addEventListener('change', (e) => {
    chrome.storage.local.set({ showOverlay: e.target.checked });
  });

  addSiteBtn.addEventListener('click', () => {
    const newSite = newSiteInput.value.trim().toLowerCase();
    if (newSite) {
      chrome.storage.local.get(['blockedSites'], (data) => {
        const sites = data.blockedSites || ['instagram.com'];
        if (!sites.includes(newSite)) {
          sites.push(newSite);
          chrome.storage.local.set({ blockedSites: sites }, () => {
            renderSites(sites);
            newSiteInput.value = '';
          });
        }
      });
    }
  });

  function renderSites(sites) {
    siteList.innerHTML = '';
    sites.forEach((site, index) => {
      const li = document.createElement('li');
      li.textContent = site;
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = 'X';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', () => {
        sites.splice(index, 1);
        chrome.storage.local.set({ blockedSites: sites }, () => renderSites(sites));
      });
      li.appendChild(deleteBtn);
      siteList.appendChild(li);
    });
  }
});