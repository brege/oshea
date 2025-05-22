# Project Roadmap: md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility.

See the [version history](https://github.com/brege/md-to-pdf/blob/main/ROADMAP.md) for a complete history of changes.

---

## Version 0.1.0: Initial Implementation (Completed)
## Version 0.2.0: Extensible Document Type Plugin Architecture (Completed)
## Version 0.2.1: Watch Mode Implementation (Completed)
## Version 0.2.2: Core Configuration Refactor (Completed)
## Version 0.3.0: XDG User Default Overrides (Completed)
## Version 0.3.1: Project-Specific Configuration Overrides (Completed)
## Version 0.3.2: Bundled Defaults Flag (Completed)
## Version 0.4.0: User-Defined Plugin Discovery & Loading (Completed)
## Version 0.4.1: Custom Plugin Test & README Update (Completed)
## Version 0.4.2: Math Support (KaTeX) (Completed)
## Version 0.4.4: User Aids & Plugin Listing (Completed)
    * **Cheat Sheet Document:** Created `docs/CHEAT_SHEET.md`. (Completed)
    * **CLI Enhancement - `plugin list`:** Implemented. (Completed)
## Version 0.4.5: Refactoring for Plugin Robustness (Completed)
    * **Refactor `watch_handler.js`**: For extensible, plugin-defined watch paths. (Completed)
    * **Define `DefaultHandler.js` Access Strategy**: Implemented dependency injection for core utilities. (Completed)
## Version 0.4.6: CLI Enhancements (Completed)
    * **CLI Enhancement - `plugin create`:** Implemented `md-to-pdf plugin create <pluginName>` to generate boilerplate for new simple plugins. (Completed)

## Version 0.4.7: Documentation Refactoring (Next Up)
    * **Goal:** Improve documentation structure and clarity.
    * **Key Tasks:**
        * Create a new dedicated document (e.g., `ADVANCED_PLUGINS.md` or `PLUGIN_DEVELOPMENT.md`) to consolidate detailed information about plugin creation, advanced configuration (hierarchy, XDG, project-local), and plugin handler development.
        * Refactor the main `README.md` to be more introductory, focusing on basic usage and linking to the new advanced plugin documentation.
        * Review and ensure consistency across all documentation regarding plugin management.

## Version 0.5.0: Advanced Plugin Management & Extensibility (Future)

* **Goal:** Standardize and simplify the integration and management of plugins, especially those from external sources.
* **Key Features:**
    * **Automatic Plugin Directory Scanning:** Allow users to specify one or more directories (e.g., in XDG or project config) from which `md-to-pdf` will automatically discover and register valid plugins without explicit listing in a main `config.yaml`.
    * **External Plugin Management:** Document and potentially provide tooling support for integrating plugins managed as external entities (e.g., Git submodules, npm packages).
    * Plugin-specific help generation.
* **Schema for Plugin Configuration:**
    * **Goal:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness.
    * **Status:** Future consideration (Potentially part of v0.5.0 or later).


## Shelved/Reconsidered Features

* **Named Plugin Variants:**
    * **Original Goal (from `proposal-v0.4.0.md`):** Allow users to define multiple named configurations (variants) for the same base plugin handler.
    * **Decision (May 2025):** Shelved. The existing system for creating user-defined plugins (by copying and customizing an existing plugin) combined with the 3-tier configuration override mechanism provides sufficient flexibility for users to create stylistic or behavioral variations. The added complexity of a dedicated "variants" system was deemed unnecessary, especially since duplicating simple handler scripts has minimal overhead. For highly distinct themes or functionalities, creating a new, full plugin (potentially shared via community channels like GitHub) is a more robust and maintainable approach.

## Future Considerations (Post v0.5.0 / Parallel Tracks)

* **Advanced Plugin Capabilities:**
    * Asset Management (beyond CSS).
    * Templating Engine Support (standardized utilities).
    * Data Source Abstraction (beyond single Markdown or CLI args).
* **Enhanced Output Options:**
    * Direct HTML Output (the fully processed HTML sent to Puppeteer).

