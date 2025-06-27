## Current Test Structure
> **Historical Note:** This document outlines an early proposal for refactoring the project's test suite. This plan was ultimately **abandoned**. It was determined that the existing tests were too brittle to be salvaged, and a more systematic, ground-up rewrite was a better long-term investment.
>
> For the canonical information on the current testing strategy, please refer to the 
**[Test README](../../test/README.md)** and the 
**[Test Generation Priority Order](../../test/docs/test-generation-priority-order.md)**.

```
test/
├── cm-tests/
│   ├── add.test.js
│   ├── archetype.test.js
│   ├── cm-test-helpers.js        // Helper, but core to CM tests running
│   ├── disable.test.js
│   ├── enable.test.js
│   ├── list.test.js
│   ├── remove.test.js
│   ├── run-cm-tests.js           // CM Module Test Runner
│   └── update.test.js
├── run-tests.js                  // Main CLI Test Runner
├── test-cases/
│   ├── advanced-features.test-cases.js
│   ├── config-command.test-cases.js
│   ├── convert-command.test-cases.js
│   ├── generate-command.test-cases.js
│   └── plugin-create-command.test-cases.js
├── assets/ [...]                 // Collapsed
├── config.test.yaml              // Collapsed (Test Configuration)
├── custom_plugins/ [...]         // Collapsed
├── README.md                     // Collapsed (Documentation)
├── test-constants.js             // Collapsed (Test Utilities)
└── test-helpers.js               // Collapsed (Test Utilities)
```

This allows us to run tests like this:

```
# all CLI and CM module tests
npm test

# config command
npm test -- config-command

# plugin create command
npm test -- plugin-create-command

# CollectionManager
npm test -- cm-module

# combination of CLI test groups
npm test -- convert-command advanced-features
```

**Limitations** \
1. You cannot run a specific subset of the CM module tests.
2. CLI test categories are *broad*, based on entire test case files.


## Proposed Test Structure

```
test/
├── cm-tests/
│   ├── add.test.js               // Potentially updated or with new addSingleton.test.js
│   ├── archetype.test.js
│   ├── cm-test-helpers.js
│   ├── disable.test.js
│   ├── enable.test.js
│   ├── list.test.js              // Potentially updated
│   ├── remove.test.js
│   ├── run-cm-tests.js           // Internally refactored for granular execution
│   └── update.test.js            // Potentially updated
├── run-tests.js                  // Internally refactored for granular execution
├── test-cases/
│   ├── advanced-features.test-cases.js
│   ├── collection-add-cli.test-cases.js
│   ├── collection-list-cli.test-cases.js
│   ├── collection-remove-cli.test-cases.js
│   ├── collection-update-cli.test-cases.js
│   ├── config-command.test-cases.js
│   ├── convert-command.test-cases.js
│   ├── generate-command.test-cases.js
│   ├── plugin-add-cli.test-cases.js
│   ├── plugin-create-command.test-cases.js
│   ├── plugin-disable-cli.test-cases.js
│   ├── plugin-enable-cli.test-cases.js
│   └── plugin-list-cli.test-cases.js
├── assets/ [...]                 // Collapsed
├── config.test.yaml              // Collapsed
├── custom_plugins/ [...]         // Collapsed
├── README.md                     // Collapsed
├── test-constants.js             // Collapsed
└── test-helpers.js               // Collapsed
```

This allows us to run tests like this:

```
# all CLI and CM module tests
npm test

# run only CLI tests for the collection add command
npm test -- collection-add-cli

# run onlt the cli tests for plugin enable command
npm test -- plugin-enable-cli

# run a composit group of all cli tests related to "collection" commands
npm test -- collection-all-cli

# run only the add tests from the CM module
npm test -- cm-add

# run a specific CLI test group AND a specific CM module group
npm test -- plugin-add-cli cm-add-singleton

# all CM module tests
npm test -- cm-module
```


## Breaking down the current test structure, fully expanded

```
test/
├── cm-tests/
│   ├── add.test.js
│   │   // 1. CM: Add Collection from Git URL (with metadata verification)
│   │   // 2. CM: Add Collection from Local Path (with metadata verification)
│   ├── archetype.test.js
│   │   // 1. CM: Archetype Plugin - Successful (Default Target: my-plugins/) - checks renames, content, new example MD, README note
│   │   // 2. CM: Archetype Plugin - Successful (Custom Target Directory) - checks non-conventional CSS/handler, content
│   │   // 3. CM: Archetype Plugin - Source Not Found (non-existent collection, non-existent plugin in existing collection, direct path not found)
│   │   // 4. CM: Archetype Plugin - Target Directory Exists (should reject without --force)
│   ├── cm-test-helpers.js        // (Helper file, no direct tests)
│   ├── disable.test.js
│   │   // 1. CM: Disable Plugin - (fail if no manifest, success, check manifest empty, attempt non-existent)
│   ├── enable.test.js
│   │   // 1. CM: Enable Plugin and Verify Manifest (single plugin, custom invoke name, conflicts, non-existent plugin)
│   │   // 2. CM: Enable All Plugins in Collection (Default & Override Prefixing for GitHub, Generic Git, Local path sources; conflict handling)
│   ├── list.test.js
│   │   // 1. CM: List Collections (type: collections/downloaded) - checks count, names, sources
│   │   // 2. CM: List All Available Plugins (type: all/available) - global & filtered, malformed plugin
│   │   // 3. CM: List Enabled Plugins (type: enabled) - global & filtered
│   │   // 4. CM: List Disabled Plugins (type: disabled) - computed from available - enabled
│   ├── remove.test.js
│   │   // 1. CM: Remove Collection - (reject non-existent, reject with enabled plugins no-force, success with force, success no-force no-enabled-plugins)
│   ├── run-cm-tests.js           // CM Module Test Runner
│   └── update.test.js
│       // Contains testUpdateCollection():
│       // 1. CM: Update non-existent collection
│       // 2. CM: Update local-path collection (successful re-sync, source missing, source not a dir) - [Note: v0.8.6 enhanced this]
│       // 3. CM: Clean Git update (remote has new commits)
│       // 4. CM: Git Update with untracked local changes (should abort)
│       // 5. CM: Git Update with local commits (should abort)
│       // 6. CM: Git Update after remote force push (should abort)
│       // Contains testUpdateAllCollections():
│       // 7. CM: Update All Collections (mix of Git to update, local to re-sync, Git with local changes to abort)
├── run-tests.js                  // Main CLI Test Runner
├── test-cases/
│   ├── advanced-features.test-cases.js
│   │   // 1. CLI FM: Convert document specifying 'cv' plugin in front matter (dynamic test file)
│   │   // 2. CLI FM: CLI --plugin 'recipe' overrides 'cv' plugin in front matter (dynamic test file)
│   │   // 3. CLI FM: Convert document specifying 'cv' plugin in front matter (static asset)
│   │   // 4. CLI FM: CLI --plugin 'recipe' overrides 'cv' in front matter (static asset)
│   │   // 5. CLI Local Config: Convert doc with plugin AND overrides from local <filename>.config.yaml (static assets)
│   ├── config-command.test-cases.js
│   │   // 1. CLI: config - Display global config (using test/config.test.yaml)
│   │   // 2. CLI: config --pure - Display pure global config (using test/config.test.yaml)
│   │   // 3. CLI: config --factory-defaults - Display factory default global config
│   │   // 4. CLI: config --plugin default - Display config for 'default' plugin with inline override
│   │   // 5. CLI: config --plugin default --pure - Display pure config for 'default' with inline override
│   │   // 6. CLI: config --plugin cv --config <path_to_override_cv_test.yaml> - Test project-specific plugin override display
│   ├── convert-command.test-cases.js
│   │   // 1. CLI CV: Convert example CV with explicit filename
│   │   // 2. CLI CV: Convert example CV (default filename)
│   │   // 3. CLI Cover Letter: Convert example cover letter with explicit filename
│   │   // 4. CLI Single Recipe: Convert example recipe
│   │   // 5. CLI Project Config: Convert CV with project-specific config override (A5 format, custom CSS)
│   │   // 6. CLI Custom Plugin: Convert business card example using 'business-card' plugin
│   │   // 7. CLI Math Rendering: Convert example math document
│   │   // 8. CLI Params: Test with base config params & front matter override
│   │   // 9. CLI Params: Test with project config params overriding base, & front matter overriding project
│   ├── generate-command.test-cases.js
│   │   // 1. CLI Recipe Book: Create recipe book from Hugo examples
│   └── plugin-create-command.test-cases.js
│       // (These tests cover the v0.8.5 unified 'plugin create' functionality)
│       // 1. CLI: plugin create (default template, default CWD target)
│       // 2. CLI: plugin create --dir <custom_dir> (default template, custom dir)
│       // 3. CLI: plugin create --from <direct_path_to_cv_plugin> --dir <custom_dir> (archetype from direct path)
│       // 4. CLI: plugin create (error on existing dir, no --force)
│       // 5. CLI: plugin create --force (overwrite existing dir)
│       // 6. CLI: plugin create <invalid!name> (invalid name check)
│       // 7. CLI: plugin create --from <non-existent-source> (error check for --from)
│       // 8. CLI: deprecated 'collection archetype' command (checks warning & basic function)
│       // 9. CLI: plugin create --from <cm_collection/plugin_id> (placeholder test, currently skipped)
├── assets/ [...]
├── config.test.yaml
├── custom_plugins/ [...]
├── README.md
├── test-constants.js
└── test-helpers.js
```     

**Current Test Scenarios**
- CLI: 5+6+9+1+9 = **30 Scenarios**
- CM Module: 2+4+1+2+4+1+2 = **16 Scenarios**
- **Total Backlogged: 46 scenarios**

**Total Test Scenarios: 46**

## Breaking down the proposed test structure, fully expanded

```
test/
├── cm-tests/
│   ├── add.test.js // Or new addSingleton.test.js
│   │   // (Existing tests for addCollection)
│   │   // 1. CM: Add Standalone Plugin (addSingletonPlugin) - successful case: dir structure, metadata, enabled.yaml
│   │   // 2. CM: Add Standalone Plugin - error: source path not found
│   │   // 3. CM: Add Standalone Plugin - error: source not valid plugin
│   │   // 4. CM: Add Standalone Plugin - error: invoke_name conflict
│   │   // 5. CM: Add Standalone Plugin - error: target singleton dir already exists
│   ├── archetype.test.js
│   │   // (Existing tests)
│   ├── cm-test-helpers.js
│   ├── disable.test.js
│   │   // (Existing tests)
│   ├── enable.test.js
│   │   // (Existing tests)
│   ├── list.test.js
│   │   // (Existing tests for listCollections types and listAvailablePlugins)
│   │   // 1. CM: listCollections('downloaded') - correctly lists _user_added_plugins container
│   │   // 2. CM: listAvailablePlugins() - correctly lists plugins within _user_added_plugins/<plugin_id>/
│   │   // 3. CM: listCollections('enabled') - correctly lists enabled singleton plugins with their CM origin
│   ├── remove.test.js
│   │   // (Existing tests)
│   ├── run-cm-tests.js             // Internally refactored for granular suite execution
│   └── update.test.js
│       // (Existing tests for updateCollection and updateAllCollections)
│       // 1. CM Update: updateCollection for a singleton plugin (_user_added_plugins/<plugin_id>) - successful re-sync from original local source
│       // 2. CM Update: updateCollection for a singleton - original source modified
│       // 3. CM Update: updateCollection for a singleton - original source missing
│       // 4. CM Update All: updateAllCollections now processes singleton plugins within _user_added_plugins
│       // 5. CM Update All: updateAllCollections correctly updates other Git-based collections alongside singletons
│       // 6. CM Update All: updateAllCollections correctly updates other locally-sourced collections alongside singletons
├── run-tests.js                  // Internally refactored for granular category execution
├── test-cases/
│   ├── advanced-features.test-cases.js
│   │   // (Existing tests)
│   ├── collection-add-cli.test-cases.js      // New or consolidated from partial-cm-test-screwy
│   │   // 1. CLI: collection add <git_url> [--name]
│   │   // 2. CLI: collection add <local_path> [--name]
│   │   // 3. CLI: collection add - error: target already exists
│   │   // 4. CLI: collection add - error: invalid source
│   ├── collection-list-cli.test-cases.js     // New or consolidated
│   │   // 1. CLI: collection list (no collections)
│   │   // 2. CLI: collection list (with multiple collections, including _user_added_plugins)
│   │   // 3. CLI: collection list --short (verify condensed output and source types)
│   ├── collection-remove-cli.test-cases.js   // New or consolidated
│   │   // 1. CLI: collection remove <name>
│   │   // 2. CLI: collection remove <name> --force (with enabled plugins from it)
│   │   // 3. CLI: collection remove - error: collection not found
│   │   // 4. CLI: collection remove - error: has enabled plugins, no --force
│   ├── collection-update-cli.test-cases.js   // New or consolidated
│   │   // 1. CLI: collection update <git_collection_name> (clean update)
│   │   // 2. CLI: collection update <local_collection_name> (successful re-sync from local source)
│   │   // 3. CLI: collection update <singleton_collection_path_e.g., _user_added_plugins/my-plugin> (successful re-sync)
│   │   // 4. CLI: collection update (all) - verify it attempts git, local, and singletons
│   │   // 5. CLI: collection update <name> - error: not found
│   │   // 6. CLI: collection update <name> - error: local changes abort (for Git collection)
│   ├── config-command.test-cases.js
│   │   // (Existing tests)
│   ├── convert-command.test-cases.js
│   │   // (Existing tests)
│   ├── generate-command.test-cases.js
│   │   // (Existing tests)
│   ├── plugin-add-cli.test-cases.js          // New
│   │   // 1. CLI: plugin add <path_to_plugin_dir> (success, verify output, COLL_ROOT, enabled.yaml)
│   │   // 2. CLI: plugin add <path_to_plugin_dir> --name <custom_invoke_name> (success)
│   │   // 3. CLI: plugin add - error: source path not found
│   │   // 4. CLI: plugin add - error: source not valid plugin
│   │   // 5. CLI: plugin add - error: invoke_name conflict
│   │   // 6. CLI: plugin add - error: target singleton dir already exists in _user_added_plugins
│   ├── plugin-create-command.test-cases.js
│   │   // (Existing tests, may need minor review for consistency with new categories)
│   ├── plugin-disable-cli.test-cases.js      // New
│   │   // 1. CLI: plugin disable <invoke_name> (success, verify enabled.yaml)
│   │   // 2. CLI: plugin disable <invoke_name> - error: not found/not enabled
│   ├── plugin-enable-cli.test-cases.js       // New or consolidated
│   │   // 1. CLI: plugin enable <collection/plugin_id> [--name] (success, verify enabled.yaml)
│   │   // 2. CLI: plugin enable <collection_name> --all [--prefix | --no-prefix] (success, verify enabled.yaml)
│   │   // 3. CLI: plugin enable - error: plugin not available
│   │   // 4. CLI: plugin enable - error: invoke_name conflict
│   └── plugin-list-cli.test-cases.js         // New
│       // 1. CLI: plugin list (default output, should show mix of traditional & CM enabled)
│       // 2. CLI: plugin list --available [<collection_filter>]
│       // 3. CLI: plugin list --enabled [<collection_filter>] (include CM & traditional if applicable)
│       // 4. CLI: plugin list --disabled [<collection_filter>]
│       // 5. CLI: plugin list --short (verify condensed output for various statuses and origins)
│       // 6. CLI: plugin list (with _user_added_plugins and singletons present, verify display)
├── assets/ [...]
├── config.test.yaml
├── custom_plugins/ [...]
├── README.md
├── test-constants.js
└── test-helpers.js
```

**New (Backlogged) Test Scenarios** 
- CM Module: 5+3 = **14 scenarios**
- CLI: 4+3+4+6+6+2+4+6 = **35 scenarios**
- **Total Backlogged: 49 scenarios**

**Total Scenarios by Category**
- CM Module: 16+14 = **30 scenarios**
- CLI: 30+35 = **35 scenarios**

**Total: 95 scenarios**

## Strategy for refactoring Tests from CLI (Integration) Tests to Direct Module (Unit) Tests

### Test Suite Review and Refactoring Strategy (v0.8.7)

**Overall Goal:** Systematically review all existing tests to improve robustness, reduce brittleness (especially for CLI tests sensitive to output changes), and ensure efficient coverage by appropriately assigning tests to either CLI integration or direct module testing layers. Implement the backlog of tests for features v0.8.3-v0.8.6.

**Phase 1: Test Inventory Generation**

1. **Action (Gemini):** Generate a complete, un-truncated, enumerated list of all current test scenarios.
  * Source: `test/test-cases/*.test-cases.js` (CLI integration tests).
  * Source: `test/cm-tests/*.test.js` (CollectionsManager module tests).
  * Output: A flat list or structured document serving as the master checklist. Each item should have a unique identifier or clear description.

**Phase 2: Iterative Test Review and Categorization (Chunk-Based)**

* **Process:** We will iterate through the "Master Test Inventory" file by file, or test scenario by test scenario.
* **For each test scenario:**
  1. **User Presents:** User provides the test scenario's description (and code snippet if necessary) from the inventory.
  2. **Gemini Analyzes & Recommends:** Gemini provides an analysis covering:
    * Primary test focus.
    * Potential brittleness (especially for CLI tests).
    * Overlap with other tests (existing or planned module tests).
    * A clear recommendation:
    * `KEEP as CLI Integration Test` (with suggestions for robust assertions if needed).
    * `PORT to CM Module Test` (if better suited for module-level logic/parameter testing).
    * `REDUNDANT / SIMPLIFY CLI Test` (if logic is well-covered by module tests).
    * `KEEP (CM Module Test)` (if already well-placed).
    * `DEPRECATE / REMOVE` (if obsolete or low value).
  3. **User Decides:** User makes the final decision on the test's fate and updates the master inventory/checklist.

**Phase 3: Test Implementation and Refactoring (Chunk-Based, Post-Review of a Set of Tests)**

* Based on decisions from Phase 2:
  1. **Porting Tests:**
    * Identify CLI tests marked for porting to CM module tests.
    * Create or update corresponding tests in `test/cm-tests/`.
    * Remove or simplify the original CLI test in `test/test-cases/`.
  2. **Refining CLI Tests:**
    * For CLI tests marked as "KEEP" but needing refinement, update assertions to be less brittle (e.g., check for substrings, exit codes, file system effects rather than exact stdout).
  3. **Implementing Backlog (v0.8.7 - Task 3.3):**
    * Implement new CLI integration tests in `test/test-cases/` for features from v0.8.3-v0.8.6.
    * Implement new CM module tests in `test/cm-tests/` for features from v0.8.3-v0.8.6.
    * These new tests will be designed from the outset with the refined testing strategy in mind.
  4. **Action (Gemini):** Provide full file content for new or refactored test files in manageable chunks.

**Phase 4: Test Runner Refinements (v0.8.7 - Tasks 3.1, 3.2)**

* **Action (Gemini & User):**
  * Refactor `test/run-tests.js` to support granular CLI test categories.
  * Refactor `test/cm-tests/run-cm-tests.js` to support granular CM module sub-suite execution.
  * This can be done concurrently or after some of the test review, as it impacts how tests are invoked.

**Phase 5: Documentation (v0.8.7 - Task 3.4)**

* **Action (Gemini & User):** Update `test/README.md` or create a new `TESTING_GUIDE.md` to reflect the new organization, test categories, and how to run tests granularly.

**General Workflow Per Chunk/Session:**
1.  Confirm focus for the session (e.g., "Reviewing tests from `advanced-features.test-cases.js`", "Implementing ported tests for `CM addCollection`").
2.  User provides necessary context or current file state if modifications are being made.
3.  Gemini provides analysis, recommendations, or new/refactored code.
4.  User reviews, integrates, and tests.
5.  Repeat.


## Phase 1: Proposed Test Checklist

### Master Inventory

# Master Test Inventory (Current State)

## I. CLI Integration Tests (`test/test-cases/`)

### A. `test/test-cases/advanced-features.test-cases.js`
1. **Test Description:** Front Matter: Convert document specifying 'cv' plugin in front matter
  * _Scenario:_ Converts a dynamically created Markdown file with `md_to_pdf_plugin: "cv"` in its front matter. Checks for PDF output and stdout confirmation.
2. **Test Description:** Front Matter: CLI --plugin 'recipe' overrides 'cv' plugin in front matter
  * _Scenario:_ Converts a dynamically created Markdown file (with `md_to_pdf_plugin: "cv"`) using `--plugin recipe` via CLI. Checks for PDF output and stdout confirmation of override and plugin usage.
3. **Test Description:** Front Matter: Convert document specifying 'cv' plugin in front matter (using static asset)
  * _Scenario:_ Converts `test/assets/front_matter_tests/fm_specifies_cv.md` (which specifies `cv` plugin). Checks for PDF output and stdout confirmation.
4. **Test Description:** Front Matter: CLI --plugin 'recipe' overrides 'cv' in front matter (using static asset)
  * _Scenario:_ Converts `test/assets/front_matter_tests/fm_specifies_cv.md` using `--plugin recipe` via CLI. Checks for PDF output and stdout confirmation of override and plugin usage.
5. **Test Description:** Local Config: Convert doc with plugin AND overrides from local <filename>.config.yaml (static assets)
  * _Scenario:_ Converts `test/assets/local_config_tests/doc_with_local_config.md` which uses `doc_with_local_config.config.yaml` to specify 'recipe' plugin and A6 format. Checks for PDF output and stdout confirmation.

### B. `test/test-cases/config-command.test-cases.js`
6. **Test Description:** CLI: config - Display global config (explicitly using test/config.test.yaml)
  * _Scenario:_ Runs `md-to-pdf config --config test/config.test.yaml`. Checks stdout for key sections and content from the test config.
7. **Test Description:** CLI: config --pure - Display pure global config (explicitly using test/config.test.yaml)
  * _Scenario:_ Runs `md-to-pdf config --pure --config test/config.test.yaml`. Checks stdout is valid YAML, contains expected data, and lacks comment headers.
8. **Test Description:** CLI: config --factory-defaults - Display factory default global config
  * _Scenario:_ Runs `md-to-pdf config --factory-defaults`. Checks stdout for factory default config path and key content.
9. **Test Description:** CLI: config --plugin default - Display config for 'default' plugin with inline override
  * _Scenario:_ Runs `md-to-pdf config --plugin default --config test/config.test.yaml`. Checks stdout for effective config of 'default' plugin, including inline overrides from `test/config.test.yaml`.
10. **Test Description:** CLI: config --plugin default --pure - Display pure config for 'default' plugin with inline override
  * _Scenario:_ Runs `md-to-pdf config --plugin default --pure --config test/config.test.yaml`. Checks stdout is valid YAML for the 'default' plugin's effective config and lacks comments.
11. **Test Description:** CLI: config --plugin cv --config <path_to_override_cv_test.yaml> - Test project-specific plugin override display
  * _Scenario:_ Runs `md-to-pdf config --plugin cv --config test/assets/override_config/cv_test.yaml`. Checks stdout for 'cv' plugin's effective config, including overrides from `cv_test.yaml`.

### C. `test/test-cases/convert-command.test-cases.js`
12. **Test Description:** CV: Convert example CV with explicit filename
  * _Scenario:_ Converts `examples/example-cv.md` using `cv` plugin to a specific output filename. Checks PDF creation.
13. **Test Description:** CV: Convert example CV
  * _Scenario:_ Converts `examples/example-cv.md` using `cv` plugin (default output filename). Checks PDF creation.
14. **Test Description:** Cover Letter: Convert example cover letter with explicit filename
  * _Scenario:_ Converts `examples/example-cover-letter.md` using `cover-letter` plugin to a specific output filename. Checks PDF creation.
15. **Test Description:** Single Recipe: Convert example recipe
  * _Scenario:_ Converts `examples/example-recipe.md` using `recipe` plugin (default output filename). Checks PDF creation.
16. **Test Description:** Project Config: Convert CV with project-specific config override (A5 format, custom CSS)
  * _Scenario:_ Converts `examples/example-cv.md` using `cv` plugin and a project-specific config (`test/assets/override_config/cv_test.yaml`). Checks PDF creation.
17. **Test Description:** Custom Plugin: Convert business card example using 'business-card' plugin
  * _Scenario:_ Converts `test/assets/example-business-card.md` using the custom `business-card` plugin (registered in `test/config.test.yaml`). Checks PDF creation.
18. **Test Description:** Math Rendering: Convert example math document
  * _Scenario:_ Converts `examples/example-math.md` using `default` plugin (math enabled in `test/config.test.yaml`). Checks PDF creation and stdout confirmation.
19. **Test Description:** Params: Test with base config params & front matter override
  * _Scenario:_ Converts `test/assets/example-params-test.md` using `default` plugin. Checks PDF creation and stdout notes regarding parameter sources.
20. **Test Description:** Params: Test with project config params overriding base, & front matter overriding project
  * _Scenario:_ Converts `test/assets/example-params-test.md` using `default` plugin and `test/assets/project_params_config.yaml`. Checks PDF creation and stdout notes.

### D. `test/test-cases/generate-command.test-cases.js`
21. **Test Description:** Recipe Book: Create recipe book from Hugo examples
  * _Scenario:_ Runs `md-to-pdf generate recipe-book` using `examples/hugo-example` as source. Checks for combined PDF recipe book creation.

### E. `test/test-cases/plugin-create-command.test-cases.js`
22. **Test Description:** CLI: plugin create new-template-plug (default template, default CWD target)
  * _Scenario:_ Creates a plugin from the bundled template in the CWD. Verifies directory, files, and key content.
23. **Test Description:** CLI: plugin create new-template-custom-dir --dir <CREATED_PLUGINS_DIR> (default template, custom dir)
  * _Scenario:_ Creates a plugin from the bundled template in a specified directory. Verifies structure and content.
24. **Test Description:** CLI: plugin create arch-from-cv --from ./plugins/cv --dir <CREATED_PLUGINS_DIR> (archetype from direct path)
  * _Scenario:_ Creates a plugin by archetyping from `./plugins/cv` into a specified directory. Verifies structure and content.
25. **Test Description:** CLI: plugin create existing-dir-no-force --dir <CREATED_PLUGINS_DIR> (error on existing, no --force)
  * _Scenario:_ Attempts to create a plugin where the target directory exists, without `--force`. Checks for expected error message.
26. **Test Description:** CLI: plugin create existing-dir-with-force --dir <CREATED_PLUGINS_DIR> --force (overwrite existing)
  * _Scenario:_ Creates a plugin, overwriting an existing target directory using `--force`. Verifies structure and content.
27. **Test Description:** CLI: plugin create bad!name (invalid name check)
  * _Scenario:_ Attempts to create a plugin with an invalid name. Checks for expected error message.
28. **Test Description:** CLI: plugin create --from non-existent-source (error check)
  * _Scenario:_ Attempts to create a plugin using `--from` with a source that doesn't exist. Checks for expected error message.
29. **Test Description:** CLI: deprecated collection archetype command
  * _Scenario:_ Runs the deprecated `md-to-pdf collection archetype` command. Checks for deprecation warning in stderr and that it still functionally creates an archetype.
30. **Test Description:** CLI: plugin create arch-from-cm-coll/plug (CM source - placeholder for manual or future test)
  * _Scenario:_ Placeholder test, currently skipped, for archetyping from a CM-managed source.

## II. CollectionsManager Module Tests (`test/cm-tests/`)

### F. `test/cm-tests/add.test.js`
31. **Test (`testAddCollectionGit`):** CM: Add Collection from Git URL
  * _Scenario:_ Programmatically calls `manager.addCollection` with a Git URL. Verifies correct path, directory existence, presence of `README.md`, and content of `.collection-metadata.yaml`.
32. **Test (`testAddCollectionLocal`):** CM: Add Collection from Local Path
  * _Scenario:_ Programmatically calls `manager.addCollection` with a local path. Verifies correct path, directory existence, copied plugin config, and content of `.collection-metadata.yaml`.

### G. `test/cm-tests/archetype.test.js`
33. **Test (`testSuccessfulArchetypeDefaultTarget`):** CM: Archetype Plugin - Successful (Default Target)
  * _Scenario:_ Programmatically calls `manager.archetypePlugin`. Verifies successful creation in default archetype location, file renames (`.config.yaml`, `.css`, `.js`, `example.md`), content updates (description, CSS/handler references in config, README note, string replacements in various files).
34. **Test (`testSuccessfulArchetypeCustomTarget`):** CM: Archetype Plugin - Successful (Custom Target Directory)
  * _Scenario:_ Programmatically calls `manager.archetypePlugin` with a custom target directory. Verifies creation in custom target, non-conventional CSS/handler file copying and content processing.
35. **Test (`testArchetypeSourceNotFound`):** CM: Archetype Plugin - Source Not Found
  * _Scenario:_ Programmatically calls `manager.archetypePlugin` with non-existent collection/plugin identifiers and non-existent direct paths. Asserts rejection with appropriate error messages.
36. **Test (`testArchetypeTargetExists`):** CM: Archetype Plugin - Target Directory Exists
  * _Scenario:_ Programmatically calls `manager.archetypePlugin` where the target directory already exists (without force). Asserts rejection with appropriate error message.

### H. `test/cm-tests/disable.test.js`
37. **Test (`testDisablePlugin`):** CM: Disable Plugin
  * _Scenario:_ Programmatically calls `manager.disablePlugin`. Covers:
    * Failure if manifest does not exist.
    * Successful disablement of an existing plugin (checks `enabled.yaml`).
    * Attempting to disable a non-existent/non-enabled plugin.

### I. `test/cm-tests/enable.test.js`
38. **Test (`testEnablePlugin`):** CM: Enable Plugin and Verify Manifest
  * _Scenario:_ Programmatically calls `manager.enablePlugin`. Covers:
    * Successful enablement with default invoke name.
    * Verification of `enabled.yaml` content (collection_name, plugin_id, invoke_name, config_path, added_on).
    * Enablement with a custom invoke name.
    * Rejection on conflicting default invoke_name.
    * Rejection on conflicting custom invoke_name.
    * Rejection for a non-existent plugin.
39. **Test (`testEnableAllPluginsInCollection`):** CM: Enable All Plugins in Collection (Default & Override Prefixing)
  * _Scenario:_ Programmatically calls `manager.enableAllPluginsInCollection`. Covers:
    * Default prefixing for GitHub source (`<username>-plugin_id`).
    * Default prefixing for Generic Git source (`<collection_name>-plugin_id`).
    * Default prefixing for Local path source (no prefix).
    * `--no-prefix` option.
    * `--prefix <custom>` option.
    * Conflict handling (one plugin already enabled, others should still process).

### J. `test/cm-tests/list.test.js`
40. **Test (`testListCollectionsType`):** CM: List Collections (type: collections/downloaded)
  * _Scenario:_ Programmatically calls `manager.listCollections('downloaded')`. Verifies presence of added collections and correct source information for Git/local collections. Checks count against actual directories.
41. **Test (`testListAllPluginsType`):** CM: List All Available Plugins (type: all/available)
  * _Scenario:_ Programmatically calls `manager.listAvailablePlugins()`. Checks global list count and details (plugin_id, collection, description). Checks filtering by collection name. Checks listing of malformed plugins (error in description). Checks listing for non-existent collection.
42. **Test (`testListEnabledPluginsType`):** CM: List Enabled Plugins (type: enabled)
  * _Scenario:_ Programmatically calls `manager.listCollections('enabled')`. Verifies listing of enabled plugins, including those with custom invoke names. Checks filtering by collection name and for non-existent collection.
43. **Test (`testListDisabledPluginsType`):** CM: List Disabled Plugins (type: disabled)
  * _Scenario:_ Programmatically determines disabled plugins (Available - Enabled). Verifies correct disabled plugin is found within a collection and globally.

### K. `test/cm-tests/remove.test.js`
44. **Test (`testRemoveCollection`):** CM: Remove Collection
  * _Scenario:_ Programmatically calls `manager.removeCollection`. Covers:
    * Rejection for non-existent collection.
    * Rejection for collection with enabled plugins (no `--force`).
    * Successful removal with `--force` (checks directory deleted, plugins disabled from manifest).
    * Successful removal of collection with no enabled plugins (no `--force`).

### L. `test/cm-tests/update.test.js`
45. **Test (`testUpdateCollection`):** CM: Update Single Collection Scenarios
  * _Scenario:_ Programmatically calls `manager.updateCollection`. Covers:
    * Updating non-existent collection (fail).
    * Updating local-path collection (successful re-sync, source missing, source not a dir).
    * Clean Git update (remote has new commits, check new file, commit hash, metadata `updated_on`).
    * Git update with untracked local changes (abort, file still exists).
    * Git update with local commits not on remote (abort, HEAD unchanged, local file exists, remote file not pulled).
    * Git update after remote force push (abort, HEAD unchanged, old file exists, new history file not pulled).
46. **Test (`testUpdateAllCollections`):** CM: Update All Collections (Resilient)
  * _Scenario:_ Programmatically calls `manager.updateAllCollections` with a mix of collections:
    * One Git collection that can be updated.
    * One local-path collection to be re-synced.
    * One Git collection with local changes that should abort its update.
    * Verifies overall failure, success/abort messages for individual collections, and `updated_on` metadata status.

### I. CLI Integration Tests (`test/test-cases/`)

#### A. `test/test-cases/advanced-features.test-cases.js`
1.  [KEEP] FM: Convert doc specifying 'cv' plugin in front matter
2.  [KEEP] FM: CLI --plugin 'recipe' overrides 'cv' in front matter
3.  [KEEP] FM: Convert doc specifying 'cv' plugin (static asset)
4.  [KEEP] FM: CLI --plugin 'recipe' overrides 'cv' (static asset)
5.  [KEEP] CLI Local Config: Convert doc with plugin AND overrides from local `<filename>.config.yaml`

#### B. `test/test-cases/config-command.test-cases.js`
6.  CLI: config - Display global config (test/config.test.yaml)
7.  CLI: config --pure - Display pure global config (test/config.test.yaml)
8.  CLI: config --factory-defaults - Display factory default global config
9.  CLI: config --plugin default - Display 'default' plugin with inline override
10. CLI: config --plugin default --pure - Display pure 'default' plugin config
11. CLI: config --plugin cv --config <override_cv_test.yaml> - Project-specific override

#### C. `test/test-cases/convert-command.test-cases.js`
12. CV: Convert example CV with explicit filename
13. CV: Convert example CV (default filename)
14. Cover Letter: Convert example cover letter with explicit filename
15. Single Recipe: Convert example recipe
16. Project Config: Convert CV with project-specific override
17. Custom Plugin: Convert business card example
18. Math Rendering: Convert example math document
19. Params: Base config params & front matter override
20. Params: Project config params override base, FM overrides project

#### D. `test/test-cases/generate-command.test-cases.js`
21. Recipe Book: Create recipe book from Hugo examples

#### E. `test/test-cases/plugin-create-command.test-cases.js`
22. Create from default template (default CWD target)
23. Create from default template (--dir custom)
24. Create --from <direct_path> (--dir custom)
25. Create - error on existing dir (no --force)
26. Create --force (overwrite existing dir)
27. Create - invalid name check
28. Create --from <non-existent-source> (error)
29. Deprecated 'collection archetype' command (warning & function)
30. Create --from <cm_collection/plugin_id> (placeholder/skipped)

#### F. `test/test-cases/collection-add-cli.test-cases.js` // NEW FILE for v0.8.7
31. // NEW v0.8.7: CLI: collection add <git_url> [--name] - success
32. // NEW v0.8.7: CLI: collection add <local_path> [--name] - success
33. // NEW v0.8.7: CLI: collection add - error: target already exists
34. // NEW v0.8.7: CLI: collection add - error: invalid source URL/path

#### G. `test/test-cases/collection-list-cli.test-cases.js` // NEW FILE for v0.8.7
35. // NEW v0.8.7: CLI: collection list (no collections downloaded)
36. // NEW v0.8.7: CLI: collection list (with multiple collections, including _user_added_plugins)
37. // NEW v0.8.7: CLI: collection list --short (verify condensed output, source types, _user_added_plugins)

#### H. `test/test-cases/collection-remove-cli.test-cases.js` // NEW FILE for v0.8.7
38. // NEW v0.8.7: CLI: collection remove <name> - success
39. // NEW v0.8.7: CLI: collection remove <name> --force (with enabled plugins from it)
40. // NEW v0.8.7: CLI: collection remove - error: collection not found
41. // NEW v0.8.7: CLI: collection remove - error: has enabled plugins, no --force

#### I. `test/test-cases/collection-update-cli.test-cases.js` // NEW FILE for v0.8.7
42. // NEW v0.8.7: CLI: collection update <git_collection_name> (clean update)
43. // NEW v0.8.7: CLI: collection update <local_collection_name> (successful re-sync from local source)
44. // NEW v0.8.7: CLI: collection update <singleton_collection_path_e.g., _user_added_plugins/my-plugin> (successful re-sync)
45. // NEW v0.8.7: CLI: collection update (all) - verify it attempts updates for git, local, and singletons
46. // NEW v0.8.7: CLI: collection update <name> - error: collection not found
47. // NEW v0.8.7: CLI: collection update <git_collection_name> - error: local changes abort

#### J. `test/test-cases/plugin-add-cli.test-cases.js` // NEW FILE for v0.8.7
48. // NEW v0.8.7: CLI: plugin add <path_to_plugin_dir> - success (verify output, COLL_ROOT structure, enabled.yaml)
49. // NEW v0.8.7: CLI: plugin add <path_to_plugin_dir> --name <custom_invoke_name> - success
50. // NEW v0.8.7: CLI: plugin add - error: source path not found
51. // NEW v0.8.7: CLI: plugin add - error: source directory not a valid plugin
52. // NEW v0.8.7: CLI: plugin add - error: invoke_name conflict
53. // NEW v0.8.7: CLI: plugin add - error: target singleton directory already exists in _user_added_plugins

#### K. `test/test-cases/plugin-disable-cli.test-cases.js` // NEW FILE for v0.8.7
54. // NEW v0.8.7: CLI: plugin disable <invoke_name> - success (verify enabled.yaml)
55. // NEW v0.8.7: CLI: plugin disable <invoke_name> - error: plugin not found/not enabled

#### L. `test/test-cases/plugin-enable-cli.test-cases.js` // NEW FILE for v0.8.7
56. // NEW v0.8.7: CLI: plugin enable <collection/plugin_id> [--name <custom_invoke_name>] - success
57. // NEW v0.8.7: CLI: plugin enable <collection_name> --all [--prefix | --no-prefix] - success
58. // NEW v0.8.7: CLI: plugin enable - error: plugin not available in specified collection
59. // NEW v0.8.7: CLI: plugin enable - error: invoke_name conflict

#### M. `test/test-cases/plugin-list-cli.test-cases.js` // NEW FILE for v0.8.7
60. // NEW v0.8.7: CLI: plugin list (default, verify mix of traditional & CM-enabled)
61. // NEW v0.8.7: CLI: plugin list --available [<collection_filter>]
62. // NEW v0.8.7: CLI: plugin list --enabled [<collection_filter>] (verify CM & traditional displayed)
63. // NEW v0.8.7: CLI: plugin list --disabled [<collection_filter>]
64. // NEW v0.8.7: CLI: plugin list --short (verify condensed output for various statuses/origins)
65. // NEW v0.8.7: CLI: plugin list (with _user_added_plugins and singletons present, verify correct display)

### II. CollectionsManager Module Tests (`test/cm-tests/`)

#### N. `test/cm-tests/add.test.js`
66. Test (`testAddCollectionGit`): CM: Add Collection from Git URL
67. Test (`testAddCollectionLocal`): CM: Add Collection from Local Path
68. // NEW v0.8.7 (`addSingletonPlugin`): CM: Add Standalone Plugin - successful case
69. // NEW v0.8.7 (`addSingletonPlugin`): CM: Add Standalone Plugin - error: source path not found
70. // NEW v0.8.7 (`addSingletonPlugin`): CM: Add Standalone Plugin - error: source not valid plugin
71. // NEW v0.8.7 (`addSingletonPlugin`): CM: Add Standalone Plugin - error: invoke_name conflict
72. // NEW v0.8.7 (`addSingletonPlugin`): CM: Add Standalone Plugin - error: target singleton dir already exists

#### O. `test/cm-tests/archetype.test.js`
73. Test (`testSuccessfulArchetypeDefaultTarget`): CM: Archetype Plugin - Successful (Default Target)
74. Test (`testSuccessfulArchetypeCustomTarget`): CM: Archetype Plugin - Successful (Custom Target Directory)
75. Test (`testArchetypeSourceNotFound`): CM: Archetype Plugin - Source Not Found
76. Test (`testArchetypeTargetExists`): CM: Archetype Plugin - Target Directory Exists

#### P. `test/cm-tests/disable.test.js`
77. Test (`testDisablePlugin`): CM: Disable Plugin (covers multiple internal scenarios)

#### Q. `test/cm-tests/enable.test.js`
78. Test (`testEnablePlugin`): CM: Enable Plugin and Verify Manifest
79. Test (`testEnableAllPluginsInCollection`): CM: Enable All Plugins in Collection

#### R. `test/cm-tests/list.test.js`
80. Test (`testListCollectionsType`): CM: List Collections (type: downloaded)
81. Test (`testListAllPluginsType`): CM: List All Available Plugins (type: all/available)
82. Test (`testListEnabledPluginsType`): CM: List Enabled Plugins (type: enabled)
83. Test (`testListDisabledPluginsType`): CM: List Disabled Plugins (type: disabled)
84. // NEW v0.8.7: CM: listCollections('downloaded') - specific check for _user_added_plugins container
85. // NEW v0.8.7: CM: listAvailablePlugins() - specific check for plugins within _user_added_plugins
86. // NEW v0.8.7: CM: listCollections('enabled') - specific check for enabled singleton plugins

#### S. `test/cm-tests/remove.test.js`
87. Test (`testRemoveCollection`): CM: Remove Collection (covers multiple internal scenarios)

#### T. `test/cm-tests/update.test.js`
88. Test (`testUpdateCollection`): CM: Update Single Collection Scenarios (Git, local path, errors)
89. Test (`testUpdateAllCollections`): CM: Update All Collections (Resilient, mix of types)
90. // NEW v0.8.7: CM Update: `updateCollection` for a singleton plugin (successful re-sync)
91. // NEW v0.8.7: CM Update: `updateCollection` for singleton (original source modified)
92. // NEW v0.8.7: CM Update: `updateCollection` for singleton (original source missing)
93. // NEW v0.8.7: CM Update All: `updateAllCollections` correctly processes singletons
94. // NEW v0.8.7: CM Update All: `updateAllCollections` handles Git collections alongside singletons
95. // NEW v0.8.7: CM Update All: `updateAllCollections` handles local-path collections alongside singletons

### Example of full report on test elements

** A3 - A5 -- for reproducible illustration

**Test File: `test/test-cases/advanced-features.test-cases.js`**

**Test A3:**
* **Test Code:** `A3`
* **Short Description:** FM: Convert doc specifying 'cv' plugin in FM (static asset)
* **Brittleness Score:**
  * `Medium`. The PDF check is robust (existence/minSize). The `stdout.includes("Using plugin 'cv' (determined via front matter in 'fm_specifies_cv.md')")` check is for a key informational message. If this exact phrasing is considered a stable part of the CLI output, the brittleness is manageable. Changes to chalk/coloring could still affect it if not handled carefully (e.g. by stripping ANSI codes before assertion, or by the test runner).
* **Type:**
  * `E2E / CLI Integration`. It tests the full CLI path for plugin determination from a static file's front matter.
* **My Recommended Status & Rationale:**
  * `KEEP`. This validates a common user scenario: using a checked-in Markdown file that self-specifies its plugin. It's a good E2E check for the plugin determination logic involving `plugin_determiner.js` and `cli.js`.
  * *Suggestion:* Ensure the stdout assertion is as resilient as possible to minor wording or color code changes (e.g., focus on "determined via front matter" and "using plugin 'cv'").

---

**Test A4:**
* **Test Code:** `A4`
* **Short Description:** FM: CLI `--plugin recipe` overrides FM 'cv' (static asset)
* **Brittleness Score:**
  * `Medium`. Similar to A3, PDF check is robust. Stdout checks are `stdout.includes("Plugin 'recipe' specified via CLI, overriding front matter plugin 'cv'.")` and `stdout.includes("Using plugin 'recipe' (determined via CLI option)")`. These are key informational messages. Brittleness depends on the stability of these exact phrases.
* **Type:**
  * `E2E / CLI Integration`. Tests CLI argument precedence over front matter for plugin selection.
* **My Recommended Status & Rationale:**
  * `KEEP`. This is crucial for verifying the defined precedence rules for plugin selection at the CLI level. It tests how the CLI orchestrates `plugin_determiner.js`.
  * *Suggestion:* Ensure asserted stdout phrases are considered stable parts of the CLI's output contract.

---

**Test A5:**
* **Test Code:** `A5`
* **Short Description:** Local Config: Convert doc with plugin AND overrides from `<filename>.config.yaml` (static assets)
* **Brittleness Score:**
  * `Medium-High` for full override verification, `Medium` for plugin selection part.
    * The PDF check (existence/minSize) is robust.
    * The stdout check `stdout.includes("Using plugin 'recipe' (determined via local 'doc_with_local_config.config.yaml')")` is for a key message and is reasonably stable.
    * *However*, verifying the *actual effect* of overrides (like A6 format, specific CSS causing green background) programmatically from the PDF in a CLI test is very difficult and brittle. The current test relies on `KEEP_OUTPUT=true` and manual visual inspection for this, which is a pragmatic approach for these complex visual assertions.
* **Type:**
  * `E2E / CLI Integration`. This tests a very important and complex part of the configuration system: discovery of local `.config.yaml`, plugin selection from it, and application of its high-precedence overrides.
* **My Recommended Status & Rationale:**
  * `KEEP`. This is an essential E2E test for a key advanced feature.
  * *Suggestion:*
    * Maintain the current approach of checking PDF existence and the stdout message for plugin source determination.
    * Continue to rely on manual/visual inspection (aided by `KEEP_OUTPUT=true`) for verifying the detailed *impact* of the visual overrides (A6 format, colors) as programmatic PDF content analysis is out of scope for these CLI tests.
    * If specific *data* parameters from the local config were substituted into the Markdown, and if we had a way to inspect the intermediate HTML (which we don't easily in CLI tests), asserting on that would be more robust than PDF visual checks. For now, the current approach is a good balance.


---

## Phase 2: Test Decision Strategy

### I. CLI Integration Tests (`test/test-cases/`)

#### Test Decision Strategy, as a table

##### A. Test Decision Strategy

| Old Type | New Type | Test Code          | Brittleness   | ACTION                            | Suggestion (<= 42 chars)                  |
| :------- | :------- | :----------------- | :------------ | :-------------------------------- | :---------------------------------------- |
| E2E      | E2E      | A1 [^A_CLI] [^A1]         | Medium        | KEEP E2E                          | Focus stdout on key determination phrase  |
| E2E      | E2E      | A2 [^A_CLI] [^A2]         | Medium        | KEEP E2E                          | Ensure override message is stable         |
| E2E      | E2E      | A3 [^A_CLI] [^A3]         | Medium        | REDUCE/CONSOLIDATE E2E            | Merge w/ A1; static asset is fine.      |
| E2E      | E2E      | A4 [^A_CLI] [^A4]         | Medium        | REDUCE/CONSOLIDATE E2E            | Merge w/ A2; static asset is fine.      |
| E2E      | E2E      | A5 [^A_CLI] [^A5]         | Medium-High   | KEEP E2E (Focus on wiring)        | Delegate override logic to MOD tests    |
| ---      | MOD      | A\_MOD\_CR1 [^CR_MOD] [^A_MOD_CR1] | Low           | **ADD** | Test ConfigResolver: local.cfg merging    |
| ---      | MOD      | A\_MOD\_CR2 [^CR_MOD] [^A_MOD_CR2] | Low           | **ADD** | Test ConfigResolver: local.cfg asset paths|


[^A_CLI]: test/test-cases/advanced-features.test-cases.js
[^A1]: Test A1 - FM: Convert doc specifying 'cv' plugin in FM (dynamic MD)
[^A2]: Test A2 - FM: CLI `--plugin recipe` overrides FM 'cv' (dynamic MD)
[^A3]: Test A3 - FM: Convert doc specifying 'cv' plugin in FM (static asset)
[^A4]: Test A4 - FM: CLI `--plugin recipe` overrides FM 'cv' (static asset)
[^A5]: Test A5 - Local Config: Convert with plugin & overrides from `<filename>.config.yaml`

[^CR_MOD]: test/src-module-tests/config-resolver.test.js (Placeholder for new/existing ConfigResolver module tests)
[^A_MOD_CR1]: New MOD Test (from A5 review) - ConfigResolver: Merging logic for local `<filename>.config.yaml` overrides.
[^A_MOD_CR2]: New MOD Test (from A5 review) - ConfigResolver: Asset path resolution from local `<filename>.config.yaml`.

**Explanation of Changes for A5 and the new MOD tests:**

* **A5:** The `ACTION` is now `KEEP E2E (Focus on wiring)` and the `Suggestion` is `Delegate override logic to MOD tests`. This clarifies that A5 itself will remain an E2E test, but its focus will be narrowed to ensure the CLI correctly *uses* the local config mechanism. The deep testing of *how* `ConfigResolver` processes that local config is delegated.
* **New MOD Test Rows (`[^A_MOD_CR1]`, `[^A_MOD_CR2]`):**
  * These are now explicitly added to the table following A5.
  * `Old Type` is `---` as they are new.
  * `New Type` is `MOD`.
  * `Test Code` uses a new file reference `[^CR_MOD]` (placeholder for where `ConfigResolver` module tests would live, e.g., a new `config-resolver.test.js` or similar) and new specific test identifiers.
  * `ACTION` is `ADD`.
  * `Suggestion` briefly describes what these new MOD tests should cover.

---

##### B. Test Decision Strategy

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| E2E      | E2E      | B1 [^B_CLI] [^B1]    | Medium        | KEEP E2E | Focus on key sections & values in stdout  |
| E2E      | E2E      | B2 [^B_CLI] [^B2]    | Low           | KEEP E2E | Verify YAML structure & key values      |
| E2E      | E2E      | B3 [^B_CLI] [^B3]    | Medium        | KEEP E2E | Check factory default path & key items  |
| E2E      | E2E      | B4 [^B_CLI] [^B4]    | Medium        | KEEP E2E | Verify key overridden values & sources  |
| E2E      | E2E      | B5 [^B_CLI] [^B5]    | Low           | KEEP E2E | Verify key YAML structure/values        |
| E2E      | E2E      | B6 [^B_CLI] [^B6]    | Medium        | KEEP E2E | Verify key project overrides & sources  |

[^B_CLI]: test/test-cases/config-command.test-cases.js
[^B1]: Test B1 (#6) - CLI: config - Display global config (test/config.test.yaml)
[^B2]: Test B2 (#7) - CLI: config --pure - Display pure global config (test/config.test.yaml)
[^B3]: Test B3 (#8) - CLI: config --factory-defaults - Display factory default global config
[^B4]: Test B4 (#9) - CLI: config --plugin default - Display 'default' plugin with inline override
[^B5]: Test B5 (#10) - CLI: config --plugin default --pure - Display pure 'default' plugin config
[^B6]: Test B6 (#11) - CLI: config --plugin cv --config path/to/override_cv_test.yaml - Project-specific override

**Notes on these Section B (CLI `config` command) tests:**

* **ACTION** 

  All are recommended as `KEEP E2E`. The `md-to-pdf config` command is primarily about CLI output and verifying how `ConfigResolver` presents its findings through the CLI. These aren't easily replicated as module tests without essentially rebuilding the CLI's display logic.

* **Brittleness:**
  * Tests checking regular stdout (`B1`, `B3`, `B4`, `B6`) are `Medium` because they parse human-readable output which might change slightly (e.g., comment wording, section headers). The suggestions focus on making assertions on the most stable parts.
  * Tests checking `--pure` output (`B2`, `B5`) are `Low` because they assert against YAML structure, which is machine-readable and less prone to cosmetic changes.
* **New Type:** All remain `E2E` as they test the command-line tool's behavior.

How does this look for Section B? When you're ready, we can proceed to Section C (`test/test-cases/convert-command.test-cases.js`).

---

##### C. Test Decision Strategy

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| E2E      | E2E      | C1 [^C_CLI] [^C1]    | Low           | KEEP E2E | Basic E2E; explicit filename.         |
| E2E      | E2E      | C2 [^C_CLI] [^C2]    | Low           | KEEP E2E | Basic E2E; default filename.          |
| E2E      | E2E      | C3 [^C_CLI] [^C3]    | Low           | KEEP E2E | Basic E2E; cover-letter plugin.       |
| E2E      | E2E      | C4 [^C_CLI] [^C4]    | Low           | KEEP E2E | Basic E2E; recipe plugin.             |
| E2E      | E2E      | C5 [^C_CLI] [^C5]    | Medium        | KEEP E2E | Rely on visual for PDF content effects  |
| E2E      | E2E      | C6 [^C_CLI] [^C6]    | Low           | KEEP E2E | Key E2E for custom plugin usage.        |
| E2E      | E2E      | C7 [^C_CLI] [^C7]    | Medium        | KEEP E2E | Confirm key math-related stdout msgs.   |
| E2E      | E2E      | C8 [^C_CLI] [^C8]    | Medium        | KEEP E2E | Visual check for PDF param content.     |
| E2E      | E2E      | C9 [^C_CLI] [^C9]    | Medium        | KEEP E2E | Visual check for PDF param content.     |

**Corresponding Footnote Definitions for Section C:**

[^C_CLI]: test/test-cases/convert-command.test-cases.js
[^C1]: Test C1 (#12) - CV: Convert example CV with explicit filename
[^C2]: Test C2 (#13) - CV: Convert example CV (default filename)
[^C3]: Test C3 (#14) - Cover Letter: Convert example cover letter with explicit filename
[^C4]: Test C4 (#15) - Single Recipe: Convert example recipe
[^C5]: Test C5 (#16) - Project Config: Convert CV with project-specific config override (A5 format, custom CSS)
[^C6]: Test C6 (#17) - Custom Plugin: Convert business card example using 'business-card' plugin
[^C7]: Test C7 (#18) - Math Rendering: Convert example math document
[^C8]: Test C8 (#19) - Params: Test with base config params & front matter override
[^C9]: Test C9 (#20) - Params: Test with project config params overriding base, & front matter overriding project

---

##### D. Test Decision Strategy

| Old Type | New Type | Test Code     | Brittleness   | ACTION   | Suggestion (<= 42 chars)           |
| :------- | :------- | :------------ | :------------ | :------- | :--------------------------------- |
| E2E      | E2E      | D1 [^D_CLI] [^D1] | Low           | KEEP E2E | Core E2E for `generate` command.   |

**Corresponding Footnote Definitions:**

[^D_CLI]: test/test-cases/generate-command.test-cases.js
[^D1]: Test D1 (#21) - Recipe Book: Create recipe book from Hugo examples

**Notes on this Section D test:**

* **D1 (Recipe Book generation):**
  * **Old Type / New Type:** `E2E`. This test executes `md-to-pdf generate recipe-book ...` and checks for the creation of the output PDF with a minimum size. This is a fundamental E2E scenario for the `generate` command and the `recipe-book` plugin.
  * **Brittleness:** `Low`. Asserting on file existence and a minimum size is a robust check for a command whose primary output is a complex generated file. Verifying the *exact content* of the recipe book PDF would be highly brittle and is rightly not part of this automated E2E test.
  * **ACTION:** `KEEP E2E`. This is a core feature demonstration.
  * **Suggestion:** "Core E2E for `generate` command." The test is already well-focused on the E2E outcome.

---

##### E. Test Decision Strategy

**Summary Table: Section E**

| Old Type | New Type | Test Code        | Brittleness   | ACTION        | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------------ | :-------------------------------------- |
| E2E      | E2E      | E1 [^E_CLI] [^E1]    | Medium        | KEEP E2E      | Focus on file struct, key stdout msgs.  |
| E2E      | E2E      | E2 [^E_CLI] [^E2]    | Medium        | KEEP E2E      | Verify custom dir used, basic files.    |
| E2E      | E2E      | E3 [^E_CLI] [^E3]    | Medium        | KEEP E2E      | Key E2E for --from path; check files.   |
| E2E      | E2E      | E4 [^E_CLI] [^E4]    | Low           | KEEP E2E      | Crucial error handling test.            |
| E2E      | E2E      | E5 [^E_CLI] [^E5]    | Medium        | KEEP E2E      | Verify overwrite, basic files created.  |
| E2E      | E2E      | E6 [^E_CLI] [^E6]    | Low           | KEEP E2E      | Essential CLI validation test.          |
| E2E      | E2E      | E7 [^E_CLI] [^E7]    | Low           | KEEP E2E      | Test --from error path correctly.       |
| E2E      | E2E      | E8 [^E_CLI] [^E8]    | Low           | KEEP E2E      | Monitor deprecation; remove when cmd gone.|
| E2E      | E2E      | E9 [^E_CLI] [^E9]    | N/A           | IMPLEMENT E2E | Requires CM setup for CLI test.         |

**Corresponding Footnote Definitions for Section E:**

[^E_CLI]: test/test-cases/plugin-create-command.test-cases.js
[^E1]: Test E1 (#22) - CLI: plugin create (default template, default CWD target)
[^E2]: Test E2 (#23) - CLI: plugin create --dir <custom_dir> (default template, custom dir)
[^E3]: Test E3 (#24) - CLI: plugin create --from <direct_path_to_cv_plugin> --dir <custom_dir> (archetype from direct path)
[^E4]: Test E4 (#25) - CLI: plugin create (error on existing dir, no --force)
[^E5]: Test E5 (#26) - CLI: plugin create --force (overwrite existing dir)
[^E6]: Test E6 (#27) - CLI: plugin create <invalid!name> (invalid name check)
[^E7]: Test E7 (#28) - CLI: plugin create --from <non-existent-source> (error check for --from)
[^E8]: Test E8 (#29) - CLI: deprecated 'collection archetype' command (checks warning & basic function)
[^E9]: Test E9 (#30) - CLI: plugin create --from <cm_collection/plugin_id> (placeholder test, currently skipped)

---

##### F. Test Decision Strategy

**Summary Table: Section F (CLI Integration Tests - `collection-add-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | F1 [^F_CLI] [^F1] | Medium        | **ADD** | Verify CM call, dir created, metadata.  |
| ---      | E2E      | F2 [^F_CLI] [^F2] | Medium        | **ADD** | Verify CM call, dir created, metadata.  |
| ---      | E2E      | F3 [^F_CLI] [^F3] | Low           | **ADD** | Test error: target dir already exists.  |
| ---      | E2E      | F4 [^F_CLI] [^F4] | Low           | **ADD** | Test error: invalid source URL/path.    |

**Corresponding Footnote Definitions for Section F:**

[^F_CLI]: test/test-cases/collection-add-cli.test-cases.js (NEW FILE for v0.8.7)
[^F1]: Test #31 (New) - CLI: collection add <git_url> [--name] - success
[^F2]: Test #32 (New) - CLI: collection add <local_path> [--name] - success
[^F3]: Test #33 (New) - CLI: collection add - error: target already exists
[^F4]: Test #34 (New) - CLI: collection add - error: invalid source URL/path

---

##### G. Test Decision Strategy

**Summary Table: Section G (CLI Integration Tests - `collection-list-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | G1 [^G_CLI] [^G1] | Medium        | **ADD** | Verify correct "no collections" output. |
| ---      | E2E      | G2 [^G_CLI] [^G2] | Medium        | **ADD** | Check key collection names are present. |
| ---      | E2E      | G3 [^G_CLI] [^G3] | Medium        | **ADD** | Check key names, types, origins (--short).|

**Corresponding Footnote Definitions for Section G:**

[^G_CLI]: test/test-cases/collection-list-cli.test-cases.js (NEW FILE for v0.8.7)
[^G1]: Test #35 (New) - CLI: collection list (no collections downloaded)
[^G2]: Test #36 (New) - CLI: collection list (with multiple collections, including _user_added_plugins)
[^G3]: Test #37 (New) - CLI: collection list --short (verify condensed output, source types, _user_added_plugins)

---

##### H. Test Decision Strategy

**Summary Table: Section H (CLI Integration Tests - `collection-remove-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | H1 [^H_CLI] [^H1] | Medium        | **ADD** | Verify CM call, dir removed.            |
| ---      | E2E      | H2 [^H_CLI] [^H2] | Medium        | **ADD** | Verify CM call, dir removed, manifest.  |
| ---      | E2E      | H3 [^H_CLI] [^H3] | Low           | **ADD** | Test error: collection not found.       |
| ---      | E2E      | H4 [^H_CLI] [^H4] | Low           | **ADD** | Test error: no --force, enabled plugins.|

**Corresponding Footnote Definitions for Section H:**

[^H_CLI]: test/test-cases/collection-remove-cli.test-cases.js (NEW FILE for v0.8.7)
[^H1]: Test #38 (New) - CLI: collection remove <name> - success
[^H2]: Test #39 (New) - CLI: collection remove <name> --force (with enabled plugins from it)
[^H3]: Test #40 (New) - CLI: collection remove - error: collection not found
[^H4]: Test #41 (New) - CLI: collection remove - error: has enabled plugins, no --force

---

##### I. Test Decision Strategy

**Summary Table: Section I (CLI Integration Tests - `collection-update-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | I1 [^I_CLI] [^I1] | Medium        | **ADD** | Verify Git update, check `updated_on`.  |
| ---      | E2E      | I2 [^I_CLI] [^I2] | Medium        | **ADD** | Verify local re-sync, `updated_on`.     |
| ---      | E2E      | I3 [^I_CLI] [^I3] | Medium        | **ADD** | Verify singleton re-sync, `updated_on`. |
| ---      | E2E      | I4 [^I_CLI] [^I4] | Medium        | **ADD** | Check `update all` processes all types. |
| ---      | E2E      | I5 [^I_CLI] [^I5] | Low           | **ADD** | Test error: collection not found.       |
| ---      | E2E      | I6 [^I_CLI] [^I6] | Low           | **ADD** | Test error: local changes abort (Git).  |

**Corresponding Footnote Definitions for Section I:**

[^I_CLI]: test/test-cases/collection-update-cli.test-cases.js (NEW FILE for v0.8.7)
[^I1]: Test #42 (New) - CLI: collection update <git_collection_name> (clean update)
[^I2]: Test #43 (New) - CLI: collection update <local_collection_name> (successful re-sync from local source)
[^I3]: Test #44 (New) - CLI: collection update <singleton_collection_path_e.g., _user_added_plugins/my-plugin> (successful re-sync)
[^I4]: Test #45 (New) - CLI: collection update (all) - verify it attempts updates for git, local, and singletons
[^I5]: Test #46 (New) - CLI: collection update <name> - error: collection not found
[^I6]: Test #47 (New) - CLI: collection update <git_collection_name> - error: local changes abort

---

##### J. Test Decision Strategy

**Summary Table: Section J (CLI Integration Tests - `plugin-add-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | J1 [^J_CLI] [^J1] | Medium        | **ADD** | Verify CM call, COLL_ROOT, enabled.yaml |
| ---      | E2E      | J2 [^J_CLI] [^J2] | Medium        | **ADD** | Verify custom name, COLL_ROOT files.    |
| ---      | E2E      | J3 [^J_CLI] [^J3] | Low           | **ADD** | Test error: source path not found.      |
| ---      | E2E      | J4 [^J_CLI] [^J4] | Low           | **ADD** | Test error: source not valid plugin.    |
| ---      | E2E      | J5 [^J_CLI] [^J5] | Low           | **ADD** | Test error: invoke_name conflict.       |
| ---      | E2E      | J6 [^J_CLI] [^J6] | Low           | **ADD** | Test error: target dir already exists.  |

**Corresponding Footnote Definitions for Section J:**

[^J_CLI]: test/test-cases/plugin-add-cli.test-cases.js (NEW FILE for v0.8.7)
[^J1]: Test #48 (New) - CLI: plugin add <path_to_plugin_dir> - success (verify output, COLL_ROOT structure, enabled.yaml)
[^J2]: Test #49 (New) - CLI: plugin add <path_to_plugin_dir> --name <custom_invoke_name> - success
[^J3]: Test #50 (New) - CLI: plugin add - error: source path not found
[^J4]: Test #51 (New) - CLI: plugin add - error: source directory not a valid plugin
[^J5]: Test #52 (New) - CLI: plugin add - error: invoke_name conflict
[^J6]: Test #53 (New) - CLI: plugin add - error: target singleton directory already exists in _user_added_plugins

---

##### K. Test Decision Strategy

**Summary Table: Section K (CLI Integration Tests - `plugin-disable-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | K1 [^K_CLI] [^K1] | Medium        | **ADD** | Verify CM call, check enabled.yaml.     |
| ---      | E2E      | K2 [^K_CLI] [^K2] | Low           | **ADD** | Test error: plugin not found/enabled.   |

**Corresponding Footnote Definitions for Section K:**

[^K_CLI]: test/test-cases/plugin-disable-cli.test-cases.js (NEW FILE for v0.8.7)
[^K1]: Test #54 (New) - CLI: plugin disable <invoke_name> - success (verify enabled.yaml)
[^K2]: Test #55 (New) - CLI: plugin disable <invoke_name> - error: plugin not found/not enabled

---


Okay, we'll continue with the CLI E2E tests as per your catalogue. Next up are **Section L** and **Section M**.

---

##### L. Test Decision Strategy

**Summary Table: Section L (CLI Integration Tests - `plugin-enable-cli`)**
*These are new tests proposed for v0.8.7.*

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | L1 [^L_CLI] [^L1] | Medium        | **ADD** | Verify CM call, enabled.yaml updated.   |
| ---      | E2E      | L2 [^L_CLI] [^L2] | Medium        | **ADD** | Verify CM call, all plugins enabled.    |
| ---      | E2E      | L3 [^L_CLI] [^L3] | Low           | **ADD** | Test error: plugin not available.       |
| ---      | E2E      | L4 [^L_CLI] [^L4] | Low           | **ADD** | Test error: invoke_name conflict.       |

**Corresponding Footnote Definitions for Section L:**

[^L_CLI]: test/test-cases/plugin-enable-cli.test-cases.js (NEW FILE for v0.8.7)
[^L1]: Test #56 (New) - CLI: plugin enable <collection/plugin_id> [--name <custom_invoke_name>] - success
[^L2]: Test #57 (New) - CLI: plugin enable <collection_name> --all [--prefix | --no-prefix] - success
[^L3]: Test #58 (New) - CLI: plugin enable - error: plugin not available in specified collection
[^L4]: Test #59 (New) - CLI: plugin enable - error: invoke_name conflict

---

##### M. Test Decision Strategy

**Summary Table: Section M (CLI Integration Tests - `plugin-list-cli`)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| ---      | E2E      | M1 [^M_CLI] [^M1] | Medium        | **ADD** | Check key plugins from diff sources.    |
| ---      | E2E      | M2 [^M_CLI] [^M2] | Medium        | **ADD** | Verify available plugins listed.        |
| ---      | E2E      | M3 [^M_CLI] [^M3] | Medium        | **ADD** | Verify enabled plugins listed.          |
| ---      | E2E      | M4 [^M_CLI] [^M4] | Medium        | **ADD** | Verify disabled plugins listed.         |
| ---      | E2E      | M5 [^M_CLI] [^M5] | Medium        | **ADD** | Check key names, statuses, origins.     |
| ---      | E2E      | M6 [^M_CLI] [^M6] | Medium        | **ADD** | Check display of singletons & container.|

**Corresponding Footnote Definitions for Section M:**

[^M_CLI]: test/test-cases/plugin-list-cli.test-cases.js (NEW FILE for v0.8.7)
[^M1]: Test #60 (New) - CLI: plugin list (default, verify mix of traditional & CM-enabled)
[^M2]: Test #61 (New) - CLI: plugin list --available [<collection_filter>]
[^M3]: Test #62 (New) - CLI: plugin list --enabled [<collection_filter>] (verify CM & traditional displayed)
[^M4]: Test #63 (New) - CLI: plugin list --disabled [<collection_filter>]
[^M5]: Test #64 (New) - CLI: plugin list --short (verify condensed output for various statuses/origins)
[^M6]: Test #65 (New) - CLI: plugin list (with _user_added_plugins and singletons present, verify correct display)

---


### II. Collections Manager Module Tests (`test/cm-tests/`)

#### N. Test Decision Strategy

**Summary Table: Section N (CM Module Tests - Add Collection & Add Singleton Plugin)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | N1 [^N_CM] [^N1] | Low           | KEEP     | Core CM logic; ensure comprehensive.    |
| MOD      | MOD      | N2 [^N_CM] [^N2] | Low           | KEEP     | Core CM logic; ensure comprehensive.    |
| ---      | MOD      | N3 [^N_CM] [^N3] | Low           | **ADD** | Verify dir, metadata, enabled.yaml.     |
| ---      | MOD      | N4 [^N_CM] [^N4] | Low           | **ADD** | Test error: source path not found.      |
| ---      | MOD      | N5 [^N_CM] [^N5] | Low           | **ADD** | Test error: source not valid plugin.    |
| ---      | MOD      | N6 [^N_CM] [^N6] | Low           | **ADD** | Test error: invoke_name conflict.       |
| ---      | MOD      | N7 [^N_CM] [^N7] | Low           | **ADD** | Test error: target dir already exists.  |

**Corresponding Footnote Definitions for Section N:**


[^N_CM]: test/cm-tests/add.test.js (covering addCollection and new tests for addSingletonPlugin)
[^N1]: Test #66 - CM: Add Collection from Git URL
[^N2]: Test #67 - CM: Add Collection from Local Path
[^N3]: Test #68 (New) - CM: Add Standalone Plugin (addSingletonPlugin) - successful case
[^N4]: Test #69 (New) - CM: Add Standalone Plugin - error: source path not found
[^N5]: Test #70 (New) - CM: Add Standalone Plugin - error: source not valid plugin
[^N6]: Test #71 (New) - CM: Add Standalone Plugin - error: invoke_name conflict
[^N7]: Test #72 (New) - CM: Add Standalone Plugin - error: target singleton dir already exists

---

#### O. Test Decision Strategy

**Summary Table: Section O (CM Module Tests - Archetype)**

| Old Type | New Type | Test Code        | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :--------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | O1 [^O_CM] [^O1] | Low           | KEEP     | Core logic; verify renames & content.   |
| MOD      | MOD      | O2 [^O_CM] [^O2] | Low           | KEEP     | Verify custom target & non-conventionals|
| MOD      | MOD      | O3 [^O_CM] [^O3] | Low           | KEEP     | Test various not-found scenarios.       |
| MOD      | MOD      | O4 [^O_CM] [^O4] | Low           | KEEP     | Test error: target exists (no force).   |

**Corresponding Footnote Definitions for Section O:**

[^O_CM]: test/cm-tests/archetype.test.js
[^O1]: Test #73 - CM: Archetype Plugin - Successful (Default Target)
[^O2]: Test #74 - CM: Archetype Plugin - Successful (Custom Target Directory)
[^O3]: Test #75 - CM: Archetype Plugin - Source Not Found
[^O4]: Test #76 - CM: Archetype Plugin - Target Directory Exists

---

#### P. Test Decision Strategy

**Summary Table: Section P (CM Module Tests - Disable)**

| Old Type | New Type | Test Code            | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :------------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | P\_MOD1 [^P_CM] [^P_MOD1] | Low           | KEEP     | Core CM logic; ensure all cases covered.|

**Corresponding Footnote Definitions for Section P:**

[^P_CM]: test/cm-tests/disable.test.js
[^P_MOD1]: Test #77 - CM: Disable Plugin (covers multiple internal scenarios: fail if no manifest, success, check manifest empty, attempt non-existent)

---

#### Q. Test Decision Strategy

**Summary Table: Section Q (CM Module Tests - Enable)**

| Old Type | New Type | Test Code            | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :------------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | Q\_MOD1 [^Q_CM] [^Q_MOD1] | Low           | KEEP     | Verify manifest, names, conflicts.      |
| MOD      | MOD      | Q\_MOD2 [^Q_CM] [^Q_MOD2] | Low           | KEEP     | Test prefixing strategies, conflicts.   |

**Corresponding Footnote Definitions for Section Q:**

[^Q_CM]: test/cm-tests/enable.test.js
[^Q_MOD1]: Test #78 - CM: Enable Plugin and Verify Manifest (single plugin, custom invoke name, conflicts, non-existent plugin)
[^Q_MOD2]: Test #79 - CM: Enable All Plugins in Collection (Default & Override Prefixing for various sources; conflict handling)

---

#### R. Test Decision Strategy

**Summary Table: Section R (CM Module Tests - List)**

| Old Type | New Type | Test Code            | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :------------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | R\_MOD1 [^R_CM] [^R_MOD1] | Low           | KEEP     | Verify output struct & content.         |
| MOD      | MOD      | R\_MOD2 [^R_CM] [^R_MOD2] | Low           | KEEP     | Test global/filtered, malformed.        |
| MOD      | MOD      | R\_MOD3 [^R_CM] [^R_MOD3] | Low           | KEEP     | Test global/filtered enabled list.      |
| MOD      | MOD      | R\_MOD4 [^R_CM] [^R_MOD4] | Low           | KEEP     | Verify computed disabled plugins.       |
| ---      | MOD      | R\_MOD5 [^R_CM] [^R_MOD5] | Low           | **ADD** | List downloaded: `_user_added_plugins`. |
| ---      | MOD      | R\_MOD6 [^R_CM] [^R_MOD6] | Low           | **ADD** | List available: from `_user_added`.     |
| ---      | MOD      | R\_MOD7 [^R_CM] [^R_MOD7] | Low           | **ADD** | List enabled: singletons.             |

**Corresponding Footnote Definitions for Section R:**

[^R_CM]: test/cm-tests/list.test.js
[^R_MOD1]: Test #80 - CM: List Collections (type: downloaded)
[^R_MOD2]: Test #81 - CM: List All Available Plugins (type: all/available)
[^R_MOD3]: Test #82 - CM: List Enabled Plugins (type: enabled)
[^R_MOD4]: Test #83 - CM: List Disabled Plugins (type: disabled)
[^R_MOD5]: Test #84 (New) - CM: listCollections('downloaded') - specific check for _user_added_plugins container
[^R_MOD6]: Test #85 (New) - CM: listAvailablePlugins() - specific check for plugins within _user_added_plugins
[^R_MOD7]: Test #86 (New) - CM: listCollections('enabled') - specific check for enabled singleton plugins

---

Okay, let's proceed with the final sections of the CollectionsManager Module tests: **Section S** and **Section T**, as per your catalogue.

---

## S. Test Decision Strategy

**Summary Table: Section S (CM Module Tests - `test/cm-tests/remove.test.js`)**

| Old Type | New Type | Test Code            | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :------------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | S\_MOD1 [^S_CM] [^S_MOD1] | Low           | KEEP     | Cover force, no-force, enabled plugins. |

**Corresponding Footnote Definitions for Section S:**

[^S_CM]: test/cm-tests/remove.test.js
[^S_MOD1]: Test #87 - CM: Remove Collection (covers multiple internal scenarios: non-existent, enabled plugins with/without force, no enabled plugins)

---

## T. Test Decision Strategy

**Summary Table: Section T (CM Module Tests - `test/cm-tests/update.test.js`)**

| Old Type | New Type | Test Code            | Brittleness   | ACTION   | Suggestion (<= 42 chars)                |
| :------- | :------- | :------------------- | :------------ | :------- | :-------------------------------------- |
| MOD      | MOD      | T\_MOD1 [^T_CM] [^T_MOD1] | Low           | KEEP     | Comprehensive Git/local path scenarios. |
| MOD      | MOD      | T\_MOD2 [^T_CM] [^T_MOD2] | Low           | KEEP     | Resilient update all, mixed types.      |
| ---      | MOD      | T\_MOD3 [^T_CM] [^T_MOD3] | Low           | **ADD** | Update singleton: successful re-sync.   |
| ---      | MOD      | T\_MOD4 [^T_CM] [^T_MOD4] | Low           | **ADD** | Update singleton: source modified.      |
| ---      | MOD      | T\_MOD5 [^T_CM] [^T_MOD5] | Low           | **ADD** | Update singleton: source missing.       |
| ---      | MOD      | T\_MOD6 [^T_CM] [^T_MOD6] | Low           | **ADD** | UpdateAll: processes singletons.        |
| ---      | MOD      | T\_MOD7 [^T_CM] [^T_MOD7] | Low           | **ADD** | UpdateAll: Git colls + singletons.      |
| ---      | MOD      | T\_MOD8 [^T_CM] [^T_MOD8] | Low           | **ADD** | UpdateAll: local colls + singletons.    |

**Corresponding Footnote Definitions for Section T:**

[^T_CM]: test/cm-tests/update.test.js
[^T_MOD1]: Test #88 - CM: Update Single Collection Scenarios (Git, local path, errors)
[^T_MOD2]: Test #89 - CM: Update All Collections (Resilient, mix of types)
[^T_MOD3]: Test #90 (New) - CM Update: `updateCollection` for a singleton plugin (successful re-sync)
[^T_MOD4]: Test #91 (New) - CM Update: `updateCollection` for singleton (original source modified)
[^T_MOD5]: Test #92 (New) - CM Update: `updateCollection` for singleton (original source missing)
[^T_MOD6]: Test #93 (New) - CM Update All: `updateAllCollections` correctly processes singletons
[^T_MOD7]: Test #94 (New) - CM Update All: `updateAllCollections` handles Git collections alongside singletons
[^T_MOD8]: Test #95 (New) - CM Update All: `updateAllCollections` handles local-path collections alongside singletons


