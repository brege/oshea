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
## [Version 0.4.5][v0.4.5]: Refactoring for Plugin Robustness (Completed)
## [Version 0.4.6][v0.4.6]: CLI Enhancements (Completed)
## [Version 0.4.7][v0.4.7]: Documentation & Configuration Refinements (Completed)
## [Version 0.5.0][v0.5.0]: Core Plugin Enhancements & Advanced Usage (Completed)

## [Version 0.5.1][v0.5.1]: "advanced-card" Plugin & Documentation (Completed)
  * **Goal:** Create a new "advanced-card" plugin as a comprehensive example of advanced plugin handler capabilities and significantly enhance `docs/plugin-development.md`.
  * This version effectively completed the "Advanced 'advanced-card' Plugin Example & Documentation" task originally planned for v0.5.0.

## [Version 0.5.2][v0.5.2]: Streamline Core & Document External Batch Processing (Completed)
  * **Goal:** Simplify `md-to-pdf` by removing the integrated batch processing command (`hugo-export-each`) and provide comprehensive guidance on performing batch operations via external scripts.
  * **Key Tasks:**
    * Remove `hugo-export-each` command and `src/hugo_export_each.js` module. (Completed)
    * Remove `hugo_export_each` sections from configuration files. (Completed)
    * Create `docs/batch-processing-guide.md` with Node.js and Bash scripting examples for batch conversion. (Completed)
    * Update `README.md` and `docs/cheat-sheet.md` to remove references to the internal command and link to the new guide. (Completed)

## [Version 0.5.3][v0.5.3]: Plugin Usability - Specific Help via README Front Matter (Completed)
  * **Goal:** Enhance plugin usability by allowing users to get help information specific to a particular plugin via the CLI, sourced from the plugin's `README.md` front matter.
  * **Key Features:**
    * Plugin-Specific Help Text sourced from `cli_help` in plugin `README.md` front matter.
    * New CLI Command `md-to-pdf plugin help <pluginName>`.
    * Bundled Plugin `README.md` files created/updated with `cli_help`.
    * Documentation updated for users and plugin authors.
    * `plugin create` boilerplate now includes `README.md` with `cli_help` stub.

## [Version 0.5.4][v0.5.4]: Configuration Transparency (Proposed)
  * **Goal:** Improve the transparency and debuggability of the configuration system.
  * **Key Features:**
    * **New CLI Command `md-to-pdf config`:** Implement a command to display the active configuration settings.
        * Basic invocation (`md-to-pdf config`) would show active configuration file paths and key global settings (e.g., `pdf_viewer`, merged `global_pdf_options`, `params`, `math` settings).
        * Focused invocation (`md-to-pdf config --plugin <pluginName>`) would display the full effective configuration for the specified plugin after all overrides.
        * Output should respect `--factory-defaults` and `--config` flags.
    * **Documentation:** Update `docs/cheat-sheet.md` and relevant documentation sections.

## Version 0.5.5: Enhanced Configuration Flexibility (Proposed)
  * **Goal:** Reduce friction in managing plugin configuration overrides.
  * **Key Features:**
    * **Inline Plugin Overrides:** Allow plugin override settings to be directly embedded as an object within the `document_type_plugins` section of XDG or Project main configuration files, as an alternative to pointing to a separate override file.
        * `ConfigResolver.js` to be updated to handle `document_type_plugins` entries that are objects (inline overrides) in addition to path strings.
        * Clarify path resolution for assets (e.g., `css_files`) referenced in inline overrides (likely relative to the main config file where they are embedded).
    * **Documentation:** Update `docs/plugin-development.md` and `README.md` to reflect this new override method.

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

## Version 0.9.0: System Hardening & Finalization (Proposed Future Milestone)
  * **Goal:** Prepare for a conceptual "1.0" release by focusing on robustness, comprehensive testing, and API stability.
  * **Key Features:**
    * **Schema for Plugin Configuration:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness and provide better error messaging.
    * **Comprehensive Test Review:** Audit and expand test coverage for all features, especially edge cases.
    * **API Stability Review:** If a programmatic API is more formally defined by this point, review for stability.
    * **Documentation Finalization:** Complete review and polish of all user and developer documentation.

## Shelved/Reconsidered Features

* **Named Plugin Variants:**
  * **Original Goal (from `proposal-v0.4.0.md`):** Allow users to define multiple named configurations (variants) for the same base plugin handler.
  * **Decision (May 2025):** Shelved. The existing system for creating user-defined plugins (by copying and customizing an existing plugin) combined with the 3-tier configuration override mechanism provides sufficient flexibility. The "Inline Plugin Overrides" (v0.5.5) feature aims to address some of the usability aspects this feature originally targeted.
* **Integrated Generic Batch Export Command (formerly `hugo-export-each` / `export-each`):**
  * **Original Goal (planned for v0.5.1/v0.5.2):** Generalize the `hugo-export-each` command for various directory structures.
  * **Decision (May 2025 - v0.5.2):** Removed from core. Users are guided to use external scripting with `md-to-pdf convert` for batch operations, offering greater flexibility and simplifying the core tool. See `docs/batch-processing-guide.md`.


## Future Considerations (Post v0.9.0 / Parallel Tracks)

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
[v0.5.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.5.2
[v0.5.3]: https://github.com/brege/md-to-pdf/releases/tag/v0.5.3
[v0.5.4]: https://github.com/brege/md-to-pdf/releases/tag/v0.5.4
