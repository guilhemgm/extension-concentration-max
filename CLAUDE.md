# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"MEGA CONCENTRATION" — a Manifest V3 Chrome extension (French UI) that blocks distracting sites and forces the user to earn access through a friction timer. Plain vanilla JS/HTML/CSS, no build step, no dependencies, no framework.

## Development workflow

There is no build, lint, or test tooling. To work on it:

- **Load/reload:** `chrome://extensions` → enable Developer mode → "Load unpacked" → select this folder. After editing any file, click the reload icon on the extension card. Reloading the service worker (`background.js`) requires this; content-script changes require reloading the target tab too.
- **`.crx` / `.pem`:** `concentration-max.crx` is a packaged build and `concentration-max.pem` is its **private signing key** — never regenerate, overwrite, or commit changes to the key, and don't edit the `.crx` by hand. Repackage only via Chrome's "Pack extension" using the existing `.pem` when a distributable is explicitly needed.
- **Bump `version` in `manifest.json`** when producing a new package.

## Architecture

The extension enforces blocking through **two independent layers** that both read the same `chrome.storage.local` state. Understanding this dual enforcement is key — a change to blocking logic usually must be mirrored in both places:

1. **`background.js` (service worker)** — listens to `chrome.tabs.onUpdated`. On navigation to a blocked domain without a valid unlock, it redirects the tab to `timer.html?target=<url>`. This catches fresh navigations.
2. **`content.js` (content script, injected into `<all_urls>`)** — on a blocked page, polls `chrome.storage.local` every second. It renders the draggable countdown overlay and, when the unlock expires, redirects to `timer.html?...&expired=true`. This catches sessions that outlive their granted time.

### The unlock flow (`timer.html` + `timer.js`)

This is the core UX. When a blocked site is hit, `timer.js` runs a multi-step gate:

- **Focus step:** a forced wait countdown (`timeLeft`, default 120s, configurable via `timerDuration`).
- **Friction / bypass step:** clicking "bypass" makes the user *manually retype* a dynamically generated sentence (includes current time + random adverb + target domain). Exact string match required.
- **Limit step:** user picks how many minutes of access to grant. **Bypassing is penalized** — `hasBypassed` caps the grant at 5 minutes (a "tax") and disables larger preset pills.
- On success, writes `{ [domain]: expirationTime }` (an absolute `Date.now()`-based ms timestamp) to storage, then navigates to `targetUrl`.

### Deepwork mode

`timer.js` reads `deepworkEnabled/deepworkStart/deepworkEnd`. During the configured window the bypass path is removed entirely (no escape) — a blocking GIF (`stop.gif`) is shown instead. The window logic handles overnight ranges (start > end).

### Popup (`popup.html` + `popup.js`)

Settings UI. Manages the `blockedSites` list, `timerDuration`, the `showOverlay` toggle, and deepwork settings. All writes go straight to `chrome.storage.local` (mostly saved instantly on change).

## Shared storage keys (the contract between all scripts)

All coordination happens through `chrome.storage.local`. Keep these consistent across `background.js`, `content.js`, `timer.js`, and `popup.js`:

- `blockedSites` — array of domain substrings; default `["instagram.com"]`. Matching is `domain.includes(site)` (substring, not exact).
- `<domain>` — per-domain unlock **expiration timestamp** (ms). Access is valid while `Date.now() < value`.
- `timerDuration` — forced-wait seconds for the focus step (default 120).
- `showOverlay` — boolean, show the countdown overlay (default true; treated as on unless explicitly `false`).
- `overlayPos` — `{ left, top }` persisted drag position of the overlay.
- `deepworkEnabled` / `deepworkStart` / `deepworkEnd` — deepwork toggle and `HH:MM` window bounds.

## Conventions

- UI text and code comments are in **French** — match this.
- `timer.html` is listed in `web_accessible_resources`; `background.js` skips URLs containing `timer.html` to avoid a redirect loop. Preserve that guard when touching redirect logic.
