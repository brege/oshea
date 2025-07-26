### Non-Logger-Centric Checklist

This checklist includes broader project tasks like refactoring, cleanup, and process modernization that were part of the same effort but are not direct features of the logger.

#### To-Do

- **CI/CD Pipeline Updates**
  - [x] Update GitHub Actions workflow if it references specific linter files
  - [x] Verify npm scripts still work after renames
  - [x] Check that smoke tests pass with new linter names

#### Completed

- **Clean Up Error Manager Implementation**
  - [x] Remove `src/utils/errors/` directory entirely
  - [x] Clean up any imports/references to ErrorManager
  - [x] Update paths registry (`npm run paths`)
- **Plugin Testing Modernization**
  - [x] Reduced to true integration tests
  - [x] Eliminated brittle logging assertions that coupled tests to implementation details
  - [x] Modernized test factories to focus on behavior, not logging output
  <!-- lint-disable postman -->
- **Linter System Modernization & Renaming**
  - [x] Renamed Code Linters (`strip-trailing-whitespace.js` -> `no-trailing-whitespace.js`, etc.)
  - [x] Renamed Documentation Linters (`find-litter.js` -> `janitor.js`, etc.)
  - [x] Updated all aliases in `linting-config.yaml` to use new linter names
  - [x] Updated all references in scripts, paths, documentation
  - [x] Integrated litter-list.txt rules for pattern detection
- **Remove Obsolete Tools**
  - [x] Remove `scripts/linting/code/logger-pattern-hunter.js`
  - [x] Clean up any references to the hunter script
- **Tools & Process Innovations**
  - [x] Built `scripts/logger-diff-extract.js` & enhanced `scripts/logger-surfacer.js`
  - [x] Developed taxonomy for operational vs user-facing logging
<!-- lint-enable postman -->
- **Path, Testing, and Documentation Updates**
  - [x] Updated path registry after renaming linters
  - [x] Updated test files that reference old linter names
  - [x] Updated [`scripts/linting/index.md`](../../scripts/linting/index.md) with new linter names

