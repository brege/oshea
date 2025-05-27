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
## [Version 0.5.2][v0.5.2]: Streamline Core & Document External Batch Processing (Completed)
## [Version 0.5.3][v0.5.3]: Plugin Usability - Specific Help via README Front Matter (Completed)
## [Version 0.5.4][v0.5.4]: Configuration Transparency (Completed)
  * **Goal:** Improve the transparency and debuggability of the configuration system.
  * **Key Features:**
    * New CLI Command `md-to-pdf config`: Displays active global configuration settings and effective plugin configurations.
    * Output respects `--factory-defaults` and `--config` flags.
    * Includes `--pure` option for raw YAML output.

## [Version 0.6.0][v0.6.0]: Plugin Path Aliases & External Plugin Foundations (Completed)
  * **Goal:** Simplify plugin registration and lay groundwork for easier integration of external and community plugin collections. This involved strategic decisions to favor explicit registration and prepare for more robust plugin management over automatic discovery.
  * **Key Features:**
    * Introduced `plugin_directory_aliases` in main configuration files (`config.yaml`, XDG, Project) to allow shorthand, manageable paths for plugin registrations.
    * `PluginRegistryBuilder.js` updated to load and resolve these aliases, with alias targets being relative to their defining configuration file.
    * Enforced stricter validation for resolved plugin configuration paths.

## [Version 0.6.1][v0.6.1]: Enhanced Plugin Configuration - Inline Overrides & Key Rename (Completed)
  * **Goal:** Streamline plugin configuration management.
  * **Key Features:**
    * Renamed `document_type_plugins` to `plugins` in main configuration files.
    * Implemented "Beets-inspired" inline plugin overrides in XDG/Project main configs.
    * Implemented `plugin_directory_aliases` for simplified plugin registration paths.

## [Version 0.6.2][v0.6.2]: Output Default & Initial Documentation for v0.6.1 (Completed)
  * **Goal:** Improve default output behavior and document v0.6.1 changes.
  * **Key Features:**
    * Default `convert` output directory changed to system temporary folder.
    * Comprehensive documentation update for v0.6.1 and v0.6.2 features.

## [Version 0.6.3][v0.6.3]: Enhanced Plugin Specification - Front Matter & Lazy Load (Completed)
  * **Goal:** Introduce flexible plugin specification via Markdown front matter and "lazy load" CLI functionality.
  * **Key Features:**
    * Implemented "Lazy Load": `md-to-pdf <markdownFile>` acts as implicit `convert`.
    * `src/plugin_determiner.js` introduced to manage plugin selection logic.
    * Plugin specification via `md_to_pdf_plugin:` key in Markdown front matter (name or relative path).
    * `ConfigResolver.js` adapted to accept absolute paths for plugin specification and derive nominal names for overrides.
    * Conditional logging for `isLazyLoadMode` in `ConfigResolver` and `PluginRegistryBuilder`.
    * Improved logging for plugin determination.
    * Unit tests for front matter plugin specification and CLI override.

## [Version 0.6.4][v0.6.4]: Enhanced Plugin Specification - Local Config & Core Refactor (Completed)
  * **Goal:** Allow document-specific plugin configuration via local files and refactor core config loading.
  * **Key Features:**
    * Refactored `ConfigResolver.js` into modular components: `main_config_loader.js`, `plugin_config_loader.js`, `asset_resolver.js`, `config_utils.js`. [cite: 13, 14, 15, 16, 17]
    * Implemented plugin specification and overrides via local `<filename>.config.yaml`.
        * `plugin: <name_or_path>` key for plugin selection. [cite: 4]
        * Highest precedence for document-specific settings overrides (`pdf_options`, `css_files`, `params`). [cite: 6, 7]
    * Updated `params` merging hierarchy to include local config file. [cite: 8]
    * Finalized plugin choice precedence: CLI > Front Matter > Local `<filename>.config.yaml` > Default. [cite: 5]
    * Finalized settings override precedence: Local `<filename>.config.yaml` > Project > User-Global > Plugin Default. [cite: 7]
    * `default_handler.js` incorporates `params` from local overrides. [cite: 8]
    * Added tests for local `.config.yaml` functionality. [cite: 10]
    * Adjusted warning for initial config loading. [cite: 1, 2]

## [Version 0.6.5][v0.6.5]: Documentation Finalization for Enhanced Plugin System (Completed)
  * **Goal:** Comprehensively update and polish all project documentation to accurately reflect all features introduced up to v0.6.4.
  * **Key Activities:**
    * Refined `README.md` for conciseness, adding new "Plugins" overview and refining "Configuration" section.
    * Migrated detailed configuration explanations from `README.md` to `docs/plugin-development.md`, establishing it as the comprehensive resource.
    * Updated `docs/cheat-sheet.md` with new plugin specification examples and precedence rules.
    * Updated this `docs/roadmap.md` to accurately reflect completed work based on git history.

## Version 0.7.0: External & Community Plugin Integration (Future)
* **Goal:** Standardize and simplify the integration and management of plugins from external sources to foster a community ecosystem.
* **Key Features:**
  * **External Plugin Management:** Enhance support for integrating and managing plugins sourced from external locations. This could involve:
    * Documenting best practices for using Git repositories (e.g., as submodules or simple clones) to manage collections of plugins, potentially using `plugin_directory_aliases`.
    * Potentially introducing a mechanism to install or reference plugins from remote Git URLs directly.
    * Managing these external plugins via a dedicated directory specified in the main `config.yaml`.

## Version 0.9.0: System Hardening & Finalization (Proposed Future Milestone)
  * **Goal:** Prepare for a conceptual "1.0" release by focusing on robustness, comprehensive testing, and API stability.
  * **Key Features:**
    * **Schema for Plugin Configuration:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness and provide better error messaging.
    * **Comprehensive Test Review:** Audit and expand test coverage for all features, especially edge cases.
    * **API Stability Review:** If a programmatic API is more formally defined by this point, review for stability.
    * **Documentation Finalization:** Complete review and polish of all user and developer documentation.


## Version 0.9.0: System Hardening & Finalization (Proposed Future Milestone)
  * **Goal:** Prepare for a conceptual "1.0" release by focusing on robustness, comprehensive testing, and API stability.
  * **Key Features:**
    * **Schema for Plugin Configuration:** Define and implement JSON schema validation for plugin `*.config.yaml` files to improve robustness and provide better error messaging.
    * **Comprehensive Test Review:** Audit and expand test coverage for all features, especially edge cases.
    * **API Stability Review:** If a programmatic API is more formally defined by this point, review for stability.
    * **Documentation Finalization:** Complete review and polish of all user and developer documentation.

## Known Bugs

[issue-1]
  * **Description:** Placeholder double-curly-brace syntax within code blocks inside a markdown file throws WARNings.
  * State: **OPEN**
  * Observed: v0.6.2, v0.6.3
  * When rendering a markdown document containing:
    ```
    \`\`\`
    {{ some.variable }}
    \`\`\`
    ```
    stdout contains the following warning:
    `WARN: Placeholder '{{ custom_data.key }}' not found during main content substitution.`


## Shelved/Reconsidered Features

* **Named Plugin Variants:**
  * **Original Goal (from `proposal-v0.4.0.md`):** Allow users to define multiple named configurations (variants) for the same base plugin handler.
  * **Decision (May 2025):** Shelved. The existing system for creating user-defined plugins (by copying and customizing an existing plugin) combined with the 3-tier configuration override mechanism (including inline overrides introduced in v0.6.1) provides sufficient flexibility.
* **Integrated Generic Batch Export Command (formerly `hugo-export-each` / `export-each`):**
  * **Original Goal (planned for v0.5.1/v0.5.2):** Generalize the `hugo-export-each` command for various directory structures.
  * **Decision (May 2025 - v0.5.2):** Removed from core. Users are guided to use external scripting with `md-to-pdf convert` for batch operations, offering greater flexibility and simplifying the core tool. See `docs/batch-processing-guide.md`.
* **Automatic Plugin Directory Scanning:** (Formerly v0.6.0)
    * **Original Goal:** Allow users to specify one or more directories from which `md-to-pdf` will automatically discover and register valid plugins without explicit listing in a main `config.yaml`'s `plugins` section.
    * **Decision:** Shelved in favor of more explicit registration methods and the new plugin specification enhancements planned for v0.6.3. This approach offers better control and predictability for users.

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
[v0.6.0]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.0
[v0.6.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.1
[v0.6.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.2
[v0.6.3]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.3
[v0.6.4]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.4
[v0.6.5]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.5

