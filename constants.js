// constants.js — source unique des valeurs partagées entre tous les scripts.
// Chargé en premier : via importScripts dans background.js, en tête des
// content_scripts, et via <script> avant popup.js / timer.js.

// Liste bloquée par défaut (utilisée tant qu'aucune n'est enregistrée).
const DEFAULT_BLOCKED_SITES = ["instagram.com"];

// Renvoie l'entrée de `sites` qui correspond au hostname, ou null.
// La correspondance reste en sous-chaîne (comportement historique) ; c'est
// aussi la clé sous laquelle le déblocage est stocké/relu, ce qui garantit
// que www.instagram.com et instagram.com partagent le même déblocage.
function matchBlockedSite(hostname, sites) {
    const list = sites && sites.length ? sites : DEFAULT_BLOCKED_SITES;
    return list.find(site => hostname.includes(site)) || null;
}
