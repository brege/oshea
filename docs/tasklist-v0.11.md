#### Logger

- **Core Architecture**
  - [x] Implemented pure routing layer pattern in [`src/utils/logger.js`](../src/utils/logger.js)
  - [x] Created specialized formatter system in `src/utils/formatters/`
  - [x] Added context suppression for clean user interfaces
  - [x] Established canonical usage patterns (template literals + metadata)
  - [x] Eliminated 29→0 hardcoded logger prefixes (square brackets removed)
  - [x] Replaced bracket patterns with structured context

- **User Interface Cleanup**
  - [x] Fixed table formatter regression in plugin/collection list commands
  - [x] Eliminated debug context noise from user-facing CLI output
  - [x] Restored proper template literal patterns (values in message, not metadata)
  - [x] Removed manual stdout.write() hacks from validators

- **Dynamic Injection**
  - [ ] Integrate caller detection from prototype
  - [ ] Add error pattern recognition (filesystem, plugin, config categories)
  - [ ] Add stack trace injection on demand
  - [ ] Add structured context display formatting
  - [ ] Add `logger.for(context)` (top of file) convenience method for pre-configured loggers

- **Test**
  - [ ] Create test cases for each injection feature
  - [ ] Verify caller detection works across different call patterns
  - [ ] Test error categorization accuracy

- **Layer-Specific Logging**
  - [x] **`src/cli/`**: Preserved user interface strings, converted operational noise to debug
  - [x] **`src/core,collections,plugins/`**: Converted internal operations to debug, preserved user transparency

  - [x] Created canonical reference: [`src/utils/index.md`](../src/utils/index.md)
  - [x] Consolidated 1,645 lines across 10 files into single authoritative spec

#### Error Management

- **Old Implementation**
  - [x] Remove `src/utils/errors/` directory entirely
  - [x] Clean up any imports/references to ErrorManager
  - [x] Update paths registry (`npm run paths`)

- **Prep for new implementation**
  - [x] Maintained structured debug logging as operational checkpoints
  - [x] Preserved rich context metadata for future error correlation
  - [x] Established patterns for debug instrumentation without UI pollution

#### Testing

**See [`next-generation-testing.md`](v0.11/next-generation-testing.md).**

- **Plugin Testing Modernization**
  - [x] Reduced to true integration tests
  - [x] Eliminated brittle logging assertions that coupled tests to implementation details
  - [x] Modernized test factories to focus on behavior, not logging output
  - [x] Merge [`next-generation-testing.md`](v0.11/next-generation-testing.md) into `part-2`
    (`docs/v0.11/` now one document)

Most “next-gen” ideas are speculative; move practical content, then create a “future enhancements” section at the end of part-2 for the rest.

- **Structure**
  - [ ] Merge `test/config/metadata-level-{3,4}.yaml` into `test/runners/end-to-end/**/*.yaml` (?)
  - [ ] Use [`paths/dep-tree.js`](../paths/dep-tree.js) for smarter testing (?)
    ```bash
    git diff --name-only | deps-to-tests | npm test --grep 
    ```
- **Workflow: app-side Integration**
  - [ ] Ensure each of the four walkthroughs has a matching workflow file in 
    `test/runners/end-to-end/workflows/`.
    1. [`archetyping-a-plugin.md`](walkthroughs/archetyping-a-plugin.md) 
        \- about creating plugin from archetype with --from option
    2. [`full-lifecycle.md`](walkthroughs/full-lifecycle.md) [ `workflows.manifest.yaml` ] 
        \- about complete plugin add-do-done workflow
    3. [`generate-mobile-study-cards.md`](walkthroughs/generate-mobile-study-cards.md)
        \- about creating notecard plugin 
    4. [`updating-plugins.md`](walkthroughs/updating-plugins.md)
        \- about updating collections from git
  - [ ] **App-side Integration.** Strongly consider `oshea workflow` (or `oshea run`) mode.

#### Linting

- **Linter System Modernization & Renaming**
  - [x] Verify that logger anti-patterns are caught
  - [x] Renamed Code Linters (*strip-trailing-whitespace.js* -> [`no-trailing-whitespace.js`](../scripts/linting/code/no-trailing-whitespace.js), etc.)
  - [x] Renamed Documentation Linters (*find-litter.js* -> [`janitor.js`](../scripts/linting/docs/janitor.js), etc.)
  - [x] Updated all aliases in `linting-config.yaml` to use new linter names
  - [x] Updated all references in scripts, paths, documentation
  - [x] Integrated litter-list.txt rules for pattern detection
  - **Config Schema Validation**
    * [ ] Check for missing required fields (`label`, `command`)
    * [ ] Detect invalid paths (e.g. `!fs.existsSync`)
    * [ ] Catch duplicate or ambiguous labels
    * [ ] Warn on unused lints/unreachable steps
  - [x] Updated path registry after renaming linters
  - [x] Updated test files that reference old linter names
  - [x] Updated [`scripts/linting/index.md`](../scripts/linting/index.md) with new linter names
  - [ ] Move linting to the project root (instead of under `scripts/`).
    
  Linting is a core part of the project now, as it could be hooked into plugin sanitization.

#### Scripts

- **Obsolescence**
  - [x] Remove *scripts/linting/code/logger-pattern-hunter.js*
  - [x] Clean up any references to the hunter script
  - [ ] Remove `scripts/batch` \
    Legacy batch scripts are now covered by declarative workflows (YAML), but where does `scripts/batch/make-screenshots.sh` fit in?

- **Reorganization**
  - [x] Built [`scripts/shared/logger-surfacer.js`](../scripts/shared/logger-surfacer.js)
  - [x] Developed taxonomy for operational vs user-facing logging
  - [ ] Move `scripts/shared/file-helpers.js -> src/utils/file-helpers.js` (?)
    - Is this necessary, since it's app-facing?
  - [ ] Move `scripts/shared/path-finder.js -> paths/path-finder.js`
    - **Yes:** only because it is core to `linters/`
  - [ ] Implement reverse lookup in *paths/path-finder.js* as well (get paths from key).

