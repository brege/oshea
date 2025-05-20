# Project Roadmap: md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility.

## Version 0.1.0: Initial Implementation (Completed)

* **Overall Goal:** Provide a command-line tool for converting Markdown files to PDF, with support for different document types (CV, cover letter, recipe), recipe book creation, and batch processing for Hugo content.

* **Key Features & State:** (As previously defined)
# md-to-pdf - Project Roadmap

## Version 0.2.0: Extensible Document Type Plugin Architecture (Completed)

* **Core Achievement:** Refactored document type handling into a modular plugin system.

* **Key Features:** (As previously defined, including `PluginManager.js`, self-contained plugins, `default_handler.js`, CLI updates, `config.yaml` revision)


## Version 0.2.1: Watch Mode Implementation (Completed)

* **Goal:** Implement a `--watch` flag for the `convert` and `generate` commands.

* **Key Features:**
    * `--watch` CLI option integrated with `convert` and `generate`.
    * Uses `chokidar` via `src/watch_handler.js` to monitor relevant source files.
    * Re-triggers PDF generation on detected changes.

## Version 0.2.2: Core Configuration Refactor (Completed)

* **Goal:** Decouple configuration resolution from plugin execution logic to improve modularity and prepare for advanced configuration loading.

* **Key Features:**

    * Introduced `ConfigResolver.js` to handle loading main and bundled plugin configurations, and initial merging of global options.
    
    * Simplified `PluginManager.js` to focus solely on plugin handler invocation using pre-resolved configurations.
    
    * Updated `cli.js` to orchestrate `ConfigResolver` and `PluginManager`.


## Version 0.3.0: XDG User Default Overrides (Completed)

* **Goal:** Allow users to set global default overrides for plugin configurations and global settings via their XDG configuration directory.

* **Key Features:**

    * `ConfigResolver.js` now supports a 2-tier loading system:
        1.  Bundled plugin defaults (lowest precedence).
        2.  XDG user defaults from `~/.config/md-to-pdf/` (middle precedence).
    
    * Supports XDG overrides for global settings (e.g., `pdf_viewer` in `~/.config/md-to-pdf/config.yaml`).
    
    * Supports XDG overrides for plugin-specific settings (in `~/.config/md-to-pdf/<pluginName>/<pluginName>.config.yaml`).
    
    * Implemented `inherit_css` flag (defaulting to `false`) in plugin configurations to control merging of CSS files from the bundled layer.


## Version 0.3.1: Project-Specific Configuration Overrides (Completed)

* **Goal:** Enable project-level overrides with the highest precedence using the `--config` CLI flag, completing the 3-tier configuration system.

* **Key Features:**
    
    * `ConfigResolver.js` updated for a full 3-tier loading system:
        1.  Bundled plugin defaults.
        2.  XDG user defaults.
        3.  Project-specific overrides via `--config` (highest precedence).
    
    * The `--config` flag points to a project's main configuration file (e.g., `my-project-main.yaml`). This file, in turn, uses a `document_type_plugins` map to point to project-local plugin-specific override files (e.g., `cv: "./cv-overrides.yaml"`).
    
    * Paths for plugin-specific override files and their assets (like CSS) are resolved relative to their respective locations within the project structure.
    
    * The `inherit_css` flag logic is applied at this layer as well, interacting with the result from the XDG/Bundled layers.
    
    * Unit test added to verify this project-specific override mechanism.


## Version 0.3.2: Named Plugin Variants (Next Task / Future Consideration)

* **Goal:** Allow users to define and invoke multiple named configurations (variants) for the same base plugin.

* **Description:** Implement the concept of "named plugin variants" (deferred from original `DEMO.md` exploration). This would enable users to define configurations like `academic-cv` and `tech-cv` (both using the `cv` base plugin but with different settings) in their XDG or project config files, and invoke them via `--plugin <variantName>`.

* **Benefit:** Provides a structured way to manage distinct styles/configurations for the same document type for different use cases.


## Version 0.4.0: Improved Developer Experience & Plugin Management (Future)

* **Goal:** Make it significantly easier for developers to create, manage, and discover plugins.

* **Key Features:**
    
    * **Plugin Archetyping/Scaffolding CLI Command:**
        * `md-to-pdf plugin create <pluginName>`: Generates boilerplate for a new plugin.
    
    * **Plugin Management CLI Commands:**
        * `md-to-pdf plugin list`: Lists registered plugins and their effective configurations.
        * (Consider) `md-to-pdf plugin enable/disable <pluginName>`.
    
    * **Plugin-Specific Help for `generate` command:** Allow plugins to expose help for their specific options.
    
    * **(Carry-over) Schema for Plugin Configuration:** Define a JSON schema for plugin `*.config.yaml` files.
    
    * **(Carry-over) Dynamic Configuration in Handlers:** Explore allowing plugin handlers to programmatically adjust their final resolved configuration based on input data.


## Version 0.5.0: Git Submodule / External Plugin Management (Future)

* **Goal:** Standardize and simplify the integration of plugins managed as external entities (e.g., Git submodules or separate packages).

* **Description:** Document and potentially provide tooling support for a workflow where users can incorporate plugins from external Git repositories or npm packages into their `plugins/` directory or an alternative recognized location.

* **Benefit:** Allows for a broader ecosystem of shareable and independently versioned plugins, potentially transforming how plugins are "installed" or made available to the tool. This might influence or partly usurp the "Named Plugin Variants" (v0.3.2) if external plugins become easy to alias or configure upon registration.

## Future Considerations (Post v0.5.0 / Parallel Tracks)

* **Math Support (e.g., LaTeX via KaTeX/MathJax):**

* **Advanced Plugin Capabilities:**
    
    * Asset Management (beyond CSS).
    
    * Templating Engine Support (standardized utilities).
    
    * Data Source Abstraction (beyond single Markdown or CLI args).

* **Enhanced Output Options:**
    
    * Direct HTML Output (the fully processed HTML sent to Puppeteer).
