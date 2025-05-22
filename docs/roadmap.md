# Project Roadmap: md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility.

See the [version history](https://github.com/brege/md-to-pdf/commits/main/ROADMAP.md) for a complete history of changes.

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
  * **Cheat Sheet Document:** Created `docs/cheat-sheet.md`. (Completed)
  * **CLI Enhancement - `plugin list`:** Implemented. (Completed)
## Version 0.4.5: Refactoring for Plugin Robustness (Completed)
  * **Refactor `watch_handler.js`**: For extensible, plugin-defined watch paths. (Completed)
  * **Define `DefaultHandler.js` Access Strategy**: Implemented dependency injection for core utilities. (Completed)
## Version 0.4.6: CLI Enhancements (Completed)
  * **CLI Enhancement - `plugin create`:** Implemented `md-to-pdf plugin create <pluginName>` to generate boilerplate for new simple plugins. (Completed)

## Version 0.4.7: Documentation & Configuration Refinements (In Progress)
  * **Goal:** Improve documentation structure, clarity, and configuration defaults.
  * **Key Tasks:**
    * Create `docs/plugin-development.md` for detailed plugin creation and advanced configuration topics. (Completed)
    * Refactor main `README.md` for conciseness, linking to new detailed documentation. (Completed)
    * Organize `docs/` directory: public `docs/` (for `roadmap.md`, `cheat-sheet.md`, `plugin-development.md`, images) and private `docs-devel/`. (Completed)
    * Relocate screenshots to `docs/images/screenshots/` and update `examples/make-screenshots.sh`. (Completed)
    * Rename `math_rendering` config key to `math` and default to `enabled: false` for bundled plugins. (Completed)
    * Review `docs/cheat-sheet.md` and `config.example.yaml` for consistency. (Completed)
    * Update `docs/roadmap.md` with refined v0.5.0 plugin management vision. (This task)

## Version 0.5.0: Advanced Plugin Management & Extensibility (Future)

* **Goal:** Standardize and simplify the integration and management of plugins, especially those from external sources.
* **Key Features:**
  * **Automatic Plugin Directory Scanning:** Allow users to specify one or more directories (e.g., in XDG or project `config.yaml`) from which `md-to-pdf` will automatically discover and register valid plugins without explicit listing in a main `config.yaml`'s `document_type_plugins` section.
  * **External Plugin Management:** Enhance support for integrating and managing plugins sourced from external locations, drawing inspiration from systems like Hugo Themes. This could involve:
    * Documenting best practices for using Git repositories (e.g., as submodules or simple clones) to manage collections of plugins.
    * Potentially introducing a mechanism to install or reference plugins from remote Git URLs directly.
    * Managing these external plugins via a dedicated directory specified in the main `config.yaml`.
  * **Plugin-specific help generation:** Allow plugins to expose information that can be displayed via a CLI command (e.g., `md-to-pdf plugin help <pluginName>`).
* **Schema for Plugin Configuration:**
  * **Goal:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness and provide better error messaging for plugin authors.
  * **Status:** Future consideration (Potentially part of v0.5.0 or later).


## Shelved/Reconsidered Features

* **Named Plugin Variants:**
  * **Original Goal (from `proposal-v0.4.0.md`):** Allow users to define multiple named configurations (variants) for the same base plugin handler.
  * **Decision (May 2025):** Shelved. The existing system for creating user-defined plugins (by copying and customizing an existing plugin) combined with the 3-tier configuration override mechanism provides sufficient flexibility for users to create stylistic or behavioral variations. The added complexity of a dedicated "variants" system was deemed unnecessary, especially since duplicating simple handler scripts has minimal overhead. For highly distinct themes or functionalities, creating a new, full plugin (potentially shared via community channels like GitHub) is a more robust and maintainable approach.

## Future Considerations (Post v0.5.0 / Parallel Tracks)

* **Advanced Plugin Capabilities:**
  * Asset Management (beyond CSS, e.g., images, fonts bundled with plugins).
  * Templating Engine Support (standardized utilities or interfaces for plugins to use templating engines like Handlebars, EJS, etc.).
  * Data Source Abstraction (allowing plugins to fetch or process data from sources beyond a single Markdown file or CLI arguments).
* **Enhanced Output Options:**
  * Direct HTML Output (option to save the fully processed HTML that is sent to Puppeteer, for debugging or other uses).

