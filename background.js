// Ouvre la page de bienvenue lors de l'installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

// Surveille la navigation pour bloquer les sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.includes("timer.html")) {
    const urlObj = new URL(changeInfo.url);
    const domain = urlObj.hostname;

    chrome.storage.local.get(['blockedSites', domain], (result) => {
      const sites = result.blockedSites || ["instagram.com"];
      const isBlocked = sites.some(site => domain.includes(site));

      if (isBlocked) {
        const expirationTime = result[domain];
        const currentTime = Date.now();
        
        if (!(expirationTime && currentTime < expirationTime)) {
          const blockPageUrl = chrome.runtime.getURL("timer.html");
          chrome.tabs.update(tabId, { 
            url: blockPageUrl + "?target=" + encodeURIComponent(changeInfo.url) 
          });
        }
      }
    });
  }
}); 