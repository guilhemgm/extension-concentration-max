# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"MEGA CONCENTRATION" — a Manifest V3 Chrome extension (French UI) that blocks distracting sites and forces the user to earn access through a friction timer. Plain vanilla JS/HTML/CSS, no build step, no dependencies, no framework.

### Layout

- `background.js`, `content.js`, `timer.js`, `popup.js` — the scripts.
- `constants.js` — shared code (`DEFAULT_BLOCKED_SITES`, `matchBlockedSite`) loaded before every other script.
- `styles/theme.css` — shared design tokens (`:root`) + common components, linked by the three HTML pages.
- `content.css` — the injected overlay's styles (declared in `content_scripts`).
- `icons/` — extension icons (16/48/128). `assets/` — `stop.gif` (deepwork blocker).
- `popup.html`, `timer.html`, `welcome.html` — the pages.

## Development workflow

There is no build, lint, or test tooling. To work on it:

- **Load/reload:** `chrome://extensions` → enable Developer mode → "Load unpacked" → select this folder. After editing any file, click the reload icon on the extension card. Reloading the service worker (`background.js`) requires this; content-script changes require reloading the target tab too.
- **`.crx` / `.pem`:** `concentration-max.crx` is a packaged build and `concentration-max.pem` is its **private signing key**. Both are **git-ignored** (see `.gitignore`) and must stay that way — the `.pem` must never be committed or pushed (it lets anyone sign updates impersonating this extension). Keep the `.pem` on disk; don't regenerate or overwrite it. Repackage via Chrome's "Pack extension" using the existing `.pem` when a distributable is explicitly needed.
- **Bump `version` in `manifest.json`** when producing a new package.

## Git / GitHub

- Remote: `origin` → `https://github.com/guilhemgm/extension-concentration-max.git`, branch `main`.
- Never `git add` the `.pem` or `.crx` (they're git-ignored). If either ever gets committed, treat the key as compromised, purge it from history, and force-push.

## Architecture

The extension enforces blocking through **two independent layers** that both read the same `chrome.storage.local` state. Understanding this dual enforcement is key — a change to blocking logic usually must be mirrored in both places:

1. **`background.js` (service worker)** — `importScripts('constants.js')`, then listens to `chrome.tabs.onUpdated`. On navigation to a blocked domain without a valid unlock, it redirects the tab to `timer.html?target=<url>`. This catches fresh navigations. It also sets `DEFAULT_BLOCKED_SITES` on `onInstalled` if none is stored.
2. **`content.js` (content script, injected into `<all_urls>`, after `constants.js`)** — on a blocked page, polls `chrome.storage.local` every second. It renders the draggable countdown overlay (styled by `content.css`) and, when the unlock expires, redirects to `timer.html?...&expired=true`. This catches sessions that outlive their granted time.

All three enforcement scripts resolve which blocked entry a hostname matches via the shared **`matchBlockedSite(hostname, sites)`** in `constants.js` — use it rather than re-implementing the match, so blocking and the unlock key stay consistent.

### The unlock flow (`timer.html` + `timer.js`)

This is the core UX. When a blocked site is hit, `timer.js` runs a multi-step gate:

- **Focus step:** a forced wait countdown (`timeLeft`, default 120s, configurable via `timerDuration`).
- **Friction / bypass step:** clicking "bypass" makes the user *manually retype* a dynamically generated sentence (includes current time + random adverb + target domain). Exact string match required.
- **Limit step:** user picks how many minutes of access to grant (clamped 1–120). **Bypassing is penalized** — `hasBypassed` caps the grant at 5 minutes (a "tax") and disables larger preset pills.
- On success, writes `{ [matchedSite]: expirationTime }` (an absolute `Date.now()`-based ms timestamp) to storage — the key is the matched `blockedSites` entry (via `matchBlockedSite`), **not** the raw hostname — then navigates to `targetUrl`.
- `targetUrl` is parsed with a `try/catch`; a missing/invalid `target` param no longer crashes the page (navigation is simply disabled).

### Deepwork mode

`timer.js` reads `deepworkEnabled/deepworkStart/deepworkEnd`. During the configured window the bypass path is removed entirely (no escape) — a blocking GIF (`stop.gif`) is shown instead. The window logic handles overnight ranges (start > end).

### Popup (`popup.html` + `popup.js`)

Settings UI. Manages the `blockedSites` list, `timerDuration`, the `showOverlay` toggle, and deepwork settings. All writes go straight to `chrome.storage.local` (mostly saved instantly on change).

## Shared storage keys (the contract between all scripts)

All coordination happens through `chrome.storage.local`. Keep these consistent across `background.js`, `content.js`, `timer.js`, and `popup.js`:

- `blockedSites` — array of domain substrings; default is `DEFAULT_BLOCKED_SITES` in `constants.js` (`["instagram.com"]`), seeded once on install. Matching is substring (`hostname.includes(site)`), centralized in `matchBlockedSite`.
- `<matched blocked site>` — unlock **expiration timestamp** (ms), keyed by the matched `blockedSites` entry (e.g. `instagram.com`), not the raw hostname — so `www.` and bare domains share one unlock. Access is valid while `Date.now() < value`.
- `timerDuration` — forced-wait seconds for the focus step (default 120).
- `showOverlay` — boolean, show the countdown overlay (default true; treated as on unless explicitly `false`).
- `overlayPos` — `{ left, top }` persisted drag position of the overlay.
- `deepworkEnabled` / `deepworkStart` / `deepworkEnd` — deepwork toggle and `HH:MM` window bounds.

## Conventions

- UI text and code comments are in **French** — match this.
- `timer.html` is listed in `web_accessible_resources`; `background.js` skips URLs containing `timer.html` to avoid a redirect loop. Preserve that guard when touching redirect logic.
- **`constants.js` must load first** everywhere: via `importScripts` in the worker, as the first entry of `content_scripts.js`, and via `<script>` before `timer.js`/`popup.js`. Don't reference `matchBlockedSite`/`DEFAULT_BLOCKED_SITES` without that ordering.
- **Styling:** shared colors/components live in `styles/theme.css` (`:root` tokens + `.card`/`.btn-submit`/`.badge*`); each page keeps only its page-specific CSS and may override a token (e.g. `--radius`). The overlay's look belongs in `content.css`, not inline in `content.js`.
- Wrap `new URL(...)` in `try/catch` and check `chrome.runtime.lastError` in storage callbacks — both patterns are already used throughout.
