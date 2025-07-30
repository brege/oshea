# E2E Parity Checklist

These are surfaced from `test/config/metadata-level-3.yaml`

### test/runners/e2e/convert.manifest.js
- [ ] `convert.manifest.yaml`
- [ ] 3.1.1 - (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin.
- [ ] 3.1.2 - (Key Option) Successfully converts using a specified plugin via `--plugin`.
- [ ] 3.1.3 - (Key Option) Successfully creates a PDF in a specified directory with `--outdir` and a custom name with `--filename`.
- [ ] 3.1.4 - (Config Precedence) A `md_to_pdf_plugin` key in front matter is correctly used for conversion.
- [ ] 3.1.5 - (Config Precedence) A `--plugin` CLI flag correctly overrides a plugin specified in front matter.
- [ ] 3.1.6 - (Sad Path) Fails with a non-zero exit code when the input `<file>` does not exist.
- [ ] 3.1.7 - (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified with `--plugin`.

### test/runners/e2e/generate.manifest.js
- [ ] `generate.manifest.yaml`
- [ ] 3.2.1 - (Happy Path) Successfully generates an artifact using a known generator plugin (e.g., `recipe-book`).
- [ ] 3.2.2 - (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing.

### test/runners/e2e/config.manifest.js
- [x] `config.manifest.yaml`
- [x] 3.3.1 - (Happy Path) Correctly displays the global configuration.
- [x] 3.3.2 - (Key Option) Correctly displays the merged configuration for a specific plugin using `--plugin`.
- [x] 3.3.3 - (Key Option) Correctly outputs clean YAML when using the `--pure` flag.

### test/runners/e2e/plugin.manifest.js
- [x] `plugin-list.manifest.yaml`
- [x] 3.4.1 - Correctly lists plugins with the default (`--all`) filter.
- [x] 3.4.2 - Correctly filters for enabled plugins with `--enabled`.
- [x] 3.4.3 - Correctly filters for disabled plugins with `--disabled`.
- [x] 3.4.4 - Correctly filters for all available plugins with `--available`.

### test/runners/e2e/plugin-create.manifest.js
- [ ] `plugin-create.manifest.yaml`
- [ ] 3.5.1 - (Happy Path) Successfully creates a new plugin directory with boilerplate files.
- [ ] 3.5.2 - (Key Option) Successfully archetypes a new plugin from a source with `--from`.
- [ ] 3.5.3 - (Happy Path) A plugin created from the default template passes validation.
- [ ] 3.5.4 - (Happy Path) A plugin archetyped from a valid bundled plugin passes validation.

### test/runners/e2e/plugin-add.manifest.js
- [ ] `plugin-add.manifest.yaml`
- [ ] 3.6.1 - (Happy Path) Successfully adds and enables a singleton plugin from a local path.

### test/runners/e2e/plugin-enable.manifest.js
- [ ] `plugin-enable.manifest.yaml`
- [ ] 3.7.1 - (Happy Path) Successfully enables a plugin from a collection.
- [ ] 3.7.2 - (Happy Path) The `plugin enable` command successfully enables a valid plugin.
- [ ] 3.7.3 - (Sad Path) The `plugin enable` command fails to enable an invalid plugin and reports validation errors.

### test/runners/e2e/plugin-disable.manifest.js
- [ ] `plugin-disable.manifest.yaml`
- [ ] 3.8.1 - (Happy Path) Successfully disables an enabled plugin.

### test/runners/e2e/plugin-validate.manifest.js
- [ ] `plugin-validate.manifest.yaml`
- [ ] 3.9.1 - (Happy Path) Successfully validates a well-formed plugin directory.
- [ ] 3.9.2 - (Sad Path) Fails validation for a poorly-formed plugin directory.

### test/runners/e2e/collection-add.manifest.js
- [ ] `collection-add.manifest.yaml`
- [ ] 3.10.1 - (Happy Path) Successfully adds a collection from a git URL.
- [ ] 3.10.2 - (Input Variation) Successfully adds a collection from a local directory path.
- [ ] 3.10.3 - (Sad Path) Fails with a non-zero exit code when the source is invalid.

### test/runners/e2e/collection-list.manifest.js
- [x] `collection-list.manifest.yaml`
- [x] 3.11.1 - (Happy Path) Correctly lists all added collections.

### test/runners/e2e/collection-remove.manifest.js
- [ ] `collection-remove.manifest.yaml`
- [ ] 3.12.1 - (Happy Path) Successfully removes an added collection.

### test/runners/e2e/collection-update.manifest.js
- [ ] `collection-update.manifest.yaml`
- [ ] 3.13.1 - (Happy Path) Successfully runs the update process on all collections.
- [ ] 3.13.2 - (Key Option) Successfully runs the update process on a single named collection.
- [ ] 3.14.1 - (Alias) The `update` alias successfully runs the collection update process.

### test/runners/e2e/global-flags.manifest.js
- [x] `global-flags.manifest.yaml`
- [x] 3.15.1 - The `--version` flag correctly displays the tool's version.
- [x] 3.15.2 - The `--help` flag correctly displays the help text.
- [ ] 3.15.3 - (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message.

### <plugin remove> (new)
- [ ] `plugin-remove.manifest.yaml`

