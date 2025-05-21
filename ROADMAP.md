# Project Roadmap: md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility.

See the [version history](https://github.com/brege/md-to-pdf/blob/main/ROADMAP.md) for a complete history of changes.

---

## Version 0.1.0: Initial Implementation (Completed)

* **Overall Goal:** Provide a command-line tool for converting Markdown files to PDF, with support for different document types (CV, cover letter, recipe), recipe book creation, and batch processing for Hugo content.

## Version 0.2.0: Extensible Document Type Plugin Architecture (Completed)

* **Core Achievement:** Refactored document type handling into a modular plugin system.

## Version 0.2.1: Watch Mode Implementation (Completed)

* **Goal:** Implement a `--watch` flag for `convert` and `generate` commands.

## Version 0.2.2: Core Configuration Refactor (Completed)

* **Goal:** Decouple configuration resolution from plugin execution logic.

## Version 0.3.0: XDG User Default Overrides (Completed)

* **Goal:** Allow users to set global default overrides via their XDG configuration directory.

## Version 0.3.1: Project-Specific Configuration Overrides (Completed)

* **Goal:** Enable project-level overrides via the `--config` CLI flag, completing the 3-tier configuration system for settings.

## Version 0.3.2: Bundled Defaults Flag (Completed)

* **Goal:** Introduce a `--factory-defaults` CLI flag to bypass user/project configurations.
    *(Note: This corresponds to the work described in `proposal-v0.3.3.md`)*.

## Version 0.4.0: User-Defined Plugin Discovery & Loading (Completed)

* **Goal:** Enhance `ConfigResolver.js` and `PluginRegistryBuilder.js` to discover and load plugins (handler scripts, default configs, assets) from user-defined locations (XDG, project directories specified in main configs).
    *(Note: This covers the core plugin discovery mechanism from `proposal-v0.4.0.md`)*.

## Version 0.4.1: Custom Plugin Test & README Update (Completed)

* **Goal:** Validate user-defined plugin architecture with an external test plugin and update `README.md` for v0.4.0 features.

## Version 0.4.2: Math Support (KaTeX) (Next Up)

* **Goal:** Implement LaTeX-style math rendering using KaTeX.

* **Key Features:**
    * Integrate `markdown-it-katex` (or similar) into `src/markdown_utils.js`.
    * Handle KaTeX CSS injection for PDF output.
    * Add configuration options (global and per-plugin) to enable/disable math and pass KaTeX options.
    * Update `ConfigResolver.js` to manage math configuration.

## Version 0.4.x: Further v0.4.0 Scope & Enhancements (Upcoming)

* **Named Plugin Variants:**
    * **Goal:** Allow users to define and invoke multiple named configurations (variants) for the same base plugin handler (e.g., `academic-cv` vs. `tech-cv` for the `cv` plugin).
    * **Status:** Originally part of `proposal-v0.4.0.md`; to be implemented.

* **CLI Enhancements for Plugin Management:**
    * **Goal:** Improve developer experience for creating and managing plugins.
    * **Key Features (from `proposal-v0.4.0.md`):**
        * `md-to-pdf plugin create <pluginName>`: CLI command to generate boilerplate for a new plugin.
        * `md-to-pdf plugin list`: CLI command to list all discoverable plugins and registered named variants.
    * **Status:** Originally part of `proposal-v0.4.0.md`; to be implemented.

* **Schema for Plugin Configuration:**
    * **Goal:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness.
    * **Status:** Future consideration from `proposal-v0.4.0.md`.

## Version 0.5.0: Advanced Plugin Management & Extensibility (Future)

* **Goal:** Standardize and simplify the integration and management of plugins, especially those from external sources.

* **Key Features:**
    * **Automatic Plugin Directory Scanning:** Allow users to specify one or more directories (e.g., in XDG or project config) from which `md-to-pdf` will automatically discover and register valid plugins without explicit listing in a main `config.yaml`.
    * **External Plugin Management:** Document and potentially provide tooling support for integrating plugins managed as external entities (e.g., Git submodules, npm packages).
    * Plugin-specific help generation.

## Future Considerations (Post v0.5.0 / Parallel Tracks)

* **Advanced Plugin Capabilities:**
    * Asset Management (beyond CSS).
    * Templating Engine Support (standardized utilities).
    * Data Source Abstraction (beyond single Markdown or CLI args).

* **Enhanced Output Options:**
    * Direct HTML Output (the fully processed HTML sent to Puppeteer).
