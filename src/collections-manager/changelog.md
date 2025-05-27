# Changelog - md-to-pdf Collections Manager

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
