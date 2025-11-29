## Pearl Notes App POC

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Local-first markdown notes with peer-to-peer sync, designed to keep the repo approachable for junior contributors. This README focuses on the essentials you need to boot, extend, and reason about the codebase quickly.

## Features

- Local markdown editor with autosave + live preview.
- Wiki-style `[[links]]` with inline suggestions and keyboard navigation.
- Unified editor + preview safe-areas that prevent horizontal overflow and keep typography readable on every viewport.
- Pear-end vault sharing via `pearl-vault://` links (create/join) with clipboard helpers.
- Theme + font switcher backed by persisted preferences.
- P2P Hyperdrive/Hyperswarm sync that keeps each device’s writer key private.
- This repo is configured as a single-writer vault; peers replicate from a single writer rather than adding new writers automatically.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Build the UI bundle**
   ```bash
   npm run build:ui
   ```
3. **Run the Pear desktop app** (builds UI via `predev` automatically)
   ```bash
   npm run dev
   ```
   Use `npm run watch:ui` in another terminal for live esbuild updates while developing the React UI.

## Tech Stack

- React 18 + Markdown-It for the renderer.
- CSS Modules + `styles/global.css` for styling.
- Pear runtime (`pear-electron`, `pear-bridge`) for the desktop shell.
- Hyperdrive + Hyperswarm + Corestore for storage/replication.
- `lucide-react` for consistent, accessible icons.
- Brittle for lightweight unit tests.

## Project Structure

```
.
├─ index.html / ui.js / styles/global.css   # renderer shell
├─ scripts/
│  └─ build-ui.mjs                           # esbuild config
├─ src/
│  ├─ core/
│  │  └─ pearlCore.js                      # window.Pearl surface
│  ├─ pear-end/
│  │  ├─ api.js                            # API layer
│  │  ├─ vault/
│  │  │  ├─ vaultConfig.js                 # vault configuration & links
│  │  │  ├─ hyperdriveClient.js            # Hyperdrive client
│  │  │  └─ crypto.js                      # crypto utilities
│  │  ├─ notes/
│  │  │  ├─ notesStore.js                  # notes CRUD operations
│  │  │  ├─ notesSerialization.js          # note serialization
│  │  │  ├─ notesExportConfig.js          # export configuration
│  │  │  └─ notesMirror.js                # notes mirroring to disk
│  │  └─ sync/
│  │     └─ sync.js                        # sync functionality
│  └─ ui/
│     ├─ App.jsx
│     ├─ components/
│     │  ├─ Sidebar/
│     │  │  ├─ Sidebar.jsx
│     │  │  ├─ Sidebar.module.css
│     │  │  └─ index.js
│     │  ├─ StatusBar/
│     │  │  ├─ StatusBar.jsx
│     │  │  ├─ StatusBar.module.css
│     │  │  └─ index.js
│     │  └─ WikiLinkPaletteDropdown/
│     │     ├─ WikiLinkPaletteDropdown.jsx
│     │     ├─ WikiLinkPaletteDropdown.module.css
│     │     └─ index.js
│     ├─ hooks/
│     │  ├─ useNotesWorkspace/
│     │  │  ├─ useNotesWorkspace.js
│     │  │  └─ index.js
│     │  ├─ useVaultStatus/
│     │  │  ├─ useVaultStatus.js
│     │  │  └─ index.js
│     │  ├─ useWikiPalette/
│     │  │  ├─ useWikiPalette.js
│     │  │  └─ index.js
│     │  ├─ useMediaQuery/
│     │  │  ├─ useMediaQuery.js
│     │  │  └─ index.js
│     │  └─ useThemeState/
│     │     ├─ useThemeState.js
│     │     └─ index.js
│     ├─ utils/
│     │  ├─ wikiLinkPlugin.js
│     │  └─ ... other helpers (clipboard, vault, wiki, etc.)
│     └─ themeManager.js
└─ ui.js                                     # boots React bundle from Pear
```

## Scripts

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `npm run build:ui` | Bundle `src/ui` with esbuild once                |
| `npm run watch:ui` | Watch mode for iterative UI development          |
| `npm run dev`      | Launch Pear desktop app (runs `build:ui` first)  |
| `npm test`         | Run brittle tests (`test/*.test.js`)             |

## Key Features Explained

- **Local-first autosave** – `useNotesWorkspace` orchestrates editor state, schedules debounced saves via Hyperdrive, and keeps preview HTML in sync with Markdown-It.
- **Wiki links everywhere** – `markdown/wikiLinkPlugin.js` renders `[[targets]]`, while `useWikiPalette` + `WikiLinkPaletteDropdown` provide inline suggestions and keyboard navigation.
- **Vault sharing & status** – `useVaultStatus` surfaces clipboard copy, SweetAlert-based invite modals, and live sync text from `vault/vaultConfig.js`/`sync/sync.js`.
- **Theme + font system** – `themeManager.js` tracks preferences and pushes them to `document.documentElement`; `StatusBar` exposes the selectors.
- **Scoped styling** – UI components own nearby `.module.css` files while `styles/global.css` keeps theme tokens/reset utilities.
- **Icon system** – `lucide-react` provides shared glyphs for buttons, keeping the UI consistent and accessible.

## Pear-End Schema

```
React UI ──▶ src/core/pearlCore.js ──▶ src/pear-end/api.js
   │                                         │
   │                                         ├─ vault/
   │                                         │  ├─ vaultConfig.js    (drive selection + invites)
   │                                         │  ├─ hyperdriveClient.js (Corestore/Hyperdrive handles)
   │                                         │  └─ crypto.js          (crypto utilities)
   │                                         ├─ notes/
   │                                         │  ├─ notesStore.js      (CRUD operations)
   │                                         │  ├─ notesSerialization.js (YAML frontmatter)
   │                                         │  ├─ notesExportConfig.js (export paths)
   │                                         │  └─ notesMirror.js     (disk mirroring)
   │                                         └─ sync/
   │                                            └─ sync.js            (Hyperswarm status)
   │
   └─ Hyperdrive updates reflected via useNotesWorkspace/useVaultStatus hooks
```

- **vault/** - Vault management: `vaultConfig.js` persists the active drive key and parses `pearl-vault://` links; `hyperdriveClient.js` owns Corestore/Hyperdrive handles and Hyperswarm replication; `crypto.js` provides crypto utilities.
- **notes/** - Notes management: `notesStore.js` writes `/notes/<id>.md` blobs with YAML frontmatter; `notesSerialization.js` handles parsing/serialization; `notesExportConfig.js` manages export paths; `notesMirror.js` mirrors notes to disk.
- **sync/** - Sync management: `sync.js` refreshes peer counts and timestamps, bubbling up through `_setSyncStatus` so the UI footer stays current.

For deeper roadmap, research, and acceptance criteria, see [`prd.md`](./prd.md) and [`implementation_plan.md`](./implementation_plan.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

