Here is the Y.1 section for `src/collections-manager/index.js`, adding Level 2 test scenarios to the checklist.

# Level 2 - Test Scenario Checklist

This checklist guides the automatic generation of test cases. Status Legend: 
[ ] Proposed, 
[x] Completed (test generated & accepted), 
[S] Skipped by User,
[?] Pending (see audit log for details).

## Test Target ID Mapping for Level 2:
* **Y.1:** `collections-manager` (from `src/collections-manager/index.js`)
* **Y.2:** `default_handler` (from `src/default_handler.js`)
* **Y.3:** `pdf_generator` (from `src/pdf_generator.js`)

---

## Y.1. collections-manager File -- `src/collections-manager/index.js`

### Function -- `constructor( ... )`

* [x] 2.1.1 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify the constructor correctly initializes file paths (`cmCollRoot`, `cmMainManifestPath`, `cmEnabledManifestPath`) based on `projectRoot` and `XDG_DATA_HOME`.
* [x] 2.1.2 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify the constructor correctly prioritizes the CLI override (`collRootCliOverride`) for setting the `collRoot` path over all other methods (environment variables, config files, or defaults).

### Function -- `addCollection( ... )`

* [x] 2.1.3 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `addCollection` successfully clones a Git repository or downloads a zip file, creates the collection directory, and updates `cm-main.yaml`.
* [x] 2.1.4 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `addCollection` handles attempts to add a collection with a name that already exists, preventing duplication.
* [x] 2.1.5 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `addCollection` gracefully handles invalid source URLs or paths, reporting appropriate errors.
* [x] 2.1.6 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `addCollection` correctly uses `cm-utils.deriveCollectionName` to sanitize the collection name.

### Function -- `removeCollection( ... )`

* [x] 2.1.7 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `removeCollection` successfully removes a collection entry from `cm-main.yaml` and deletes its corresponding directory.
* [x] 2.1.8 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `removeCollection` gracefully handles attempts to remove a non-existent collection.
* [x] 2.1.9 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `removeCollection` handles cases where the collection's directory cannot be deleted (e.g., due to permissions), logging an error but still updating the manifest.

### Function -- `updateCollection( ... )`

* [x] 2.1.10 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `updateCollection` successfully pulls updates for a Git-sourced collection.
* [x] 2.1.11 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `updateCollection` gracefully handles updating a non-existent collection.
* [x] 2.1.12 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `updateCollection` handles update failures (e.g., network issues, conflicts) for a Git-sourced collection.

### Function -- `listCollections( ... )`

* [x] 2.1.13 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `listCollections` returns a comprehensive list of all collections from `cm-main.yaml` when `filter` is 'all', including their enabled status from `enabled.yaml`.
* [x] 2.1.14 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `listCollections` correctly filters and returns only 'enabled' collections when `filter` is 'enabled'.
* [x] 2.1.15 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `listCollections` correctly filters and returns only 'disabled' collections when `filter` is 'disabled'.
* [x] 2.1.16 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `listCollections` handles cases where `cm-main.yaml` or `enabled.yaml` are missing or empty.

### Function -- `enablePlugin( ... )`

* [x] 2.1.17 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `enablePlugin` successfully adds a plugin to `enabled.yaml` with the specified `invokeName`, `collectionName`, and `pluginId`, ensuring the plugin's config path is resolved and valid.
* [x] 2.1.18 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `enablePlugin` correctly prevents enabling a plugin if the `invokeName` already exists in `enabled.yaml`.
* [x] 2.1.19 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `enablePlugin` handles attempts to enable a plugin that does not exist within the specified collection.
* [x] 2.1.20 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `enablePlugin` correctly uses `cm-utils.isValidPluginName` to validate the `invokeName`.
* [x] 2.1.21 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `enablePlugin` handles cases where the plugin's resolved config path does not exist.

### Function -- `disablePlugin( ... )`

* [x] 2.1.22 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `disablePlugin` successfully removes a plugin entry from `enabled.yaml` based on its `invokeName`.
* [x] 2.1.23 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `disablePlugin` gracefully handles attempts to disable a non-existent `invokeName`.

### Function -- `listAvailablePlugins( ... )`

* [x] 2.1.24 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `listAvailablePlugins` correctly scans all collections for `*.config.yaml` files and extracts available plugin details (name, description, configPath).
* [x] 2.1.25 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `listAvailablePlugins` correctly filters results when a `collectionName` is provided.
* [x] 2.1.26 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `listAvailablePlugins` handles collections that are empty or do not contain valid plugin configuration files.
* [x] 2.1.27 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `listAvailablePlugins` gracefully handles collections directories that are unreadable or corrupt.
* [x] 2.1.28 **TEST_TARGET**: `collections-manager`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `listAvailablePlugins` correctly extracts the `description` from the plugin's configuration file.

---

## Y.2. default_handler File -- `src/default_handler.js`

### Function -- `handle( ... )`

* [x] 2.2.1 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify the `handle` function successfully processes a basic Markdown file, extracts front matter, renders HTML, applies default CSS, and generates a PDF.
* [ ] 2.2.2 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` correctly removes shortcodes from Markdown content before rendering.
* [x] 2.2.3 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` correctly substitutes placeholders in Markdown content before rendering.
* [ ] 2.2.4 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` correctly applies `pluginSpecificConfig.markdown_it_options` to the MarkdownIt instance.
* [x] 2.2.5 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` integrates math rendering by calling `math_integration.configureMarkdownItForMath` and `math_integration.getMathCssContent` when configured.
* [x] 2.2.6 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` correctly applies `markdown-it-anchor` and `markdown-it-table-of-contents` when configured in `pluginSpecificConfig`.
* [ ] 2.2.7 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` correctly integrates custom MarkdownIt plugins specified in `pluginSpecificConfig.markdown_it_plugins`.
* [x] 2.2.8 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` resolves and merges CSS files from `pluginSpecificConfig.css_files` and `raw_css_files`, injecting them into the HTML output.
* [ ] 2.2.9 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` correctly loads and uses a custom HTML template specified by `pluginSpecificConfig.html_template_path`.
* [ ] 2.2.10 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` correctly injects `head_html`, `body_html_start`, and `body_html_end` from `pluginSpecificConfig` into the HTML template.
* [x] 2.2.11 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` correctly determines the output filename based on `outputFilenameOpt`, front matter, or the input Markdown file name.
* [x] 2.2.12 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` gracefully manages errors during Markdown file reading, returning `null`.
* [x] 2.2.13 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` calls `pdfGenerator.generatePdf` with the correctly prepared HTML content and PDF options.
* [ ] 2.2.14 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` correctly applies the `lang` attribute from front matter to the HTML `<html>` tag.
* [ ] 2.2.15 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `handle` correctly handles `omit_title_heading` to prevent the title heading from being rendered when true.
* [ ] 2.2.16 **TEST_TARGET**: `default_handler`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `handle` returns `null` and logs an error if any critical step in the pipeline (e.g., HTML rendering, PDF generation) fails.

---

## Y.3. pdf_generator File -- `src/pdf_generator.js`

### Function -- `generatePdf( ... )`

* [x] 2.3.1 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `generatePdf` successfully launches Puppeteer, navigates to a blank page, sets HTML content, and generates a PDF file to the specified output path.
* [x] 2.3.2 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `generatePdf` correctly applies various `pdfOptions` such as `format`, `printBackground`, and `scale`.
* [x] 2.3.3 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `generatePdf` correctly applies `margin` options (top, bottom, left, right) from `pdfOptions`.
* [x] 2.3.4 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `generatePdf` injects `cssContent` into the generated HTML page before rendering the PDF.
* [x] 2.3.5 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `generatePdf` correctly handles header and footer templates, including dynamic fields, when provided in `pdfOptions`.
* [x] 2.3.6 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `generatePdf` returns `null` and logs an error if Puppeteer fails to launch (e.g., executable not found).
* [x] 2.3.7 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `generatePdf` returns `null` and logs an error if setting page content fails.
* [x] 2.3.8 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `generatePdf` returns `null` and logs an error if PDF generation itself fails (e.g., invalid `pdfOptions`).
* [s] 2.3.9 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Verify `generatePdf` ensures the browser and page are properly closed after PDF generation, even if errors occur.
* [x] 2.3.10 **TEST_TARGET**: `pdf_generator`
    **TEST_TYPE:** `SUBSYSTEM_INTEGRATION`
    **SCENARIO_DESCRIPTION:** Test `generatePdf` correctly handles empty or null `htmlContent` and `cssContent` without crashing.

---
