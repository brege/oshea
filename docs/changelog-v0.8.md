# Changelog - md-to-pdf v0.8.x Series

For the v0.7.x changelog, see [changelog-v0.7.md](changelog-v0.7.md).

For the development track *before* v0.7.0, see [roadmap.md](roadmap.md).

## v0.8.0 (Conceptual - Main Test Suite Refactor)

**Date:** 2025-05-30

### Changed

* **Test Suite Refactoring (`test/run-tests.js`):**
    * Refactored the main test orchestrator (`test/run-tests.js`) to improve modularity and maintainability.
    * Moved common test utility functions into a new `test/test-helpers.js` file.
    * Centralized shared constants used by tests into a new `test/test-constants.js` file.
    * Organized individual test case definitions into categorized files within a new `test/test-cases/` directory. Categories include `config-command`, `convert-command`, `generate-command`, `plugin-create-command`, and `advanced-features`.
    * The main `test/run-tests.js` now imports test cases from these categorized files and acts as a lean orchestrator.
* **Test Runner CLI Enhancements:**
    * The test runner (`test/run-tests.js`) now accepts command-line arguments to selectively run specific test categories (e.g., `node test/run-tests.js config convert`).
    * Added a help interface to the test runner (e.g., `node test/run-tests.js help`) that lists available test categories and usage instructions for selective execution.
* All 26 existing tests were successfully migrated to the new structure and continue to pass.

