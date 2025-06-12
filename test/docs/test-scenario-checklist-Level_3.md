# Level 3 - Test Scenario Checklist

This checklist guides the implementation of End-to-End (E2E) CLI integration tests. Status Legend:
[ ] Proposed,
[x] Completed (test implemented \& passing),
[S] Skipped by User,
[?] Pending (see audit log for details).

## Test Target ID Mapping for Level 3

* **Y.01:** `convert` command
* **Y.02:** `generate` command
* **Y.03:** `config` command
* **Y.04:** `plugin list` command
* **Y.05:** `plugin create` command
* **Y.06:** `plugin add` command
* **Y.07:** `plugin enable` command
* **Y.08:** `plugin disable` command
* **Y.09:** `plugin validate` command
* **Y.10:** `collection add` command
* **Y.11:** `collection list` command
* **Y.12:** `collection remove` command
* **Y.13:** `collection update` command
* **Y.14:** `update` (alias) command
* **Y.15:** `Global Flags` (`--help`, `--version`, etc.)

---

## Y.01. `convert` Command

* [x] 3.1.1 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin.

* [x] 3.1.2 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Successfully converts using a specified plugin via `--plugin`.

* [x] 3.1.3 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Successfully creates a PDF in a specified directory with `--outdir` and a custom name with `--filename`.

* [x] 3.1.4 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Config Precedence) A `md_to_pdf_plugin` key in front matter is correctly used for conversion.

* [x] 3.1.5 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Config Precedence) A `--plugin` CLI flag correctly overrides a plugin specified in front matter.

* [x] 3.1.6 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) Fails with a non-zero exit code when the input `<file>` does not exist.

* [x] 3.1.7 **TEST_TARGET**: `convert`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified with `--plugin`.


## Y.02. `generate` Command

* [x] 3.2.1 **TEST_TARGET**: `generate`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully generates an artifact using a known generator plugin (e.g., `recipe-book`).

* [x] 3.2.2 **TEST_TARGET**: `generate`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing.


## Y.03. `config` Command

* [x] 3.3.1 **TEST_TARGET**: `config`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Correctly displays the global configuration.

* [x] 3.3.2 **TEST_TARGET**: `config`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Correctly displays the merged configuration for a specific plugin using `--plugin`.

* [x] 3.3.3 **TEST_TARGET**: `config`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Correctly outputs clean YAML when using the `--pure` flag.


## Y.04. `plugin list` Command

* [x] 3.4.1 **TEST_TARGET**: `plugin list`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: Correctly lists plugins with the default (`--all`) filter.

* [x] 3.4.2 **TEST_TARGET**: `plugin list`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: Correctly filters for enabled plugins with `--enabled`.

* [x] 3.4.3 **TEST_TARGET**: `plugin list`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: Correctly filters for disabled plugins with `--disabled`.

* [x] 3.4.4 **TEST_TARGET**: `plugin list`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: Correctly filters for all available plugins with `--available`.


## Y.05. `plugin create` Command

* [x] 3.5.1 **TEST_TARGET**: `plugin create`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully creates a new plugin directory with boilerplate files.

* [x] 3.5.2 **TEST_TARGET**: `plugin create`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Successfully archetypes a new plugin from a source with `--from`.


## Y.06. `plugin add` Command

* [x] 3.6.1 **TEST_TARGET**: `plugin add`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully adds and enables a singleton plugin from a local path.


## Y.07. `plugin enable` Command

* [x] 3.7.1 **TEST_TARGET**: `plugin enable`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully enables a plugin from a collection.


## Y.08. `plugin disable` Command

* [x] 3.8.1 **TEST_TARGET**: `plugin disable`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully disables an enabled plugin.


## Y.09. `plugin validate` Command

* [x] 3.9.1 **TEST_TARGET**: `plugin validate`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully validates a well-formed plugin directory.

* [x] 3.9.2 **TEST_TARGET**: `plugin validate`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) Fails validation for a poorly-formed plugin directory.


## Y.10. `collection add` Command

* [x] 3.10.1 **TEST_TARGET**: `collection add`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully adds a collection from a git URL.

* [x] 3.10.2 **TEST_TARGET**: `collection add`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Input Variation) Successfully adds a collection from a local directory path.

* [x] 3.10.3 **TEST_TARGET**: `collection add`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) Fails with a non-zero exit code when the source is invalid.


## Y.11. `collection list` Command

* [x] 3.11.1 **TEST_TARGET**: `collection list`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Correctly lists all added collections.


## Y.12. `collection remove` Command

* [x] 3.12.1 **TEST_TARGET**: `collection remove`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully removes an added collection.


## Y.13. `collection update` Command

* [x] 3.13.1 **TEST_TARGET**: `collection update`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Happy Path) Successfully runs the update process on all collections.

* [x] 3.13.2 **TEST_TARGET**: `collection update`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Key Option) Successfully runs the update process on a single named collection.


## Y.14. `update` (alias) Command

* [x] 3.14.1 **TEST_TARGET**: `update`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Alias) The `update` alias successfully runs the collection update process.


## Y.15. Global Flags

* [x] 3.15.1 **TEST_TARGET**: `Global Flags`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: The `--version` flag correctly displays the tool's version.

* [x] 3.15.2 **TEST_TARGET**: `Global Flags`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: The `--help` flag correctly displays the help text.

* [x] 3.15.3 **TEST_TARGET**: `Global Flags`
**TEST_TYPE**: `E2E_CLI`
**SCENARIO_DESCRIPTION**: (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message.
