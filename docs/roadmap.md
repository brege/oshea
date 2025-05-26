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

## [Version 0.6.1][v0.6.1]: Enhanced Plugin Configuration (Completed)
  * **Goal:** Streamline plugin configuration management.
  * **Key Features:**
    * Renamed `document_type_plugins` to `plugins` in main configuration files for plugin registration.
    * Implemented inline plugin overrides: Plugin settings can be overridden directly within XDG or Project main configuration files using top-level keys matching the plugin name. (Incorporates and enhances concepts from former v0.5.5 proposal).
    * Asset paths (e.g., `css_files`) in inline overrides are resolved relative to the main config file defining them.

## [Version 0.6.2][v0.6.2]: Output & Documentation Refinements (Proposed)
  * **Goal:** Improve default output behavior and update all documentation.
  * **Key Features:**
    * **Default Output Directory for `convert`:** Change the default output location for `md-to-pdf convert` (when no `--outdir` is specified) to a system temporary directory. Log the full path to the console.
    * **Comprehensive Documentation Update:** Update `README.md`, `docs/plugin-development.md`, `docs/cheat-sheet.md`, `config.example.yaml`, and this roadmap to reflect all changes from v0.6.1 and v0.6.2.

## Version 0.6.3: Enhanced Plugin Specification Methods (Future)
  * **Goal:** Provide more flexible ways to specify which plugin should be used for a given Markdown file.
  * **Key Features:**
    * **Front Matter Plugin Specification:**
        * Allow specifying the plugin directly in the Markdown file's front matter using a key (e.g., `md_to_pdf_plugin:`).
        * Support referencing a plugin by its registered name (e.g., `cv`).
        * Support referencing a plugin by the direct path to its plugin configuration file or directory.
    * **Local Project Config File (`<filename>.config.yaml`):**
        * If a Markdown file `mydoc.md` is being converted, automatically look for `mydoc.config.yaml` in the same directory.
        * This local config file could specify the plugin to use and/or provide direct overrides for that plugin for that specific document.
    * **Precedence:** These new methods will have a defined precedence relative to the `--plugin` CLI option and existing configuration layers. Typically, CLI would override front matter, and front matter might override a local project config file detection. This needs careful definition.

## Version 0.6.4: External & Community Plugin Integration (Future)
* **Goal:** Standardize and simplify the integration and management of plugins from external sources to foster a community ecosystem. (Formerly v0.7.0)
* **Key Features:**
  * **External Plugin Management:** Enhance support for integrating and managing plugins sourced from external locations. This could involve:
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
[v0.6.1]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.1
[v0.6.2]: https://github.com/brege/md-to-pdf/releases/tag/v0.6.2
