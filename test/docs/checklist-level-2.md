## Y.1. collections-manager File -- `src/collections-manager/index.js`

### Function -- `constructor( ... )`

* [x] 2.1.1 Verify the constructor correctly initializes file paths (`cmCollRoot`, `cmMainManifestPath`, `cmEnabledManifestPath`) based on `projectRoot` and `XDG_DATA_HOME`.
  - **test_id:** 2.1.1
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify the constructor correctly initializes file paths (`cmCollRoot`, `cmMainManifestPath`, `cmEnabledManifestPath`) based on `projectRoot` and `XDG_DATA_HOME`.

* [x] 2.1.2 Verify the constructor correctly prioritizes the CLI override (`collRootCliOverride`) for setting the `collRoot` path over all other methods (environment variables, config files, or defaults).
  - **test_id:** 2.1.2
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify the constructor correctly prioritizes the CLI override (`collRootCliOverride`) for setting the `collRoot` path over all other methods (environment variables, config files, or defaults).

### Function -- `addCollection( ... )`

* [x] 2.1.3 Verify `addCollection` successfully clones a Git repository or downloads a zip file, creates the collection directory, and updates `cm-main.yaml`.
  - **test_id:** 2.1.3
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `addCollection` successfully clones a Git repository or downloads a zip file, creates the collection directory, and updates `cm-main.yaml`.

* [x] 2.1.4 Test `addCollection` handles attempts to add a collection with a name that already exists, preventing duplication.
  - **test_id:** 2.1.4
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `addCollection` handles attempts to add a collection with a name that already exists, preventing duplication.

* [x] 2.1.5 Verify `addCollection` gracefully handles invalid source URLs or paths, reporting appropriate errors.
  - **test_id:** 2.1.5
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `addCollection` gracefully handles invalid source URLs or paths, reporting appropriate errors.

* [x] 2.1.6 Test `addCollection` correctly uses `cm-utils.deriveCollectionName` to sanitize the collection name.
  - **test_id:** 2.1.6
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `addCollection` correctly uses `cm-utils.deriveCollectionName` to sanitize the collection name.

### Function -- `removeCollection( ... )`

* [x] 2.1.7 Verify `removeCollection` successfully removes a collection entry from `cm-main.yaml` and deletes its corresponding directory.
  - **test_id:** 2.1.7
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `removeCollection` successfully removes a collection entry from `cm-main.yaml` and deletes its corresponding directory.

* [x] 2.1.8 Test `removeCollection` gracefully handles attempts to remove a non-existent collection.
  - **test_id:** 2.1.8
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `removeCollection` gracefully handles attempts to remove a non-existent collection.

* [x] 2.1.9 Verify `removeCollection` handles cases where the collection's directory cannot be deleted (e.g., due to permissions), logging an error but still updating the manifest.
  - **test_id:** 2.1.9
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `removeCollection` handles cases where the collection's directory cannot be deleted (e.g., due to permissions), logging an error but still updating the manifest.

### Function -- `updateCollection( ... )`

* [x] 2.1.10 Test `updateCollection` successfully pulls updates for a Git-sourced collection.
  - **test_id:** 2.1.10
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `updateCollection` successfully pulls updates for a Git-sourced collection.

* [x] 2.1.11 Verify `updateCollection` gracefully handles updating a non-existent collection.
  - **test_id:** 2.1.11
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `updateCollection` gracefully handles updating a non-existent collection.

* [x] 2.1.12 Test `updateCollection` handles update failures (e.g., network issues, conflicts) for a Git-sourced collection.
  - **test_id:** 2.1.12
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `updateCollection` handles update failures (e.g., network issues, conflicts) for a Git-sourced collection.

### Function -- `listCollections( ... )`

* [x] 2.1.13 Verify `listCollections` returns a comprehensive list of all collections from `cm-main.yaml` when `filter` is 'all', including their enabled status from `enabled.yaml`.
  - **test_id:** 2.1.13
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `listCollections` returns a comprehensive list of all collections from `cm-main.yaml` when `filter` is 'all', including their enabled status from `enabled.yaml`.

* [x] 2.1.14 Test `listCollections` correctly filters and returns only 'enabled' collections when `filter` is 'enabled'.
  - **test_id:** 2.1.14
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `listCollections` correctly filters and returns only 'enabled' collections when `filter` is 'enabled'.

* [x] 2.1.15 Verify `listCollections` correctly filters and returns only 'disabled' collections when `filter` is 'disabled'.
  - **test_id:** 2.1.15
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `listCollections` correctly filters and returns only 'disabled' collections when `filter` is 'disabled'.

* [x] 2.1.16 Test `listCollections` handles cases where `cm-main.yaml` or `enabled.yaml` are missing or empty.
  - **test_id:** 2.1.16
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `listCollections` handles cases where `cm-main.yaml` or `enabled.yaml` are missing or empty.

### Function -- `enablePlugin( ... )`

* [x] 2.1.17 Verify `enablePlugin` successfully adds a plugin to `enabled.yaml` with the specified `invokeName`, `collectionName`, and `pluginId`, ensuring the plugin's config path is resolved and valid.
  - **test_id:** 2.1.17
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `enablePlugin` successfully adds a plugin to `enabled.yaml` with the specified `invokeName`, `collectionName`, and `pluginId`, ensuring the plugin's config path is resolved and valid.

* [x] 2.1.18 Test `enablePlugin` correctly prevents enabling a plugin if the `invokeName` already exists in `enabled.yaml`.
  - **test_id:** 2.1.18
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `enablePlugin` correctly prevents enabling a plugin if the `invokeName` already exists in `enabled.yaml`.

* [x] 2.1.19 Verify `enablePlugin` handles attempts to enable a plugin that does not exist within the specified collection.
  - **test_id:** 2.1.19
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `enablePlugin` handles attempts to enable a plugin that does not exist within the specified collection.

* [x] 2.1.20 Test `enablePlugin` correctly uses `cm-utils.isValidPluginName` to validate the `invokeName`.
  - **test_id:** 2.1.20
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `enablePlugin` correctly uses `cm-utils.isValidPluginName` to validate the `invokeName`.

* [x] 2.1.21 Verify `enablePlugin` handles cases where the plugin's resolved config path does not exist.
  - **test_id:** 2.1.21
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `enablePlugin` handles cases where the plugin's resolved config path does not exist.

### Function -- `disablePlugin( ... )`

* [x] 2.1.22 Test `disablePlugin` successfully removes a plugin entry from `enabled.yaml` based on its `invokeName`.
  - **test_id:** 2.1.22
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `disablePlugin` successfully removes a plugin entry from `enabled.yaml` based on its `invokeName`.

* [x] 2.1.23 Verify `disablePlugin` gracefully handles attempts to disable a non-existent `invokeName`.
  - **test_id:** 2.1.23
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `disablePlugin` gracefully handles attempts to disable a non-existent `invokeName`.

### Function -- `listAvailablePlugins( ... )`

* [x] 2.1.24 Test `listAvailablePlugins` correctly scans all collections for `*.config.yaml` files and extracts available plugin details (name, description, configPath).
  - **test_id:** 2.1.24
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `listAvailablePlugins` correctly scans all collections for `*.config.yaml` files and extracts available plugin details (name, description, configPath).

* [x] 2.1.25 Verify `listAvailablePlugins` correctly filters results when a `collectionName` is provided.
  - **test_id:** 2.1.25
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `listAvailablePlugins` correctly filters results when a `collectionName` is provided.

* [x] 2.1.26 Test `listAvailablePlugins` handles collections that are empty or do not contain valid plugin configuration files.
  - **test_id:** 2.1.26
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `listAvailablePlugins` handles collections that are empty or do not contain valid plugin configuration files.

* [x] 2.1.27 Verify `listAvailablePlugins` gracefully handles collections directories that are unreadable or corrupt.
  - **test_id:** 2.1.27
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `listAvailablePlugins` gracefully handles collections directories that are unreadable or corrupt.

* [x] 2.1.28 Test `listAvailablePlugins` correctly extracts the `description` from the plugin's configuration file.
  - **test_id:** 2.1.28
  - **status:** CLOSED
  - **test_target:** collections-manager
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `listAvailablePlugins` correctly extracts the `description` from the plugin's configuration file.

## Y.2. default_handler File -- `src/default_handler.js`

### Function -- `handle( ... )`

* [x] 2.2.1 Verify the `handle` function successfully processes a basic Markdown file, extracts front matter, renders HTML, applies default CSS, and generates a PDF.
  - **test_id:** 2.2.1
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify the `handle` function successfully processes a basic Markdown file, extracts front matter, renders HTML, applies default CSS, and generates a PDF.

* [x] 2.2.2 Test `handle` correctly removes shortcodes from Markdown content before rendering.
  - **test_id:** 2.2.2
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` correctly removes shortcodes from Markdown content before rendering.

* [x] 2.2.3 Verify `handle` correctly substitutes placeholders in Markdown content before rendering.
  - **test_id:** 2.2.3
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` correctly substitutes placeholders in Markdown content before rendering.

* [x] 2.2.4 Test `handle` correctly applies `pluginSpecificConfig.markdown_it_options` to the MarkdownIt instance.
  - **test_id:** 2.2.4
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` correctly applies `pluginSpecificConfig.markdown_it_options` to the MarkdownIt instance.

* [x] 2.2.5 Verify `handle` integrates math rendering by calling `math_integration.configureMarkdownItForMath` and `math_integration.getMathCssContent` when configured.
  - **test_id:** 2.2.5
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` integrates math rendering by calling `math_integration.configureMarkdownItForMath` and `math_integration.getMathCssContent` when configured.

* [x] 2.2.6 Test `handle` correctly applies `markdown-it-anchor` and `markdown-it-table-of-contents` when configured in `pluginSpecificConfig`.
  - **test_id:** 2.2.6
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` correctly applies `markdown-it-anchor` and `markdown-it-table-of-contents` when configured in `pluginSpecificConfig`.

* [x] 2.2.7 Verify `handle` correctly integrates custom MarkdownIt plugins specified in `pluginSpecificConfig.markdown_it_plugins`.
  - **test_id:** 2.2.7
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` correctly integrates custom MarkdownIt plugins specified in `pluginSpecificConfig.markdown_it_plugins`.

* [x] 2.2.8 Test `handle` resolves and merges CSS files from `pluginSpecificConfig.css_files` and `raw_css_files`, injecting them into the HTML output.
  - **test_id:** 2.2.8
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` resolves and merges CSS files from `pluginSpecificConfig.css_files` and `raw_css_files`, injecting them into the HTML output.

* [x] 2.2.9 Verify `handle` correctly loads and uses a custom HTML template specified by `pluginSpecificConfig.html_template_path`.
  - **test_id:** 2.2.9
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` correctly loads and uses a custom HTML template specified by `pluginSpecificConfig.html_template_path`.

* [x] 2.2.10 Test `handle` correctly injects `head_html`, `body_html_start`, and `body_html_end` from `pluginSpecificConfig` into the HTML template.
  - **test_id:** 2.2.10
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` correctly injects `head_html`, `body_html_start`, and `body_html_end` from `pluginSpecificConfig` into the HTML template.

* [x] 2.2.11 Verify `handle` correctly determines the output filename based on `outputFilenameOpt`, front matter, or the input Markdown file name.
  - **test_id:** 2.2.11
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` correctly determines the output filename based on `outputFilenameOpt`, front matter, or the input Markdown file name.

* [x] 2.2.12 Test `handle` gracefully manages errors during Markdown file reading, returning `null`.
  - **test_id:** 2.2.12
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` gracefully manages errors during Markdown file reading, returning `null`.

* [x] 2.2.13 Verify `handle` calls `pdfGenerator.generatePdf` with the correctly prepared HTML content and PDF options.
  - **test_id:** 2.2.13
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` calls `pdfGenerator.generatePdf` with the correctly prepared HTML content and PDF options.

* [x] 2.2.14 Test `handle` correctly applies the `lang` attribute from front matter to the HTML `<html>` tag.
  - **test_id:** 2.2.14
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` correctly applies the `lang` attribute from front matter to the HTML `<html>` tag.

* [x] 2.2.15 Verify `handle` correctly handles `omit_title_heading` to prevent the title heading from being rendered when true.
  - **test_id:** 2.2.15
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `handle` correctly handles `omit_title_heading` to prevent the title heading from being rendered when true.

* [x] 2.2.16 Test `handle` returns `null` and logs an error if any critical step in the pipeline (e.g., HTML rendering, PDF generation) fails.
  - **test_id:** 2.2.16
  - **status:** CLOSED
  - **test_target:** default_handler
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `handle` returns `null` and logs an error if any critical step in the pipeline (e.g., HTML rendering, PDF generation) fails.

## Y.3. pdf_generator File -- `src/pdf_generator.js`

### Function -- `generatePdf( ... )`

* [x] 2.3.1 Verify `generatePdf` successfully launches Puppeteer, navigates to a blank page, sets HTML content, and generates a PDF file to the specified output path.
  - **test_id:** 2.3.1
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `generatePdf` successfully launches Puppeteer, navigates to a blank page, sets HTML content, and generates a PDF file to the specified output path.

* [x] 2.3.2 Test `generatePdf` correctly applies various `pdfOptions` such as `format`, `printBackground`, and `scale`.
  - **test_id:** 2.3.2
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `generatePdf` correctly applies various `pdfOptions` such as `format`, `printBackground`, and `scale`.

* [x] 2.3.3 Verify `generatePdf` correctly applies `margin` options (top, bottom, left, right) from `pdfOptions`.
  - **test_id:** 2.3.3
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `generatePdf` correctly applies `margin` options (top, bottom, left, right) from `pdfOptions`.

* [x] 2.3.4 Test `generatePdf` injects `cssContent` into the generated HTML page before rendering the PDF.
  - **test_id:** 2.3.4
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `generatePdf` injects `cssContent` into the generated HTML page before rendering the PDF.

* [x] 2.3.5 Verify `generatePdf` correctly handles header and footer templates, including dynamic fields, when provided in `pdfOptions`.
  - **test_id:** 2.3.5
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `generatePdf` correctly handles header and footer templates, including dynamic fields, when provided in `pdfOptions`.

* [x] 2.3.6 Test `generatePdf` returns `null` and logs an error if Puppeteer fails to launch (e.g., executable not found).
  - **test_id:** 2.3.6
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `generatePdf` returns `null` and logs an error if Puppeteer fails to launch (e.g., executable not found).

* [x] 2.3.7 Verify `generatePdf` returns `null` and logs an error if setting page content fails.
  - **test_id:** 2.3.7
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `generatePdf` returns `null` and logs an error if setting page content fails.

* [x] 2.3.8 Test `generatePdf` returns `null` and logs an error if PDF generation itself fails (e.g., invalid `pdfOptions`).
  - **test_id:** 2.3.8
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `generatePdf` returns `null` and logs an error if PDF generation itself fails (e.g., invalid `pdfOptions`).

* [x] 2.3.9 Verify `generatePdf` ensures the browser and page are properly closed after PDF generation, even if errors occur.
  - **test_id:** 2.3.9
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify `generatePdf` ensures the browser and page are properly closed after PDF generation, even if errors occur.

* [x] 2.3.10 Test `generatePdf` correctly handles empty or null `htmlContent` and `cssContent` without crashing.
  - **test_id:** 2.3.10
  - **status:** CLOSED
  - **test_target:** pdf_generator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test `generatePdf` correctly handles empty or null `htmlContent` and `cssContent` without crashing.

## Y.4. plugin_validator File -- `src/plugin-validator.js`

### Function -- `validate( ... )`

* [x] 2.4.1 Verify a fully compliant v1 plugin (all files, passing tests, successful self-activation) is reported as `VALID` with no errors or warnings.
  - **test_id:** 2.4.1
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify a fully compliant v1 plugin (all files, passing tests, successful self-activation) is reported as `VALID` with no errors or warnings.

* [x] 2.4.2 Test that a plugin with an unsupported protocol (e.g., `v2`) is reported as `INVALID` with a clear error message.
  - **test_id:** 2.4.2
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test that a plugin with an unsupported protocol (e.g., `v2`) is reported as `INVALID` with a clear error message.

* [x] 2.4.3 Verify that a plugin whose directory name does not match the `plugin_name` in its metadata is reported as `INVALID` with a critical mismatch error.
  - **test_id:** 2.4.3
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify that a plugin whose directory name does not match the `plugin_name` in its metadata is reported as `INVALID` with a critical mismatch error.

* [x] 2.4.4 Test the metadata resolution precedence: `protocol` from `.schema.json` should be used even if different values exist in `.config.yaml` and `README.md`.
  - **test_id:** 2.4.4
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test the metadata resolution precedence: `protocol` from `.schema.json` should be used even if different values exist in `.config.yaml` and `README.md`.

* [x] 2.4.5 Test that a plugin missing a `protocol` in all its metadata files defaults to `v1` and is reported as `USABLE (with warnings)`.
  - **test_id:** 2.4.5
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test that a plugin missing a `protocol` in all its metadata files defaults to `v1` and is reported as `USABLE (with warnings)`.

* [x] 2.4.6 Verify that a plugin with a missing required file (e.g., `index.js`) is reported as `INVALID`.
  - **test_id:** 2.4.6
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify that a plugin with a missing required file (e.g., `index.js`) is reported as `INVALID`.

* [x] 2.4.7 Test that a plugin with a missing optional file (e.g., `test/cv-e2e.test.js` or `cv.schema.json`) is reported as `USABLE (with warnings)`.
  - **test_id:** 2.4.7
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test that a plugin with a missing optional file (e.g., `test/cv-e2e.test.js` or `cv.schema.json`) is reported as `USABLE (with warnings)`.

* [x] 2.4.8 Verify that a plugin whose co-located E2E test fails when executed is reported as `INVALID`.
  - **test_id:** 2.4.8
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Verify that a plugin whose co-located E2E test fails when executed is reported as `INVALID`.

* [x] 2.4.9 Test that a plugin whose self-activation sanity check fails (e.g., the CLI command returns an error) is reported as `INVALID`.
  - **test_id:** 2.4.9
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test that a plugin whose self-activation sanity check fails (e.g., the CLI command returns an error) is reported as `INVALID`.

* [x] 2.4.10 Test a plugin with malformed YAML in its `README.md` front matter, which should result in a `USABLE (with warnings)` status, assuming other checks pass.
  - **test_id:** 2.4.10
  - **status:** CLOSED
  - **test_target:** plugin-validator
  - **test_type:** SUBSYSTEM_INTEGRATION
  - **description:** Test a plugin with malformed YAML in its `README.md` front matter, which should result in a `USABLE (with warnings)` status, assuming other checks pass.
