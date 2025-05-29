# Changelog - md-to-pdf Collections Manager


## 0.7.6 (Conceptual - Core Logic Refactor)

### Changed

* **Internal Refactoring:**
    * Moved the `_deriveCollectionName(source)` method from the `CollectionsManager` class to a new utility file `cm-utils.js` as an exported function to improve modularity. `CollectionsManager` now imports and uses this utility.
    * Refactored internal logic within `CollectionsManager` for better clarity and cohesion:
        * Introduced private helper methods (`_readEnabledManifest`, `_writeEnabledManifest`) to centralize reading and writing of the `enabled.yaml` manifest.
        * Introduced private helper methods (`_readCollectionMetadata`, `_writeCollectionMetadata`) to centralize reading and writing of `.collection-metadata.yaml` files.
        * Introduced a private helper method (`_spawnGitProcess`) to encapsulate the logic for spawning Git child processes (`clone`, `pull`) and handling their I/O and events.
    * These changes are internal and do not affect the public API or command-line behavior of the Collections Manager. The primary goal was to improve code organization and maintainability.



## 0.7.5 (Conceptual - Refinement & Polish)

### Enhancements & Fixes (Addressing Test Environment & Prefixing Strategy)

* **Default Prefixing for `enable --all`:** The `enableAllPluginsInCollection` method (and thus the `md-to-pdf-cm enable <collection> --all` command) now uses an origin-dependent default prefixing strategy for `invoke_name`s:
    * For collections sourced from recognized Git platforms (e.g., GitHub), it attempts to use `<username>-<plugin_id>`.
    * For other Git remotes (where username parsing isn't straightforward), it defaults to `<collection_name>-<plugin_id>`.
    * For collections sourced from local paths, it defaults to no prefix (`<plugin_id>`).
    * This default behavior can be overridden by the user with `--prefix <custom_prefix>` or `--no-prefix`.
* **Test Suite Git Isolation:** Test helper functions (`test-helpers.js`) that perform Git operations now configure a dummy `user.name` and `user.email`, and explicitly disable GPG commit signing (`commit.gpgsign false`) for those operations. This prevents tests from using the global Git user configuration and avoids GPG signing prompts, ensuring test reliability and portability.

### Changed (Core Polish Items)

* **Test Suite Refactoring:** The main test file `test/run-cm-tests.js` was refactored into a modular structure. Tests are now organized by command (e.g., `add.test.js`, `list.test.js`) within the `test/` directory and orchestrated by `run-cm-tests.js`. Common test utility functions were extracted into `test/test-helpers.js`.
* **CLI Ergonomics for `enable` command:** The option to specify a custom invocation name for a plugin during enablement was changed from `--as <invoke_name>` to `--name <invoke_name>` for consistency with the `add --name` command. The internal `enablePlugin` and `enableAllPluginsInCollection` methods in `CollectionsManager` were updated accordingly.
* **CLI `list` Command Default Behavior:** The default behavior of `md-to-pdf-cm list` (when no type is specified) now lists all **all** (i.e., available/discovered) plugins from all collections. Previously, it defaulted to listing downloaded collection names.
* **CLI `list` Command Types:** The `list` command's types were refined:
    * `all` (default): Lists all usable plugins found in downloaded collections.
    * `enabled [<collection_name>]`: Lists actively enabled plugins.
    * `disabled [<collection_name>]`: Lists available plugins that are not currently enabled.
    * `collections`: Lists names of all downloaded collection directories (replaces the old `downloaded` type's primary function).
* **CLI Help Text:** Updated descriptions for `enable --all` and `update` commands to clarify that they are point-in-time actions and do not automatically enable new plugins if a collection is updated later. Also updated help for `enable --all` to describe the new origin-dependent default prefixing logic.

### Fixed (Core Polish Items)

* Corrected the `enablePlugin` and `enableAllPluginsInCollection` methods in `CollectionsManager` to properly use the provided option (`options.name`) for setting custom plugin invocation names.


## 0.7.4 (Conceptual - Features for md-to-pdf v0.7.0)

### Added

* **Enable All Plugins in Collection:**
    * Implemented `enableAllPluginsInCollection(<collectionName>, { prefix: string })` method in `CollectionsManager`.
    * Updated the `md-to-pdf-cm enable` CLI command to support `<collection_name> --all [--prefix <prefix_string>]` for batch enabling all available plugins within a specified collection.
    * The `--prefix` option allows prepending a string to the invoke names of all plugins enabled via `--all`.
* **Documentation:**
    * Added `docs/walkthrough.md` to demonstrate adding a collection and using the `enable --all` feature.

### Changed

* Modified the `enable` command in `collections-manager-cli.js` to handle both single plugin enablement and batch enablement via the `--all` flag.
* Updated the help message for the `add` command in `collections-manager-cli.js` to include an example for `enable --all`.
* Enhanced the `list` command in `collections-manager-cli.js` to provide more user-friendly output messages when no items are found for 'downloaded', 'available', or 'enabled' types.

## 0.7.3 (Conceptual - Features for md-to-pdf v0.7.0)

### Added

* **Collection Updates:**
    * Implemented `updateCollection(<collection_name>)` method in `CollectionsManager` to update a single Git-based collection by executing `git pull`.
    * Implemented `updateAllCollections()` method in `CollectionsManager` to iterate through all downloaded collections and update those that are Git-based.
    * Both methods update an `updated_on` timestamp in the collection's `.collection-metadata.yaml` file.
    * Added CLI command `md-to-pdf-cm update [<collection_name>]` to expose this functionality. If `<collection_name>` is omitted, it attempts to update all Git-based collections.
* **Unit Tests:**
    * Added tests for `updateCollection` (updating Git-based, attempting to update local-path, attempting to update non-existent).
    * Added tests for `updateAllCollections` (updating a mix of Git-based and local-path collections).

### Changed

* Modified `addCollection` in `CollectionsManager` to correctly identify local paths ending in `.git` as Git repositories to be cloned, rather than copied. This ensures metadata and subsequent update operations work correctly for collections added from local bare or non-bare Git repositories.
* Refined `updateCollection` and `updateAllCollections` in `CollectionsManager` to ensure they correctly identify Git-based collections for update operations, including those added from local `.git` paths.
* Adjusted test script `run-cm-tests.js` Git helper functions (`setupLocalGitRepo`, `addCommitToLocalGitRepo`) to use `main` as the default branch name instead of `master` for broader compatibility with modern Git defaults.
* Made assertions in `run-cm-tests.js` for update results more precise.


## 0.7.2 (Conceptual - Features for md-to-pdf v0.7.0)

### Added

* **Plugin Disablement:**
    * Implemented `disablePlugin(<invoke_name>)` method in `CollectionsManager` to deactivate a plugin by removing it from the `enabled.yaml` manifest.
    * Added CLI command `md-to-pdf-cm disable <invoke_name>` to expose this functionality.
* **Collection Removal:**
    * Implemented `removeCollection(<collection_name>, { force: boolean })` method in `CollectionsManager`.
    * If `force` is true, any plugins from the collection that are currently enabled will be disabled first, then the collection directory will be removed.
    * If `force` is false and the collection has enabled plugins, an error is thrown.
    * Added CLI command `md-to-pdf-cm remove <collection_name> [--force]` to expose this functionality.
* **Unit Tests:**
    * Added tests for `disablePlugin` (success, disabling non-existent, disabling with empty/no manifest).
    * Added tests for `removeCollection` (success with/without force, attempting to remove non-existent, attempting to remove with enabled plugins without force).

### Changed

* Updated CLI help messages and command lists to include `disable` and `remove`.


## 0.7.1 (Conceptual - Features for md-to-pdf v0.7.0)

### Added

* **Plugin Enablement System:**
    * Implemented `enablePlugin(<collection_name>/<plugin_id>, { as: <invoke_name> })` method in `CollectionsManager` to activate plugins.
    * Creates and manages a `COLL_ROOT/enabled.yaml` manifest file storing details of enabled plugins (collection name, plugin ID, invoke name, absolute config path, added date).
    * `invoke_name` uniqueness is enforced.
    * Enabled plugins in `enabled.yaml` are sorted by `invoke_name` for consistent manifest content.
* **CLI Command `md-to-pdf-cm enable`:**
    * Added `enable <collection_name>/<plugin_id> [--as <invoke_name>]` command to `collections-manager-cli.js`.
* **CLI Command `md-to-pdf-cm list enabled`:**
    * Implemented `list enabled [<collection_name>]` functionality in `CollectionsManager` and `collections-manager-cli.js` to display currently enabled plugins from `enabled.yaml`.
    * Output includes invoke name, original source (collection/plugin ID), config path, and enabled date.
* **Plugin Discovery Refinement:**
    * Plugin discovery logic in `_findPluginsInCollectionDir` now strictly looks for `<pluginId>.config.yaml` or `<pluginId>.yaml` as the plugin's configuration file.
    * Ensured `config_path` returned by `_findPluginsInCollectionDir` is an absolute path.
* **Sorting for Listings:**
    * `listAvailablePlugins` output is now sorted by collection name, then by plugin ID within each collection.
    * `listCollections('downloaded')` output is sorted by collection name.
* **Unit Tests:**
    * Added tests for `enablePlugin` (success, custom invoke name, conflicts, enabling non-available plugin).
    * Added tests for `list enabled` (empty, with items, filtered).
    * Updated test setups in `run-cm-tests.js` to use config filenames (`<pluginId>.config.yaml` or `<pluginId>.yaml`) consistent with the stricter discovery rules.

### Changed

* Updated `_findPluginsInCollectionDir` to strictly look for `<pluginId>.config.yaml` or `<pluginId>.yaml`.
* Unit test `testListAvailablePlugins` updated to reflect stricter plugin config file discovery (expects fewer plugins if non-conformantly named configs were previously counted).


## 0.7.0 (Conceptual - Initial Development for md-to-pdf v0.7.0)

### Added

* **Initial Module Structure:**
    * Created `package.json` for the `CollectionsManager` module, versioned at `0.1.0`.
    * Basic `index.js` with `CollectionsManager` class structure.
    * Dedicated CLI runner `collections-manager-cli.js` using `yargs`.
* **`add <url_or_path>` Command:**
    * Implemented logic to add plugin collections from Git URLs (via `git clone`).
    * Implemented logic to add plugin collections from local filesystem paths (via directory copy).
    * Determines `COLL_ROOT` (defaulting to XDG path, e.g., `~/.local/share/md-to-pdf/collections/`).
    * Ensures `COLL_ROOT` directory exists.
    * Derives collection name if not provided via `--name`.
    * Handles errors if the target directory already exists.
* **`list downloaded` Command:**
    * Implemented logic to list all collections currently present in `COLL_ROOT`.
* **Basic Unit Tests:**
    * Added `test/run-cm-tests.js` for unit/integration testing of `CollectionsManager` class methods.
    * Initial tests cover `addCollection` (Git and local) and `listCollections` (downloaded).
* **CLI Output Coloring:**
    * Integrated `chalk@4.1.2` for colored terminal output in `collections-manager-cli.js` and `index.js`.

### Changed

* Updated `package.json` to include `fs-extra` and `chalk` as dependencies.
* Refined CLI output messages for clarity and guidance.

### Fixed

* Resolved `yargs` configuration issue causing `YError` in `collections-manager-cli.js` by adjusting the `.wrap()` method call.
* Fixed `TypeError: chalk.underline is not a function` by downgrading `chalk` to v4.1.2 for better CommonJS compatibility.
* Ensured `path` module is correctly required in `collections-manager-cli.js`.
