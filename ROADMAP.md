# Project Roadmap: md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility, building upon the v0.2.0 plugin architecture.

## Version 0.1.0: Initial Implementation (Completed)

* **Overall Goal:** Provide a command-line tool for converting Markdown files to PDF, with support for different document types (CV, cover letter, recipe), recipe book creation, and batch processing for Hugo content.

* **Key Features & State:**


    * **Core Conversion:** Implemented using `markdown-it` for Markdown parsing and Puppeteer for PDF generation via `src/pdf_generator.js`.
    
    * **Document Processing:** `src/document_processor.js` handled single file conversions, including front matter extraction, placeholder substitution (with dynamic dates), shortcode removal, and filename generation.
    
    * **Type-Specific Configurations:** Managed in a central `config.yaml` under a `document_types` key, defining CSS files, PDF options, and processing flags for types like `cv`, `cover-letter`, and `recipe`. Configurations were resolved by `src/markdown_utils.js`.
    
    * **Recipe Book Generation:** `src/recipe_book_builder.js` provided functionality to combine multiple recipe Markdown files (from a Hugo-like directory structure) into a single PDF, with support for a cover page and table of contents.
    
    * **Hugo Batch Export:** `src/hugo_export_each.js` enabled batch conversion of Hugo content (e.g., recipes) into individual PDFs, with slug-author-date naming conventions and metadata extraction.
    
    * **CLI (`cli.js`):** Provided three main commands:
        * `convert <markdownFile> --type <documentType>`: For single file conversions.
        * `book <recipesBaseDir>`: For recipe book generation.
        * `hugo-export-each <sourceDir> --base-type <type>`: For batch Hugo exports.
    
    * **Styling:** CSS files for different document types were typically expected in a root `css/` directory and referenced in `config.yaml`.
    
    * **Testing:** An initial test suite (`test/run-tests.js` and `test/config.test.yaml`) was in place to verify core command functionalities.


## Version 0.2.0: Extensible Document Type Plugin Architecture (Completed)

* **Core Achievement:** Refactored document type handling into a modular plugin system.

* **Key Features:**
    
    * `PluginManager.js` for plugin discovery, configuration loading, and handler invocation.
    
    * Self-contained plugins in the `plugins/` directory, each with its own configuration (`*.config.yaml`), handler script (`index.js`), and local CSS assets.
    
    * `src/default_handler.js` for common Markdown processing logic reusable by simple plugins.
    
    * Existing types (`default`, `cv`, `cover-letter`, `recipe`, `recipe-book`) migrated to the new plugin structure.
    
    * Updated `cli.js` with:
        * `convert <markdownFile> --plugin <pluginName>`
        * Generic `generate <pluginName> [plugin-specific-options...]` command (replacing the old `book` command).
        * `hugo-export-each` now uses `--base-plugin` and leverages `PluginManager`.
    
    * Revised main `config.yaml` structure using `document_type_plugins` for plugin registration.
    
    * Updated documentation and passing test suite.

## Version 0.3.0: Enhanced Configuration System

* **Goal:** Provide a more flexible and user-friendly way to manage and override configurations.

* **Configuration Lookup Hierarchy & Overrides:**

    * Implement a clear precedence order for loading configurations (e.g., CLI options > user's main `config.yaml` plugin overrides > plugin's `*.config.yaml` defaults > global defaults from main `config.yaml`).
    * Allow users to override specific settings of a bundled/default plugin (like its CSS or PDF margins) directly in their main `config.yaml` without needing to edit the plugin's own files. This is particularly important for users who install `md-to-pdf` as a dependency.

* **(Optional) Schema for Plugin Configuration:** Define a JSON schema for plugin `*.config.yaml` files to enable validation and potentially improve editor support or tooling.


* **(Optional) Dynamic Configuration in Handlers:** Explore allowing plugin handlers to programmatically adjust their final resolved configuration (e.g., PDF options) based on input data or front matter content.

## Version 0.4.0: Improved Developer Experience & Plugin Management

* **Goal:** Make it significantly easier for developers to create, manage, and discover plugins.

* **Plugin Archetyping/Scaffolding CLI Command:**

    * Introduce `md-to-pdf plugin create <pluginName>`: This command will generate a boilerplate directory structure and essential files for a new plugin (e.g., `plugins/<pluginName>/<pluginName>.config.yaml`, `plugins/<pluginName>/index.js`, `plugins/<pluginName>/<pluginName>.css`).

* **Plugin Management CLI Commands:**

    * `md-to-pdf plugin list`: Lists all currently registered and available plugins with their descriptions (from their config files).
    * `(Consider) md-to-pdf plugin enable/disable <pluginName>`: Could manage the registration entries in the main `config.yaml`.

* **Plugin-Specific Help for `generate` command:** Allow plugins to define and expose help text for their specific options when a user runs `md-to-pdf generate <pluginName> --help` (or a similar mechanism).

## Future Considerations (Post v0.4.0 / Parallel Tracks)

* **Watch Mode (`--watch`):**

    * **Description:** Implement a watch mode that automatically re-runs conversions when input Markdown files or relevant plugin assets (CSS, configs) are modified.

    * **Benefit:** Improves development speed and allows for live-preview-like workflows.
    
    * **Implementation Notes:** Could use libraries like `chokidar`. For PDF, this would re-generate the PDF. For a true live HTML preview, it might involve serving generated HTML locally and using browser live-reload techniques.

* **Math Support (e.g., LaTeX via KaTeX/MathJax):**
    
    * **Description:** Integrate support for rendering mathematical notation (e.g., LaTeX syntax) within Markdown documents.
    
    * **Benefit:** Essential for scientific, academic, and technical documentation (e.g., physics lab manuals).
    
    * **Implementation Notes:** Typically involves adding a Markdown-it plugin (e.g., `markdown-it-katex` or `markdown-it-mathjax-chtml`) to the Markdown processing pipeline and ensuring necessary CSS/fonts are correctly handled by Puppeteer for PDF rendering. This could be a core feature or enabled by specific plugins.

* **Git Submodule / External Plugin Management Workflow:**
    
    * **Description:** Document and support a workflow where users can incorporate plugins from external Git repositories (e.g., as Git submodules) into their `plugins/` directory.
    
    * **Benefit:** Allows for a broader ecosystem of shareable and independently versioned plugins.
    
    * **Implementation Notes:** The current `PluginManager` should largely support this if plugins are correctly placed and registered in `config.yaml`. This is more about documenting best practices and ensuring robustness.

* **Advanced Plugin Capabilities:**
    
    * **Asset Management:** More sophisticated handling for plugin assets beyond CSS (e.g., local fonts, images referenced in CSS/HTML).
    
    * **Templating Engine Support:** While plugins can use templating internally, explore offering standardized utilities or conventions for using popular templating engines.
    
    * **Data Source Abstraction:** Allow plugins to define more complex data sources beyond a single Markdown file or CLI arguments.

* **Enhanced Output Options:**
    
    * **Direct HTML Output:** An option to save the fully processed HTML (after all Markdown conversions, shortcode removals, and placeholder substitutions) that is sent to Puppeteer. Useful for debugging or web use.

