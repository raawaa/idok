# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- `npm start` - Start the Electron application in development mode
- `npm run build` - Build the application for distribution using electron-builder
- `npm run release` - Create a new release version using standard-version
- `npm run release:minor` - Create a minor version release
- `npm run release:patch` - Create a patch version release
- `npm run release:major` - Create a major version release

### Testing
No test framework is currently configured (`npm test` returns an error).

## Project Architecture

This is an Electron-based media library management application for local AV files with a modular architecture.

### Core Architecture Patterns

**Layered Architecture**: The application follows a clear separation of concerns:
- **Main Process** (`src/main/`): Handles system interactions, file operations, and window management
- **Renderer Process** (`src/renderer/`): Manages UI components and user interactions
- **Services Layer** (`src/main/services/`): Contains business logic for file operations and media scanning
- **Handlers Layer** (`src/main/handlers/`): IPC handlers that bridge main and renderer processes
- **Components Layer** (`src/renderer/components/`): Reusable UI components
- **Shared Layer** (`src/shared/`): Constants and utilities shared across processes

**Event-Driven Communication**: Uses Electron's IPC (Inter-Process Communication) for main-renderer communication:
- `ipcMain.handle()` for request-response patterns
- `ipcRenderer.on()` for subscribing to main process events
- `ipcRenderer.send()` for sending events to main process

### Key Files and Their Responsibilities

**Entry Points:**
- `src/main/main.js` - Main process entry, window creation, IPC handler registration
- `src/renderer/renderer.js` - Renderer process entry, UI initialization, event handling
- `index.html` - Main UI HTML file

**Core Services:**
- `src/main/services/media-service.js` - Media file scanning, NFO parsing with xml2js
- `src/main/services/file-service.js` - File operations, path validation, settings persistence

**IPC Handlers:**
- `src/main/handlers/media-handlers.js` - Media scanning, video playback, deletion operations
- `src/main/handlers/settings-handlers.js` - Configuration management, directory management
- `src/main/handlers/window-handlers.js` - Window controls, context menus

**UI Components:**
- `src/renderer/components/media-grid.js` - Media grid rendering, filtering, sorting
- `src/renderer/components/settings-modal.js` - Settings dialog management

**Shared Resources:**
- `src/shared/constants.js` - Video extensions, cover names, message types, themes

### Data Flow

1. **Initialization**: Main process reads settings → creates window → triggers initial scan if directories configured
2. **Media Scanning**: Renderer requests scan → Main process scans directories → Parses NFO files → Returns media list
3. **UI Updates**: Renderer receives media data → Updates grid → Populates filter dropdowns
4. **User Actions**: UI interactions → IPC calls → Main process operations → Results sent back to renderer

### Media Processing Logic

The application scans for video files and pairs them with NFO metadata files:
- Video files identified by extensions in `VIDEO_EXTENSIONS` constant
- NFO files parsed as XML using xml2js to extract movie metadata
- Cover images detected by common names (`folder.jpg`, `poster.jpg`)
- Media items stored as objects with title, actors, studio, genres, release dates, etc.

### Settings Management

Settings are stored as JSON in `{userData}/settings.json`:
- Directories to scan
- Preferred video player
- Theme preferences
- All settings operations go through dedicated IPC handlers

### Security Considerations

The application includes path validation to prevent access to dangerous system locations using `DANGEROUS_PATH_PATTERNS` constant. All file paths are validated before operations.

### Window Management

Custom frameless window with:
- Custom title bar and window controls
- Minimize, maximize/restore, close functionality
- Window state tracking and synchronization

### Development Notes

- No frameworks used - pure HTML/CSS/JavaScript with Electron
- Modular require() system for code organization
- Extensive console logging for debugging (visible in dev tools)
- Chinese comments and UI text throughout the codebase
- Currently on refactor branch with modular architecture improvements