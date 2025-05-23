# Project Roadmap - md-to-pdf

This document outlines the planned major features and enhancements for future versions of the `md-to-pdf` utility.

See the [version history](https://github.com/brege/md-to-pdf/commits/main/ROADMAP.md) for a complete history of changes.

---

## [Version 0.1.0][v0.1.0]: Initial Implementation (Completed)
## [Version 0.2.0][v0.2.0]: Extensible Document Type Plugin Architecture (Completed)
## [Version 0.2.1][v0.2.1]: Watch Mode Implementation (Completed)
## [Version 0.2.2][v0.2.2]: Core Configuration Refactor (Completed)
## [Version 0.3.0][v0.3.0]: XDG User Default Overrides (Completed)
## [Version 0.3.1][v0.3.1]: Project-Specific Configuration Overrides (Completed)
## [Version 0.3.2][v0.3.2]: Bundled Defaults Flag (Completed)
## [Version 0.4.0][v0.4.0]: User-Defined Plugin Discovery & Loading (Completed)
## [Version 0.4.1][v0.4.1]: Custom Plugin Test & README Update (Completed)
## [Version 0.4.2][v0.4.2]: Math Support (KaTeX) (Completed)
## [Version 0.4.4][v0.4.4]: User Aids & Plugin Listing (Completed)
  * **Cheat Sheet Document:** Created `docs/cheat-sheet.md`. (Completed)
  * **CLI Enhancement - `plugin list`:** Implemented. (Completed)
## [Version 0.4.5][v0.4.5]: Refactoring for Plugin Robustness (Completed)
  * **Refactor `watch_handler.js`**: For extensible, plugin-defined watch paths. (Completed)
  * **Define `DefaultHandler.js` Access Strategy**: Implemented dependency injection for core utilities. (Completed)
## [Version 0.4.6][v0.4.6]: CLI Enhancements (Completed)
  * **CLI Enhancement - `plugin create`:** Implemented `md-to-pdf plugin create <pluginName>` to generate boilerplate for new simple plugins. (Completed)
## [Version 0.4.7][v0.4.7]: Documentation & Configuration Refinements (Completed)
  * **Goal:** Improve documentation structure, clarity, and configuration defaults.
  * **Key Tasks:**
    * Created `docs/plugin-development.md` for detailed plugin creation and advanced configuration topics. (Completed)
    * Refactored main `README.md` for conciseness, linking to new detailed documentation. (Completed)
    * Organized `docs/` directory: public `docs/` (for `roadmap.md`, `cheat-sheet.md`, `plugin-development.md`, images) and private `docs-devel/`. (Completed)
    * Relocated screenshots to `docs/images/screenshots/` and updated `examples/make-screenshots.sh`. (Completed)
    * Renamed `math_rendering` config key to `math` and defaulted to `enabled: false` for bundled plugins. (Completed)
    * Reviewed `docs/cheat-sheet.md` and `config.example.yaml` for consistency. (Completed)
    * Updated `docs/roadmap.md` to reflect refined v0.5.0+ plugin management vision. (Completed)

## [Version 0.5.0][v0.5.0]: Core Plugin Enhancements & Advanced Usage (Completed)
  * **Goal:** Enhance plugin robustness, usability, and data handling capabilities, and provide comprehensive examples.
  * **Key Features:**
    * **Schema for Plugin Configuration:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness and provide better error messaging. (Completed)
    * **Plugin-Specific Help Generation:** Implement `md-to-pdf plugin help <pluginName>` to allow users to get help/information specific to a particular plugin. (Completed)
    * **Global Config Data for Placeholders:** Enable users to define global data snippets (e.g., personal contact information) in their main `config.yaml` for use as placeholders in Markdown documents (primarily via `DefaultHandler`). (Completed)
    * **Advanced "advanced-card" Plugin Example & Documentation:** Create a new `advanced-card` plugin showcasing custom HTML generation and dynamic content, and update `docs/plugin-development.md` with this as a capstone example. (Completed)

## [Version 0.5.1][v0.5.1]: "advanced-card" Plugin & Documentation (Completed)
  * **Goal:** Create a new "advanced-card" plugin as a comprehensive example of advanced plugin handler capabilities and significantly enhance `docs/plugin-development.md`. (Based on `proposal-v0.5.1.md`)
  * This version effectively supersedes the "Advanced 'advanced-card' Plugin Example & Documentation" task originally planned for v0.5.0, making it a dedicated release.

## Version 0.5.2]: Streamline Core & Document External Batch Processing (Completed)
  * **Goal:** Simplify `md-to-pdf` by removing the integrated batch processing command (`hugo-export-each`) and provide comprehensive guidance on performing batch operations via external scripts.
  * **Key Tasks:**
    * Remove `hugo-export-each` command and `src/hugo_export_each.js` module.
    * Remove `hugo_export_each` sections from configuration files.
    * Create `docs/batch-processing-guide.md` with Node.js and Bash scripting examples for batch conversion.
    * Update `README.md` and `docs/cheat-sheet.md` to remove references to the internal command and link to the new guide.

## Version 0.6.0: Improved Plugin Discovery & Local Management (Future)
* **Goal:** Simplify the management and use of locally stored custom plugins.
* **Key Features:**
  * **Automatic Plugin Directory Scanning:** Allow users to specify one or more directories (e.g., in XDG or project `config.yaml`) from which `md-to-pdf` will automatically discover and register valid plugins without explicit listing in a main `config.yaml`'s `document_type_plugins` section.

## Version 0.7.0: External & Community Plugin Integration (Future)
* **Goal:** Standardize and simplify the integration and management of plugins from external sources to foster a community ecosystem.
* **Key Features:**
  * **External Plugin Management:** Enhance support for integrating and managing plugins sourced from external locations, drawing inspiration from systems like Hugo Themes. This could involve:
    * Documenting best practices for using Git repositories (e.g., as submodules or simple clones) to manage collections of plugins.
    * Potentially introducing a mechanism to install or reference plugins from remote Git URLs directly.
    * Managing these external plugins via a dedicated directory specified in the main `config.yaml`.

## Shelved/Reconsidered Features

* **Named Plugin Variants:**
  * **Original Goal (from `proposal-v0.4.0.md`):** Allow users to define multiple named configurations (variants) for the same base plugin handler.
  * **Decision (May 2025):** Shelved. The existing system for creating user-defined plugins (by copying and customizing an existing plugin) combined with the 3-tier configuration override mechanism provides sufficient flexibility.
* **Integrated Generic Batch Export Command (formerly `hugo-export-each` / `export-each`):**
  * **Original Goal (planned for v0.5.1/v0.5.2):** Generalize the `hugo-export-each` command for various directory structures.
  * **Decision (May 2025 - v0.5.2):** Removed from core. Users will be guided to use external scripting with `md-to-pdf convert` for batch operations, offering greater flexibility and simplifying the core tool. See `docs/batch-processing-guide.md`.


## Future Considerations (Post v0.7.0 / Parallel Tracks)

* **Advanced Plugin Capabilities:**
  * Asset Management (beyond CSS, e.g., images, fonts bundled with plugins).
  * Templating Engine Support (standardized utilities or interfaces).
  * Data Source Abstraction (allowing plugins to fetch or process data from sources beyond a single Markdown file or CLI arguments).
* **Enhanced Output Options:**
  * Direct HTML Output (option to save the fully processed HTML).
* **Programmatic API:**
  * Further expose core functionalities as a Node.js library for easier integration into other tools or more complex custom scripts.

[v0.1.0]: https://github.com/brege/md-to-pdf/tree/1515fd9630c18ee44e3a2b6f06bc129e0fb6abc0
[v0.2.0]: https://github.com/brege/md-to-pdf/releases/tag/v0.2.0
[v0.2.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.2.1
[v0.2.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.2.2
[v0.3.0]: https://github.com/brege/md-to-pdf/releases/tag/v0.3.0
[v0.3.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.3.1
[v0.3.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.3.2
[v0.4.0]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.0
[v0.4.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.1
[v0.4.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.2
[v0.4.4]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.4
[v0.4.5]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.5
[v0.4.6]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.6
[v0.4.7]: https://github.com/brege/md-to-pdf/releases/tag/v0.4.7
[v0.5.0]: https://github.com/brege/md-to-pdf/releases/tag/v0.5.0
[v0.5.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.5.1
