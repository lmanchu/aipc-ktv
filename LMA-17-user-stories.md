# LMA-17: Tandem: Electron 打包 (Mac + Windows) - User Stories

## Stories Decomposition

### 1.0 - Setup File-Based Storage Service in Main Process
**Priority**: High
**Dependency**: None

Create a file-based storage service module in the Electron main process to handle persistent data storage using Node.js `fs` and `path` modules.

**Implementation**:
- Create `src/main/storage.ts` module with:
  - `StorageService` class with methods: `read`, `write`, `exists`, `delete`, `ensureDirectory`
  - Use `app.getPath('userData')` for data directory
  - Implement proper error handling for file I/O operations
  - Add JSON serialization/deserialization with validation
  - Use async/await pattern for all file operations
  - Create separate files: `playlists.json`, `queue.json`, `settings.json`

**Acceptance Criteria**:
- StorageService class is defined in `src/main/storage.ts`
- Service can read/write JSON files to userData directory
- Service handles file not found errors gracefully
- Service creates directories if they don't exist
- All file operations use async/await
- Unit tests for StorageService pass
- Typecheck passes

---

### 2.0 - Create IPC Handlers for Storage Operations
**Priority**: High
**Dependency**: 1.0

Add IPC handlers in main process to expose storage operations to renderer process through preload API.

**Implementation**:
- Add IPC handlers in `src/main/index.ts`:
  - `storage-read`: Read data file
  - `storage-write`: Write data file
  - `storage-exists`: Check if file exists
  - `storage-delete`: Delete data file
  - `storage-migrate`: Migrate from localStorage (optional)
- Expose storage API via `src/main/preload.ts` in contextBridge
- Add TypeScript types in `src/shared/types.ts` for storage operations

**Acceptance Criteria**:
- IPC handlers added in `src/main/index.ts` for all storage operations
- Storage API exposed via contextBridge in preload
- TypeScript types defined for storage operations
- Renderer can invoke storage operations via `window.electron.storage`
- All handlers include proper error handling and validation
- Unit tests for IPC handlers pass
- Typecheck passes

---

### 3.0 - Migrate Playlist Store to File-Based Storage
**Priority**: High
**Dependency**: 2.0

Update `playlistStore.ts` to use file-based storage via IPC instead of Zustand persist middleware with localStorage.

**Implementation**:
- Remove `persist` middleware from `playlistStore.ts`
- Create `src/renderer/services/playlistStorage.ts` with:
  - `savePlaylists(playlists: Playlist[]): Promise<void>`
  - `loadPlaylists(): Promise<Playlist[]>`
- Update playlistStore actions to use storage service:
  - `createPlaylist`, `deletePlaylist`, `addSongToPlaylist`, etc. trigger save
  - Initialize playlists from file on store creation
- Add loading/error states to playlistStore
- Handle storage errors gracefully with user notifications

**Acceptance Criteria**:
- `persist` middleware removed from playlistStore
- `playlistStorage.ts` service created with save/load methods
- PlaylistStore initialized from file on startup
- Playlist mutations trigger file save
- Storage errors caught and handled with user feedback
- Tests for playlistStorage service pass
- Tests for playlistStore integration pass
- Typecheck passes

---

### 4.0 - Add Queue Persistence Support
**Priority**: Medium
**Dependency**: 2.0

Add optional file-based persistence for the playback queue to restore queue state on app restart.

**Implementation**:
- Create `src/renderer/services/queueStorage.ts` with:
  - `saveQueue(queue: Queue): Promise<void>`
  - `loadQueue(): Promise<Queue | null>`
- Update queueStore to load queue on initialization
- Save queue on state changes (add/remove songs, reorder, etc.)
- Add preference setting in store to enable/disable queue persistence
- Load queue only if persistence is enabled

**Acceptance Criteria**:
- `queueStorage.ts` service created with save/load methods
- QueueStore loads queue from file on startup if enabled
- Queue mutations trigger file save
- User preference added to enable/disable queue persistence
- Queue state restored correctly on app restart when enabled
- Tests for queueStorage service pass
- Tests for queueStore integration pass
- Typecheck passes

---

### 5.0 - Create Data Migration Utility
**Priority**: Medium
**Dependency**: 2.0, 3.0

Create a utility to migrate existing playlist data from localStorage to file-based storage for existing users.

**Implementation**:
- Create `src/renderer/services/storageMigration.ts` with:
  - `checkMigrationNeeded(): Promise<boolean>`
  - `migrateFromLocalStorage(): Promise<void>`
  - `clearLocalStorage(): void`
- Check for existing localStorage data on app startup
- Offer migration prompt to users with existing data
- Migrate playlists and queue data (if queue persistence enabled)
- Clear localStorage after successful migration
- Log migration status

**Acceptance Criteria**:
- `storageMigration.ts` service created
- Migration check runs on app startup
- Migration prompt shown to users with existing data
- LocalStorage data successfully migrated to file storage
- LocalStorage cleared after successful migration
- Migration status logged to console
- Tests for migration utility pass
- Typecheck passes

---

### 6.0 - Update electron-builder Configuration for Mac
**Priority**: High
**Dependency**: None

Review and update `electron-builder.yml` configuration to ensure proper macOS .dmg packaging.

**Implementation**:
- Review and update `electron-builder.yml`:
  - Verify `appId: com.aipc.ktv`
  - Verify macOS category: `public.app-category.entertainment`
  - Ensure icon path: `build/icons/icon.icns`
  - Configure target: `dmg` with both x64 and arm64 architectures
  - Set proper artifactName format
  - Configure code signing (if needed for distribution)
- Ensure icon.icns exists and is valid
- Add entitlements file if needed for macOS

**Acceptance Criteria**:
- `electron-builder.yml` has correct macOS configuration
- `appId` set to `com.aipc.ktv`
- macOS category set correctly
- Icon path points to valid .icns file
- Target configured for .dmg with x64 and arm64
- ArtifactName format is consistent
- Typecheck passes

---

### 7.0 - Update electron-builder Configuration for Windows
**Priority**: High
**Dependency**: None

Review and update `electron-builder.yml` configuration to ensure proper Windows .exe packaging.

**Implementation**:
- Review and update `electron-builder.yml`:
  - Verify Windows icon path: `build/icons/icon.ico`
  - Configure target: `nsis` with x64 architecture
  - Configure NSIS installer options:
    - `oneClick: false`
    - `allowToChangeInstallationDirectory: true`
    - `createDesktopShortcut: true`
    - `createStartMenuShortcut: true`
  - Set proper artifactName format
- Ensure icon.ico exists and is valid
- Configure installer UI text if needed

**Acceptance Criteria**:
- `electron-builder.yml` has correct Windows configuration
- Icon path points to valid .ico file
- Target configured for .exe with NSIS installer
- NSIS options configured correctly
- ArtifactName format is consistent
- Typecheck passes

---

### 8.0 - Test Mac Packaging (DMG Build)
**Priority**: High
**Dependency**: 6.0

Build and test the macOS .dmg package to ensure it works correctly.

**Implementation**:
- Run `npm run dist:mac` to build .dmg
- Verify build succeeds without errors
- Check that .dmg file is created in `release/1.0.0/` directory
- Verify .dmg can be opened and app can be installed
- Test that app launches correctly after installation
- Verify app icon appears correctly
- Test basic app functionality (search, queue, playlists)
- Verify file-based storage works correctly in packaged app

**Acceptance Criteria**:
- `npm run dist:mac` completes successfully
- .dmg file created in release directory
- .dmg can be opened and app installed
- App launches without errors
- App icon displays correctly
- Basic functionality works in packaged app
- File-based storage operations work correctly
- Typecheck passes

---

### 9.0 - Verify Windows Packaging Configuration (EXE Build)
**Priority**: High
**Dependency**: 7.0

Verify Windows packaging configuration is correct (actual build requires Windows environment).

**Implementation**:
- Review `electron-builder.yml` Windows configuration
- Verify all paths and settings are correct
- Check icon.ico format and validity
- Review NSIS installer settings
- Document Windows build requirements:
  - Need Windows machine or Windows VM
  - Need Wine for cross-platform builds (optional)
- Create build verification script if possible
- Document manual testing steps for Windows

**Acceptance Criteria**:
- Windows configuration in `electron-builder.yml` is complete
- Icon.ico file exists and is valid format
- NSIS settings are properly configured
- Build requirements documented in README or docs
- Manual testing steps documented
- Typecheck passes

---

### 10.0 - Verify electron-updater Configuration
**Priority**: High
**Dependency**: None

Review and verify that electron-updater is properly configured for auto-update functionality.

**Implementation**:
- Review `electron-builder.yml` publish configuration:
  - Ensure `publish: null` or proper GitHub provider config
  - Check if `publish.url` is set correctly for GitHub releases
- Review `src/main/update.ts` implementation:
  - Verify autoUpdater configuration
  - Check IPC handlers: `check-update`, `start-download`, `quit-and-install`
  - Ensure update events are properly forwarded to renderer
- Verify preload exposes update API
- Check that renderer update UI components exist
- Test update check in development mode (should show error about packaged app)

**Acceptance Criteria**:
- electron-builder.yml has correct publish configuration
- Auto-update handlers properly configured in update.ts
- Preload exposes update API correctly
- Renderer update UI exists
- Update check works and returns appropriate response
- Typecheck passes

---

### 11.0 - Test Auto-Update Check Functionality
**Priority**: Medium
**Dependency**: 10.0

Test that auto-update check functionality works correctly in packaged app.

**Implementation**:
- Test update check in development mode (should return error about not packaged)
- Package app and test update check:
  - Mock or use test GitHub repository
  - Verify update-available event fires
  - Verify update-not-available event fires
  - Verify error handling
- Test download progress:
  - Mock download update
  - Verify download-progress events
  - Verify update-downloaded event
- Test quit-and-install functionality
- Test update UI shows correct version information

**Acceptance Criteria**:
- Update check returns appropriate response in development
- Update check works in packaged app
- Update events fire correctly (available, not available, error)
- Download progress updates correctly
- Quit-and-install works correctly
- Update UI displays correct version info
- Tests for update functionality pass
- Typecheck passes

---

### 12.0 - Create Storage Layer Unit Tests
**Priority**: Medium
**Dependency**: 1.0

Write comprehensive unit tests for the file-based storage service.

**Implementation**:
- Create `src/main/__tests__/storage.test.ts` with tests for:
  - StorageService initialization
  - `read()` method with existing/non-existing files
  - `write()` method with valid/invalid data
  - `exists()` method
  - `delete()` method
  - `ensureDirectory()` method
  - Error handling for file I/O operations
  - JSON serialization/deserialization
- Use test fixtures and mock file system if needed
- Test both success and error scenarios
- Ensure 80%+ code coverage for storage service

**Acceptance Criteria**:
- `storage.test.ts` created with comprehensive tests
- All StorageService methods tested
- Success and error scenarios covered
- Code coverage > 80% for storage service
- All tests pass
- Typecheck passes

---

### 13.0 - Create IPC Handler Tests
**Priority**: Medium
**Dependency**: 2.0

Write unit tests for storage-related IPC handlers.

**Implementation**:
- Create `src/main/__tests__/storage-ipc.test.ts` with tests for:
  - `storage-read` handler
  - `storage-write` handler
  - `storage-exists` handler
  - `storage-delete` handler
  - `storage-migrate` handler
- Mock IPC invoke/calls
- Test proper error handling and validation
- Test data serialization/deserialization through IPC
- Test IPC communication between main and renderer

**Acceptance Criteria**:
- `storage-ipc.test.ts` created with comprehensive tests
- All storage IPC handlers tested
- Error handling and validation tested
- Data serialization through IPC tested
- All tests pass
- Typecheck passes

---

### 14.0 - Integration Test for Storage Migration
**Priority**: Medium
**Dependency**: 5.0

Write integration tests for the localStorage to file-based storage migration.

**Implementation**:
- Create `src/renderer/__tests__/storageMigration.test.ts` with tests for:
  - Migration check detects localStorage data
  - Migration check returns false when no data exists
  - Migration transfers all playlists correctly
  - Migration clears localStorage after success
  - Migration handles errors gracefully
- Mock localStorage and file storage
- Test migration process end-to-end
- Verify data integrity after migration

**Acceptance Criteria**:
- `storageMigration.test.ts` created with comprehensive tests
- Migration detection tested
- Data transfer tested
- LocalStorage cleanup tested
- Error handling tested
- Data integrity verified
- All tests pass
- Typecheck passes

---

### 15.0 - End-to-End Integration Test
**Priority**: Low
**Dependency**: 3.0, 4.0, 5.0

Write end-to-end tests for the complete storage system (file-based storage, migration, packaging).

**Implementation**:
- Create `test/e2e/storage.e2e.test.ts` with tests for:
  - App initializes with empty file storage
  - App creates playlists and saves to file
  - App reloads and restores playlists from file
  - App migrates localStorage data to file storage
  - Queue persists correctly (if enabled)
  - Storage operations work in packaged app
- Use Playwright or Electron's test framework
- Test with mock file system in development
- Document manual testing for packaged app

**Acceptance Criteria**:
- E2E test file created with comprehensive scenarios
- App initialization tested
- Playlist save/restore tested
- Migration flow tested
- Queue persistence tested
- Tests run in development environment
- All tests pass
- Typecheck passes

---

### 16.0 - Update Documentation
**Priority**: Medium
**Dependency**: All stories

Update project documentation to reflect file-based storage and packaging changes.

**Implementation**:
- Update `README.md`:
  - Document file-based storage system
  - Document migration process for existing users
  - Document packaging instructions for Mac and Windows
  - Document auto-update functionality
  - Update installation and usage instructions
- Create `docs/PACKAGING.md`:
  - Detailed packaging guide for Mac and Windows
  - Code signing requirements (if any)
  - GitHub releases setup for auto-update
  - Troubleshooting common packaging issues
- Update `PATLABOR_SPEC.md`:
  - Update tech stack section to reflect file-based storage
  - Update architecture diagram
  - Add notes about persistence layer

**Acceptance Criteria**:
- README.md updated with storage and packaging info
- `docs/PACKAGING.md` created with detailed packaging guide
- PATLABOR_SPEC.md updated to reflect changes
- All documentation is accurate and clear
- Documentation includes examples where helpful
- Typecheck passes

---

### 17.0 - Final Integration and Testing
**Priority**: High
**Dependency**: All previous stories

Perform final integration testing and ensure all components work together correctly.

**Implementation**:
- Run all unit tests and verify they pass
- Run all integration tests and verify they pass
- Build and test Mac .dmg package
- Verify file-based storage works in packaged app
- Verify auto-update check works in packaged app
- Test migration flow with existing localStorage data
- Perform manual testing of all app features in packaged app
- Verify app icon, name, and metadata are correct
- Check for any console errors or warnings

**Acceptance Criteria**:
- All unit tests pass
- All integration tests pass
- Mac .dmg builds successfully
- Packaged app works correctly
- File-based storage operations work in packaged app
- Auto-update check works in packaged app
- Migration flow works correctly
- No console errors or warnings
- All acceptance criteria met
- Typecheck passes

---

## Story Order Summary

1. 1.0 - Setup File-Based Storage Service
2. 2.0 - Create IPC Handlers for Storage Operations
3. 6.0 - Update electron-builder Configuration for Mac
4. 7.0 - Update electron-builder Configuration for Windows
5. 3.0 - Migrate Playlist Store to File-Based Storage
6. 4.0 - Add Queue Persistence Support
7. 5.0 - Create Data Migration Utility
8. 8.0 - Test Mac Packaging (DMG Build)
9. 9.0 - Verify Windows Packaging Configuration (EXE Build)
10. 10.0 - Verify electron-updater Configuration
11. 11.0 - Test Auto-Update Check Functionality
12. 12.0 - Create Storage Layer Unit Tests
13. 13.0 - Create IPC Handler Tests
14. 14.0 - Integration Test for Storage Migration
15. 15.0 - End-to-End Integration Test
16. 16.0 - Update Documentation
17. 17.0 - Final Integration and Testing

## Notes

- All stories include "Typecheck passes" as the last acceptance criterion
- All stories include test criteria
- Storage migration should be optional - users can continue with empty storage
- Windows packaging verification requires Windows environment
- Auto-update requires proper GitHub releases setup
- File-based storage uses userData directory: `~/Library/Application Support/AIPC KTV` on Mac
