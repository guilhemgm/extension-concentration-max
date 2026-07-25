// Constantes partagées (DEFAULT_BLOCKED_SITES, matchBlockedSite).
importScripts('constants.js');

// À l'installation : page de bienvenue + valeurs par défaut posées une seule fois.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
  // Garantit la présence de la liste par défaut (install comme mise à jour).
  chrome.storage.local.get(['blockedSites'], (result) => {
    if (chrome.runtime.lastError) return;
    if (!result.blockedSites) {
      chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
    }
  });
});

// Surveille la navigation pour bloquer les sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || changeInfo.url.includes("timer.html")) return;

  let domain;
  try {
    domain = new URL(changeInfo.url).hostname;
  } catch (e) {
    return; // URL non parsable : on ignore.
  }

  chrome.storage.local.get(['blockedSites'], (result) => {
    if (chrome.runtime.lastError) return;

    const matchedSite = matchBlockedSite(domain, result.blockedSites);
    if (!matchedSite) return;

    // Le déblocage est stocké sous la clé du site correspondant (pas le hostname brut).
    chrome.storage.local.get([matchedSite], (unlock) => {
      if (chrome.runtime.lastError) return;

      const expirationTime = unlock[matchedSite];
      const currentTime = Date.now();

      if (!(expirationTime && currentTime < expirationTime)) {
        const blockPageUrl = chrome.runtime.getURL("timer.html");
        chrome.tabs.update(tabId, {
          url: blockPageUrl + "?target=" + encodeURIComponent(changeInfo.url)
        });
      }
    });
  });
});
