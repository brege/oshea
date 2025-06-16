## Y.01. `convert` Command

* [x] 3.1.1 (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin.
  - **test_id:** 3.1.1
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin.

* [x] 3.1.2 (Key Option) Successfully converts using a specified plugin via `--plugin`.
  - **test_id:** 3.1.2
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Successfully converts using a specified plugin via `--plugin`.

* [x] 3.1.3 (Key Option) Successfully creates a PDF in a specified directory with `--outdir` and a custom name with `--filename`.
  - **test_id:** 3.1.3
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Successfully creates a PDF in a specified directory with `--outdir` and a custom name with `--filename`.

* [x] 3.1.4 (Config Precedence) A `md_to_pdf_plugin` key in front matter is correctly used for conversion.
  - **test_id:** 3.1.4
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Config Precedence) A `md_to_pdf_plugin` key in front matter is correctly used for conversion.

* [x] 3.1.5 (Config Precedence) A `--plugin` CLI flag correctly overrides a plugin specified in front matter.
  - **test_id:** 3.1.5
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Config Precedence) A `--plugin` CLI flag correctly overrides a plugin specified in front matter.

* [x] 3.1.6 (Sad Path) Fails with a non-zero exit code when the input `<file>` does not exist.
  - **test_id:** 3.1.6
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) Fails with a non-zero exit code when the input `<file>` does not exist.

* [x] 3.1.7 (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified with `--plugin`.
  - **test_id:** 3.1.7
  - **status:** CLOSED
  - **test_target:** convert
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified with `--plugin`.

## Y.02. `generate` Command

* [x] 3.2.1 (Happy Path) Successfully generates an artifact using a known generator plugin (e.g., `recipe-book`).
  - **test_id:** 3.2.1
  - **status:** CLOSED
  - **test_target:** generate
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully generates an artifact using a known generator plugin (e.g., `recipe-book`).

* [x] 3.2.2 (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing.
  - **test_id:** 3.2.2
  - **status:** CLOSED
  - **test_target:** generate
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing.

## Y.03. `config` Command

* [x] 3.3.1 (Happy Path) Correctly displays the global configuration.
  - **test_id:** 3.3.1
  - **status:** CLOSED
  - **test_target:** config
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Correctly displays the global configuration.

* [x] 3.3.2 (Key Option) Correctly displays the merged configuration for a specific plugin using `--plugin`.
  - **test_id:** 3.3.2
  - **status:** CLOSED
  - **test_target:** config
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Correctly displays the merged configuration for a specific plugin using `--plugin`.

* [x] 3.3.3 (Key Option) Correctly outputs clean YAML when using the `--pure` flag.
  - **test_id:** 3.3.3
  - **status:** CLOSED
  - **test_target:** config
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Correctly outputs clean YAML when using the `--pure` flag.

## Y.04. `plugin list` Command

* [x] 3.4.1 Correctly lists plugins with the default (`--all`) filter.
  - **test_id:** 3.4.1
  - **status:** CLOSED
  - **test_target:** plugin list
  - **test_type:** E2E_CLI
  - **description:** Correctly lists plugins with the default (`--all`) filter.

* [x] 3.4.2 Correctly filters for enabled plugins with `--enabled`.
  - **test_id:** 3.4.2
  - **status:** CLOSED
  - **test_target:** plugin list
  - **test_type:** E2E_CLI
  - **description:** Correctly filters for enabled plugins with `--enabled`.

* [x] 3.4.3 Correctly filters for disabled plugins with `--disabled`.
  - **test_id:** 3.4.3
  - **status:** CLOSED
  - **test_target:** plugin list
  - **test_type:** E2E_CLI
  - **description:** Correctly filters for disabled plugins with `--disabled`.

* [x] 3.4.4 Correctly filters for all available plugins with `--available`.
  - **test_id:** 3.4.4
  - **status:** CLOSED
  - **test_target:** plugin list
  - **test_type:** E2E_CLI
  - **description:** Correctly filters for all available plugins with `--available`.

## Y.05. `plugin create` Command

* [x] 3.5.1 (Happy Path) Successfully creates a new plugin directory with boilerplate files.
  - **test_id:** 3.5.1
  - **status:** CLOSED
  - **test_target:** plugin create
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully creates a new plugin directory with boilerplate files.

* [x] 3.5.2 (Key Option) Successfully archetypes a new plugin from a source with `--from`.
  - **test_id:** 3.5.2
  - **status:** CLOSED
  - **test_target:** plugin create
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Successfully archetypes a new plugin from a source with `--from`.

## Y.06. `plugin add` Command

* [x] 3.6.1 (Happy Path) Successfully adds and enables a singleton plugin from a local path.
  - **test_id:** 3.6.1
  - **status:** CLOSED
  - **test_target:** plugin add
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully adds and enables a singleton plugin from a local path.

## Y.07. `plugin enable` Command

* [x] 3.7.1 (Happy Path) Successfully enables a plugin from a collection.
  - **test_id:** 3.7.1
  - **status:** CLOSED
  - **test_target:** plugin enable
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully enables a plugin from a collection.

## Y.08. `plugin disable` Command

* [x] 3.8.1 (Happy Path) Successfully disables an enabled plugin.
  - **test_id:** 3.8.1
  - **status:** CLOSED
  - **test_target:** plugin disable
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully disables an enabled plugin.

## Y.09. `plugin validate` Command

* [x] 3.9.1 (Happy Path) Successfully validates a well-formed plugin directory.
  - **test_id:** 3.9.1
  - **status:** CLOSED
  - **test_target:** plugin validate
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully validates a well-formed plugin directory.

* [x] 3.9.2 (Sad Path) Fails validation for a poorly-formed plugin directory.
  - **test_id:** 3.9.2
  - **status:** CLOSED
  - **test_target:** plugin validate
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) Fails validation for a poorly-formed plugin directory.

## Y.10. `collection add` Command

* [x] 3.10.1 (Happy Path) Successfully adds a collection from a git URL.
  - **test_id:** 3.10.1
  - **status:** CLOSED
  - **test_target:** collection add
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully adds a collection from a git URL.

* [x] 3.10.2 (Input Variation) Successfully adds a collection from a local directory path.
  - **test_id:** 3.10.2
  - **status:** CLOSED
  - **test_target:** collection add
  - **test_type:** E2E_CLI
  - **description:** (Input Variation) Successfully adds a collection from a local directory path.

* [x] 3.10.3 (Sad Path) Fails with a non-zero exit code when the source is invalid.
  - **test_id:** 3.10.3
  - **status:** CLOSED
  - **test_target:** collection add
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) Fails with a non-zero exit code when the source is invalid.

## Y.11. `collection list` Command

* [x] 3.11.1 (Happy Path) Correctly lists all added collections.
  - **test_id:** 3.11.1
  - **status:** CLOSED
  - **test_target:** collection list
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Correctly lists all added collections.

## Y.12. `collection remove` Command

* [x] 3.12.1 (Happy Path) Successfully removes an added collection.
  - **test_id:** 3.12.1
  - **status:** CLOSED
  - **test_target:** collection remove
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully removes an added collection.

## Y.13. `collection update` Command

* [x] 3.13.1 (Happy Path) Successfully runs the update process on all collections.
  - **test_id:** 3.13.1
  - **status:** CLOSED
  - **test_target:** collection update
  - **test_type:** E2E_CLI
  - **description:** (Happy Path) Successfully runs the update process on all collections.

* [x] 3.13.2 (Key Option) Successfully runs the update process on a single named collection.
  - **test_id:** 3.13.2
  - **status:** CLOSED
  - **test_target:** collection update
  - **test_type:** E2E_CLI
  - **description:** (Key Option) Successfully runs the update process on a single named collection.

## Y.14. `update` (alias) Command

* [x] 3.14.1 (Alias) The `update` alias successfully runs the collection update process.
  - **test_id:** 3.14.1
  - **status:** CLOSED
  - **test_target:** update
  - **test_type:** E2E_CLI
  - **description:** (Alias) The `update` alias successfully runs the collection update process.

## Y.15. Global Flags

* [x] 3.15.1 The `--version` flag correctly displays the tool's version.
  - **test_id:** 3.15.1
  - **status:** CLOSED
  - **test_target:** Global Flags
  - **test_type:** E2E_CLI
  - **description:** The `--version` flag correctly displays the tool's version.

* [x] 3.15.2 The `--help` flag correctly displays the help text.
  - **test_id:** 3.15.2
  - **status:** CLOSED
  - **test_target:** Global Flags
  - **test_type:** E2E_CLI
  - **description:** The `--help` flag correctly displays the help text.

* [x] 3.15.3 (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message.
  - **test_id:** 3.15.3
  - **status:** CLOSED
  - **test_target:** Global Flags
  - **test_type:** E2E_CLI
  - **description:** (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message.
