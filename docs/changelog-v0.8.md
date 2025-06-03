# Changelog - md-to-pdf v0.8.x Series

* For the v0.7.x changelog, see [changelog-v0.7.md](changelog-v0.7.md).
* For the development track *before* v0.7.0, see [roadmap.md](roadmap.md).

---

## v0.8.7 - Comprehensive Documentation Overhaul

**Date:** 2025-06-03

This version marks a significant overhaul of the public-facing documentation to reflect the new unified CLI and plugin management capabilities.

### Changed

* **`README.md` Overhaul:** The main `README.md` was significantly restructured and rewritten to prominently feature new CLI-based plugin and collection management, streamline quick-start examples, and highlight the tool's versatility. The example gallery was moved to the top for immediate visual impact.
* **`docs/cheat-sheet.md` Update:** Refined to include all new CLI commands for plugin and collection management (`add`, `list`, `enable`, `disable`, `remove`, `update`), providing concise syntax and common use cases.
* **`docs/plugin-development.md` Update:** Expanded into a comprehensive reference for plugin developers and advanced users. It now includes detailed explanations of CLI-based plugin/collection management, in-depth configuration precedence, archetyping, and updated examples for plugin creation. Information on XDG root for collections (`~/.local/share/md-to-pdf/collections/`) was added. Backtick links to `dream-board` and `changelog` were included.
* **`dev/plugins/README.md` (Bundled Plugins Overview) Refinement:** Updated to serve as a template for documenting external plugin collections, detailing how to manage and use bundled plugins via CLI commands.
* **`dev/community_plugins/plugins-from-brege/README.md` Update:** Revised to align with the new documentation standard for external plugin repositories, showing how to add the collection and manage its plugins using CLI commands.
* **`docs/batch-processing-guide.md` Update:** Refined to remove obsolete `hugo-export-each` command references and reinforce the recommendation for external scripting.
* **Documentation Tone:** A consistent, direct, and honest language was adopted across all user-facing documentation, avoiding "salesman-like" or overly informal vernacular.
* **Obsolete Command "Ghosting":** All explicit references to the standalone `md-to-pdf-cm` binary and the deprecated `md-to-pdf collection archetype` command were removed from public documentation.
* **TODO Notes:** Specific `TODO` notes for future features like singleton purging were added to relevant documents.

---

## v0.8.6 - Enhanced Local Plugin/Collection Management

**Date:** 2025-06-02

This version significantly improves the management of locally sourced plugin collections and standalone local plugins, making it easier for users to integrate and update their own work with `md-to-pdf`.

### Added

* **`md-to-pdf collection list --short`**:
    * Added a `--short` flag to the `md-to-pdf collection list` command.
    * This provides a condensed, one-line-per-collection summary, displaying the collection name, source type (Git/Local Path/Managed Directory), and source origin.
* **New Command: `md-to-pdf plugin add <path_to_plugin_dir> [--name <invoke_name>]`**:
    * Allows users to easily copy a single, standalone plugin directory from their filesystem into `CollectionsManager`'s managed area (`COLL_ROOT/_user_added_plugins/<plugin_id>/`).
    * The plugin is automatically enabled with the specified or derived `invoke_name`.
    * A `.collection-metadata.yaml` file is created for the added singleton plugin, recording its original local path as the `source` and `type: singleton`.

### Changed

* **`md-to-pdf collection update [<collection_name>]` for Local Sources:**
    * Enhanced the `md-to-pdf collection update [<collection_name>]` command and the underlying `CollectionsManager.updateCollection` method to support re-synchronizing collections that were originally added from a local filesystem path. The system now re-copies content from the original source path recorded in the collection's metadata.
    * The `updated_on` timestamp in the collection's metadata is updated upon successful re-sync.

* **`md-to-pdf collection update` (Update All) Behavior:**
    * The `CollectionsManager.updateAllCollections` method (triggered by `md-to-pdf collection update` without arguments) now correctly processes both Git-based and locally sourced collections for updates.
    * It also iterates into the `_user_added_plugins/` directory and attempts to update each singleton plugin from its original local source path, ensuring user-added standalone plugins are kept in sync.
    * The command previously would explicitly skip the `_user_added_plugins` container; this behavior is refined to process its contents.
* **`md-to-pdf collection list` Output Refinement:**
    * The output for the `_user_added_plugins` directory when using `md-to-pdf collection list` (normal and `--short`) is now more informative, clearly identifying it as a "Managed Directory" containing user-added singleton plugins.
* Added `fs-extra` as a dependency to `CollectionsManager` to facilitate robust file operations for local collection updates.

### Fixed

* **CM Test Suite Stability (`dev/test/cm-tests/`):**
    * Resolved a persistent issue where `baseTestRunDir` was not being correctly passed to `createTestCollRoot` in individual CM test functions, causing test initialization failures. This involved updating all 7 CM test suite files (`add.test.js`, `archetype.test.js`, `disable.test.js`, `enable.test.js`, `list.test.js`, `remove.test.js`, `update.test.js`) to correctly accept and propagate the `baseTestRunDir` parameter.
    * Corrected an assertion error in the `CM: Archetype Plugin - Target Directory Exists` test by removing `chalk.underline()` from the error message string in `dev/src/collections-manager/commands/archetype.js`, making the test assertion robust against TTY-dependent styling.
    * Fixed a test counter issue in `dev/test/cm-tests/run-cm-tests.js` that incorrectly incremented the "attempted" test count when a CM suite had a fatal error.


## v0.8.5 - Unified Plugin Creation, Archetyping, and Examples

**Date:** 2025-06-01

### Added

* **Unified `md-to-pdf plugin create <name>` Command:**
    * Now the sole command for generating new plugins, using `CollectionsManager.archetypePlugin` as its engine.
    * **Default Mode (No `--from`):** Creates a new plugin by archetyping from a new bundled template located at `plugins/template-basic/`. The default output directory is the current working directory (e.g., `./<new-plugin-name>`).
    * **`--from <source_identifier>` Option:** Allows archetyping from an existing plugin. `<source_identifier>` can be a CM-managed plugin ID (`collection_name/plugin_id`) or a direct filesystem path to a plugin directory. The default output directory for this mode is handled by the underlying archetype logic (typically `my-plugins/` relative to `COLL_ROOT`).
    * Includes `isValidPluginName` validation for the new plugin name.
* **Bundled `template-basic` Plugin (`plugins/template-basic/`):**
    * A minimal, functional plugin serving as the default template for `plugin create`.
    * Includes `template-basic.config.yaml`, `index.js`, `template-basic.css`, `README.md` (with `cli_help`), and `template-basic-example.md`.
    * The `template-basic-example.md` is pre-configured with front matter (`md_to_pdf_plugin: "./template-basic.config.yaml"`) to be self-activating when run from its directory.
* **Self-Activating Example Markdown Files for Bundled Plugins:**
    * Added `<plugin-name>-example.md` files to the following bundled plugins: `default`, `cv`, `cover-letter`, and `recipe`.
    * Each example is configured with front matter (e.g., `md_to_pdf_plugin: "./cv.config.yaml"`) to allow immediate testing of the plugin by running `md-to-pdf <plugin-name>-example.md` from within the plugin's directory.
    * Each example file includes a note explaining its self-activation and the need for general registration for use with other files.

### Changed

* **`CollectionsManager.archetypePlugin` Enhancement:**
    * The internal `archetypePlugin` method in `CollectionsManager` (`src/collections-manager/commands/archetype.js`) has been significantly enhanced to robustly handle direct filesystem paths as source identifiers, in addition to `collection_name/plugin_id` strings. This includes improved config file discovery, `sourcePluginIdForReplacement` derivation, and metadata handling for direct path sources.
    * Corrected string replacement logic within `archetypePlugin` to prevent "double replacement" issues for fields like `css_files` and `handler_script` in the generated config file when the `sourcePluginIdForReplacement` is a substring of the `newArchetypeName`.
* The handler for `md-to-pdf plugin create` (`src/commands/plugin/createCmd.js`) was rewritten to use `CollectionsManager.archetypePlugin` as its core engine and to manage source/target directory logic appropriately.

### Deprecated

* **`md-to-pdf collection archetype` Command:**
    * This command is now deprecated in favor of `md-to-pdf plugin create <newName> --from <sourceIdentifier>`.
    * A new command definition (`src/commands/collection/archetypeCmd.js`) issues a deprecation warning but allows the command to continue functioning for this release cycle by calling the underlying `archetypePlugin`.
    * The main `collection` command group (`src/commands/collectionCmd.js`) registers this deprecated command and includes an epilogue note.

### Testing

* Overhauled CLI tests in `test/test-cases/plugin-create-command.test-cases.js` to comprehensively cover the unified `plugin create` functionality in both modes (template and `--from`), including various options (`--dir`, `--force`), error handling, and default directory behaviors.
* Added a CLI test to verify the deprecation warning and continued functionality of `md-to-pdf collection archetype`.
* Updated `test/cm-tests/archetype.test.js` assertions for description strings and error messages to align with `archetypePlugin` enhancements.

### Removed

* The old `src/plugin_scaffolder.js` is now fully superseded by the `archetypePlugin` logic within `CollectionsManager` and the `plugin create` command. The `isValidPluginName` utility was moved to `cm-utils.js`.


## v0.8.4 (Conceptual - Enhanced Plugin and Collection Listing)

**Date:** 2025-05-31

### Added

* **Enhanced `md-to-pdf plugin list` Command:**
    * The command now integrates more deeply with `CollectionsManager` data via an enhanced `PluginRegistryBuilder` for a unified backend.
    * New flag: `--short` provides a condensed, one-line summary for each plugin, showing status, name/invoke key, and CM origin if applicable, with aligned columns.
    * New status flags to view plugins (primarily CM-managed unless stated otherwise):
        * `--available`: Lists all plugins within CM-managed collections (`COLL_ROOT`) that can be used or enabled (includes already CM-enabled plugins and those only available in `COLL_ROOT`).
        * `--enabled`: Lists all actively enabled plugins (both traditionally registered and CM-enabled).
        * `--disabled`: Lists plugins within CM-managed collections that are available but *not* currently enabled in `enabled.yaml`.
    * Optional `[<collection_name_filter>]` argument can be used with status flags and `--short` to filter CM-managed plugins by their collection name.
    * Refined console output formatting for all `plugin list` views for improved readability and clarity, with distinct colors (e.g., blueBright for "Enabled (CM)", cyan for "Registered", gray for "Available (CM)") and bolding for statuses and identifiers.
    * Added an epilogue to the `plugin list` help text to guide users to `md-to-pdf collection list` for viewing collection names and sources.

* **Enhanced `md-to-pdf collection list` Command:**
    * Output now includes the `source` (Git URL or local path) and `added_on` / `updated_on` dates for each downloaded collection, providing more comprehensive information.

### Changed

* `PluginRegistryBuilder.getAllPluginDetails()` now accepts a `CollectionsManager` instance. When provided, it integrates detailed information about all CM-managed plugins (including those available but not enabled) into its comprehensive list, providing a unified data source for listing.
* The handler for `md-to-pdf plugin list` in `src/commands/plugin/listCmd.js` was rewritten to use the enhanced `PluginRegistryBuilder` as its single source of plugin data and then applies filtering and specific formatting based on the provided CLI flags.
* `CollectionsManager.listCollections('downloaded')` method in `src/collections-manager/commands/list.js` now returns an array of objects (including `name`, `source`, `added_on`, `updated_on`) instead of just names, facilitating the enhanced `md-to-pdf collection list` output.
* The handler for `md-to-pdf collection list` in `src/commands/collection/listCmd.js` was updated to consume and display this richer information.

### Fixed

* Corrected an issue in `src/collections-manager/commands/updateAll.js` where it was not correctly handling the new object-based return type from `listCollections('downloaded')`, causing `TypeError` errors during `md-to-pdf collection update` (when run for all collections).
* Resolved a `TypeError: chalk.stripColor is not a function` in `md-to-pdf plugin list --short` by correctly using `strip-ansi` (an existing dependency) to remove ANSI codes for column width calculation.
* Ensured tests in `test/cm-tests/list.test.js` and `src/collections-manager/test/list.test.js` were updated to align with the new object-based return type of `CollectionsManager.listCollections('downloaded')`.


## v0.8.3 (Conceptual - CLI Integration Phase 1: Collection & Core Plugin State Commands + Test Integration)

**Date:** 2025-05-31

### Added

* **Unified CLI - `collection` Subcommands:**
    * Integrated `CollectionsManager` functionalities into `md-to-pdf`.
    * New `md-to-pdf collection <subcommand>` group added:
        * `md-to-pdf collection add <url_or_path> [--name <collection_name>]`: Adds a new plugin collection.
        * `md-to-pdf collection list`: Lists all downloaded plugin collection names.
        * `md-to-pdf collection remove <collection_name> [--force]`: Removes a downloaded collection, with `--force` to disable its plugins first.
        * `md-to-pdf collection update [<collection_name>]`: Updates Git-based collections. If no name, updates all. Includes enhanced support for re-syncing locally-sourced collections from their original path.
* **Unified CLI - `plugin enable/disable` Subcommands:**
    * New subcommands added to the existing `md-to-pdf plugin` group:
        * `md-to-pdf plugin enable <collection_name/plugin_id | collection_name --all> [--name <invoke_name>] [--prefix <prefix_string>] [--no-prefix]`: Enables plugin(s) from a managed collection, updating `enabled.yaml`.
        * `md-to-pdf plugin disable <invoke_name>`: Disables an active plugin, updating `enabled.yaml`.
* The `CollectionsManager` instance is now created by the main `md-to-pdf` CLI and made available to these new command handlers via middleware.
* These integrated commands leverage the existing logic and console output behavior of the `CollectionsManager` module.

### Changed

* The main `cli.js` and its command modules in `src/commands/` were updated to support the new `collection` command group and the new `plugin` subcommands (`enable`, `disable`).
* Refined the `success` status reporting for `CollectionsManager.updateAllCollections` to return `false` if any individual collection update fails or is aborted (e.g., due to local changes), ensuring consistency in test assertions.

### Testing

* **Hybrid Testing Strategy for CollectionsManager:**
    * The original `CollectionsManager` test suites (which test methods directly) have been successfully integrated into the main project's test runner (`test/run-tests.js`) under a new category: `cm-module`.
    * These tests are located in `test/cm-tests/` and use adapted helpers (`test/cm-tests/cm-test-helpers.js`) to ensure proper isolation and environment setup (e.g., `MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE`, Git configuration).
    * This approach allows for fast and precise testing of the `CollectionsManager`'s core logic.
    * A `README.md` has been added to `test/cm-tests/` explaining this hybrid strategy and the rationale.
* **CLI-Based Integration Tests (Future Work):**
    * The creation of a comprehensive suite of CLI-based integration tests (using `runCliCommand` for every CM scenario) for the new `md-to-pdf collection ...` and `md-to-pdf plugin enable/disable` commands has been deferred.
    * A select few representative CLI-based tests will be added in a future version (e.g., v0.9.x) to verify end-to-end functionality, rather than exhaustively replicating all `CollectionsManager` module tests at the CLI level. This decision was made due to the complexity and potential brittleness of asserting against detailed console output from multiple software layers.


## v0.8.2 (Conceptual - Main CLI Refactor)

**Date:** 2025-05-30

### Changed

* **Main CLI Refactor (`cli.js`):**
    * The main `md-to-pdf/cli.js` file has been refactored to improve modularity and maintainability, similar to the structure of the `CollectionsManager` module.
    * A new directory `src/commands/` has been created.
    * The yargs command definitions and handler initializations for each top-level command (`config`, `plugin`, `convert`, `generate`, and the default `$0` command) have been moved into separate modules within `src/commands/`.
        * `plugin` subcommands (`list`, `create`, `help`) are further modularized into `src/commands/plugin/`.
    * `cli.js` now imports these command modules and registers them with yargs, acting as an orchestrator.
    * Core execution logic functions (e.g., `executeConversion`, `executeGeneration`, `commonCommandHandler`, `openPdf`) remain in `cli.js` to be accessible by the command handlers.
    * This internal structural change does not alter the CLI's external behavior or functionality. All commands and options remain the same for the user.


## v0.8.1 (Conceptual - Integrate CollectionsManager Manifest)

**Date:** May 30, 2025

### Added
* **CollectionsManager Integration**: `PluginRegistryBuilder.js` now reads the `enabled.yaml` manifest file generated by `md-to-pdf-cm`.
    * Plugins enabled via `md-to-pdf-cm enable ...` are automatically discovered and made available to `md-to-pdf`.
    * This streamlines the workflow, as users no longer need to manually register CM-enabled plugins in a main `config.yaml` file.

### Changed
* **Plugin Registration Precedence**: The order of precedence for plugin registration sources has been updated to include plugins from the CollectionsManager manifest. The new order (highest to lowest) is:
    1.  Project `config.yaml` (`plugins:` section)
    2.  XDG `config.yaml` (`plugins:` section)
    3.  CollectionsManager `enabled.yaml` manifest
    4.  Bundled `config.example.yaml` (`plugins:` section - factory defaults)
* The `md-to-pdf plugin list` command now correctly displays plugins loaded from the CollectionsManager manifest, respecting this precedence.

### Note on Testing
* Direct unit tests for the `enabled.yaml` integration within the main `md-to-pdf` test suite (Task 3.4 from `docs-devel/proposal-v0.8.1.md`) have been deferred.

* **Reason for Deferral**

  Implementing isolated and reliable test cases for this specific integration presents challenges within the current main project's testing framework, particularly concerning the mocking or management of the `enabled.yaml` file and its XDG-based location from within `test/run-tests.js`. The functionality has been manually verified. Future enhancements to the test environment will aim to address this for more comprehensive automated testing of this cross-module interaction.


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

